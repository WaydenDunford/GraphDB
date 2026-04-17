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

export function tableNodeHeight(columnCount: number) {
  return headerHeight + nodePadding + columnCount * rowHeight;
}

export function tableNodeWidth() {
  return nodeWidth;
}

export function buildFlowElements(
  schema: ParsedSchema,
  positions: Record<string, CanvasPoint> = {},
  groups: SchemaGroup[] = []
): {
  nodes: SchemaCanvasNode[];
  edges: SchemaFlowEdge[];
} {
  const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

  graph.setGraph({
    rankdir: "LR",
    nodesep: 56,
    ranksep: 116,
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

  const tableNodes: SchemaCanvasNode[] = schema.tables.map((table) => {
    const node = graph.node(table.id);
    const height = tableNodeHeight(table.columns.length);
    const fallbackPosition = {
      x: (node?.x ?? 0) - nodeWidth / 2,
      y: (node?.y ?? 0) - height / 2
    };

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

  return { nodes: [...groupNodes, ...tableNodes], edges };
}
