import type { Edge, Node } from "@xyflow/react";
import type {
  SchemaElementRef,
  SchemaGroup,
  SchemaRelationship,
  SchemaTable
} from "@/types/schema";

export interface SchemaNodeData extends Record<string, unknown> {
  table: SchemaTable;
  hoveredElement: SchemaElementRef | null;
  selectedElement: SchemaElementRef | null;
  searchQuery: string;
  selectedTableIds: string[];
}

export interface SchemaEdgeData extends Record<string, unknown> {
  relationship: SchemaRelationship;
  hoveredElement: SchemaElementRef | null;
  selectedElement: SchemaElementRef | null;
}

export interface SchemaGroupNodeData extends Record<string, unknown> {
  group: SchemaGroup;
}

export type SchemaFlowNode = Node<SchemaNodeData, "schemaTable">;
export type SchemaGroupFlowNode = Node<SchemaGroupNodeData, "schemaGroup">;
export type SchemaCanvasNode = SchemaFlowNode | SchemaGroupFlowNode;
export type SchemaFlowEdge = Edge<SchemaEdgeData, "schemaRelationship">;
