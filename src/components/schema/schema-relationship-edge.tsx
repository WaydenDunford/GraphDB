"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps
} from "@xyflow/react";
import { cn } from "@/lib/utils";
import { useSchemaStore } from "@/lib/store/schema-store";
import type { SchemaFlowEdge } from "@/components/schema/flow-types";

export function SchemaRelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data
}: EdgeProps<SchemaFlowEdge>) {
  const setHoveredElement = useSchemaStore((state) => state.setHoveredElement);
  const setSelectedElement = useSchemaStore(
    (state) => state.setSelectedElement
  );
  const relationship = data?.relationship;
  const hoveredElement = data?.hoveredElement;
  const selectedElement = data?.selectedElement;
  const active =
    hoveredElement?.id === relationship?.id ||
    selectedElement?.id === relationship?.id ||
    hoveredElement?.id === relationship?.from.columnId ||
    hoveredElement?.id === relationship?.to.columnId ||
    selectedElement?.id === relationship?.from.columnId ||
    selectedElement?.id === relationship?.to.columnId;
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.32
  });

  if (!relationship) {
    return null;
  }

  return (
    <>
      <BaseEdge
        id={`${id}-hit`}
        path={edgePath}
        interactionWidth={20}
        className="stroke-transparent"
      />
      <BaseEdge
        id={id}
        path={edgePath}
        className={cn(
          "transition-all duration-200",
          active ? "stroke-primary" : "stroke-[#5a5a52]/70"
        )}
        style={{
          strokeWidth: active ? 2.4 : 1.4,
          filter: active
            ? "drop-shadow(0 0 7px rgba(52,211,153,0.6))"
            : undefined
        }}
      />
      <EdgeLabelRenderer>
        <button
          className={cn(
            "nodrag nopan text-muted-foreground pointer-events-auto absolute rounded border px-2 py-1 font-mono text-[10px] shadow-lg transition-all",
            active
              ? "border-primary/60 bg-primary/10 text-primary"
              : "border-border bg-card/90 hover:border-border-strong hover:text-foreground"
          )}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`
          }}
          onMouseEnter={() =>
            setHoveredElement({ kind: "relationship", id: relationship.id })
          }
          onMouseLeave={() => setHoveredElement(null)}
          onClick={() =>
            setSelectedElement({ kind: "relationship", id: relationship.id })
          }
        >
          FK
        </button>
      </EdgeLabelRenderer>
    </>
  );
}
