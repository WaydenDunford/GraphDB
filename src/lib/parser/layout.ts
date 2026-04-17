import dagre from "@dagrejs/dagre";
import type { CanvasPoint, ParsedSchema, SchemaGroup } from "@/types/schema";
import type {
  SchemaCanvasNode,
  SchemaFlowEdge
} from "@/components/schema/flow-types";

const nodeWidth = 280;
const rowHeight = 32;
const headerHeight = 48;
const nodePadding = 12;
const maxGridColumns = 5;
const gridColumnGap = 136;
const gridRowGap = 128;
const collisionPadding = 48;

export function tableNodeHeight(columnCount: number) {
  return headerHeight + nodePadding + columnCount * rowHeight;
}

export function tableNodeWidth() {
  return nodeWidth;
}

function shouldUseGridLayout(schema: ParsedSchema) {
  return schema.relationships.length === 0 || schema.tables.length > 10;
}

function buildGridPositions(schema: ParsedSchema) {
  const positions: Record<string, CanvasPoint> = {};
  const rowHeights: number[] = [];

  schema.tables.forEach((table, index) => {
    const row = Math.floor(index / maxGridColumns);
    rowHeights[row] = Math.max(
      rowHeights[row] ?? 0,
      tableNodeHeight(table.columns.length)
    );
  });

  const rowOffsets = rowHeights.reduce<number[]>((offsets, height, index) => {
    offsets[index] =
      index === 0
        ? 0
        : offsets[index - 1]! + rowHeights[index - 1]! + gridRowGap;
    return offsets;
  }, []);

  schema.tables.forEach((table, index) => {
    const column = index % maxGridColumns;
    const row = Math.floor(index / maxGridColumns);

    positions[table.id] = {
      x: column * (nodeWidth + gridColumnGap),
      y: rowOffsets[row] ?? 0
    };
  });

  return positions;
}

function buildDagrePositions(schema: ParsedSchema) {
  const positions: Record<string, CanvasPoint> = {};
  const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

  graph.setGraph({
    rankdir: "LR",
    nodesep: 72,
    ranksep: 136,
    marginx: 52,
    marginy: 52
  });

  for (const table of schema.tables) {
    graph.setNode(table.id, {
      width: nodeWidth,
      height: tableNodeHeight(table.columns.length)
    });
  }

  for (const relationship of schema.relationships) {
    graph.setEdge(relationship.from.tableId, relationship.to.tableId);
  }

  dagre.layout(graph);

  for (const table of schema.tables) {
    const node = graph.node(table.id);
    const height = tableNodeHeight(table.columns.length);

    positions[table.id] = {
      x: (node?.x ?? 0) - nodeWidth / 2,
      y: (node?.y ?? 0) - height / 2
    };
  }

  return positions;
}

function nodeBottom(node: SchemaCanvasNode) {
  return node.position.y + Number(node.height ?? 0);
}

function nodesOverlap(a: SchemaCanvasNode, b: SchemaCanvasNode) {
  const aWidth = Number(a.width ?? nodeWidth);
  const bWidth = Number(b.width ?? nodeWidth);
  const aHeight = Number(a.height ?? 0);
  const bHeight = Number(b.height ?? 0);

  return !(
    a.position.x + aWidth + collisionPadding <= b.position.x ||
    b.position.x + bWidth + collisionPadding <= a.position.x ||
    a.position.y + aHeight + collisionPadding <= b.position.y ||
    b.position.y + bHeight + collisionPadding <= a.position.y
  );
}

function preventTableOverlaps(tableNodes: SchemaCanvasNode[]) {
  const placed: SchemaCanvasNode[] = [];
  const adjusted = [...tableNodes]
    .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
    .map((node) => ({
      ...node,
      position: { ...node.position }
    }));

  for (const node of adjusted) {
    let guard = 0;
    let overlap = placed.find((placedNode) => nodesOverlap(node, placedNode));

    while (overlap && guard < placed.length + 1) {
      node.position.y = nodeBottom(overlap) + gridRowGap;
      overlap = placed.find((placedNode) => nodesOverlap(node, placedNode));
      guard += 1;
    }

    placed.push(node);
  }

  const byId = new Map(adjusted.map((node) => [node.id, node]));
  return tableNodes.map((node) => byId.get(node.id) ?? node);
}

export function buildFlowElements(
  schema: ParsedSchema,
  positions: Record<string, CanvasPoint> = {},
  groups: SchemaGroup[] = []
): {
  nodes: SchemaCanvasNode[];
  edges: SchemaFlowEdge[];
} {
  const defaultPositions = shouldUseGridLayout(schema)
    ? buildGridPositions(schema)
    : buildDagrePositions(schema);

  const tableNodes: SchemaCanvasNode[] = schema.tables.map((table) => {
    const height = tableNodeHeight(table.columns.length);
    const fallbackPosition = defaultPositions[table.id] ?? { x: 0, y: 0 };

    return {
      id: table.id,
      type: "schemaTable",
      position: positions[table.id] ?? fallbackPosition,
      data: {
        table,
        hoveredElement: null,
        selectedElement: null,
        searchQuery: "",
        selectedTableIds: []
      },
      width: nodeWidth,
      height,
      zIndex: 10
    };
  });
  const resolvedTableNodes = preventTableOverlaps(tableNodes);

  const groupNodes: SchemaCanvasNode[] = groups.map((group) => ({
    id: group.id,
    type: "schemaGroup",
    position: {
      x: group.bounds.x,
      y: group.bounds.y
    },
    data: {
      group
    },
    width: group.bounds.width,
    height: group.bounds.height,
    style: {
      width: group.bounds.width,
      height: group.bounds.height
    },
    zIndex: 0,
    selectable: true
  }));

  const edges: SchemaFlowEdge[] = schema.relationships.map((relationship) => ({
    id: relationship.id,
    type: "schemaRelationship",
    source: relationship.from.tableId,
    target: relationship.to.tableId,
    sourceHandle: `${relationship.from.columnId}:source`,
    targetHandle: `${relationship.to.columnId}:target`,
    data: {
      relationship,
      hoveredElement: null,
      selectedElement: null
    }
  }));

  return { nodes: [...groupNodes, ...resolvedTableNodes], edges };
}
