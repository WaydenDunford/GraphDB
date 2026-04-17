"use client";

import { Database, KeyRound, Link2 } from "lucide-react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSchemaStore } from "@/lib/store/schema-store";
import type { SchemaFlowNode } from "@/components/schema/flow-types";
import type { SchemaColumn, SchemaElementRef } from "@/types/schema";

function isElementActive(
  element: SchemaElementRef | null,
  tableId: string,
  column?: SchemaColumn
) {
  if (!element) {
    return false;
  }

  if (element.kind === "table") {
    return element.id === tableId;
  }

  if (element.kind === "column" && column) {
    return element.id === column.id;
  }

  return false;
}

export function SchemaTableNode({ data }: NodeProps<SchemaFlowNode>) {
  const setHoveredElement = useSchemaStore((state) => state.setHoveredElement);
  const setSelectedElement = useSchemaStore(
    (state) => state.setSelectedElement
  );
  const table = data.table;
  const hoveredElement = data.hoveredElement;
  const selectedElement = data.selectedElement;
  const selectedTableIds = data.selectedTableIds;
  const searchQuery = String(data.searchQuery ?? "")
    .trim()
    .toLowerCase();
  const selected =
    (selectedElement?.kind === "table" && selectedElement.id === table.id) ||
    selectedTableIds.includes(table.id);
  const hovered = isElementActive(hoveredElement, table.id);
  const searchMatch =
    searchQuery.length > 0 &&
    (table.name.toLowerCase().includes(searchQuery) ||
      table.columns.some((column) =>
        column.name.toLowerCase().includes(searchQuery)
      ));

  return (
    <div
      className={cn(
        "group bg-card text-card-foreground w-[280px] overflow-hidden rounded-md border shadow-[0_18px_70px_rgba(0,0,0,0.38)] transition-all duration-200",
        selected || hovered
          ? "border-primary/80 shadow-[0_0_0_1px_rgba(52,211,153,0.42),0_22px_70px_rgba(0,0,0,0.48)]"
          : "border-border",
        selectedTableIds.length > 1 &&
          selectedTableIds.includes(table.id) &&
          "ring-primary/25 ring-2",
        searchQuery && !searchMatch && "opacity-35"
      )}
      onMouseEnter={() => setHoveredElement({ kind: "table", id: table.id })}
      onMouseLeave={() => setHoveredElement(null)}
      onClick={() => setSelectedElement({ kind: "table", id: table.id })}
    >
      <div className="border-border flex h-12 items-center justify-between border-b bg-white/[0.035] px-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="border-primary/25 bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-md border">
            <Database className="size-3.5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight">
              {table.name}
            </div>
            <div className="text-muted-foreground text-[10px] tracking-[0.18em] uppercase">
              {table.columns.length} fields
            </div>
          </div>
        </div>
        {selected || hovered ? <Badge>active</Badge> : null}
      </div>

      <div className="py-1">
        {table.columns.map((column) => {
          const columnHovered =
            hoveredElement?.kind === "column" &&
            hoveredElement.id === column.id;
          const columnSelected =
            selectedElement?.kind === "column" &&
            selectedElement.id === column.id;
          const columnSearchMatch =
            searchQuery.length > 0 &&
            column.name.toLowerCase().includes(searchQuery);

          return (
            <div
              key={column.id}
              className={cn(
                "relative grid h-8 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 text-xs transition-colors",
                columnHovered || columnSelected
                  ? "bg-accent/12 text-accent"
                  : columnSearchMatch
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-white/[0.035]"
              )}
              onMouseEnter={(event) => {
                event.stopPropagation();
                setHoveredElement({ kind: "column", id: column.id });
              }}
              onMouseLeave={(event) => {
                event.stopPropagation();
                setHoveredElement(null);
              }}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedElement({ kind: "column", id: column.id });
              }}
            >
              <Handle
                id={`${column.id}:target`}
                type="target"
                position={Position.Left}
                className="!border-border !bg-background !size-2 !border"
              />
              <Handle
                id={`${column.id}:source`}
                type="source"
                position={Position.Right}
                className="!border-border !bg-background !size-2 !border"
              />
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border",
                    column.isPrimaryKey
                      ? "border-amber-300/40 bg-amber-300/10 text-amber-200"
                      : column.isForeignKey
                        ? "border-accent/40 bg-accent/10 text-accent"
                        : "border-border bg-secondary text-muted-foreground"
                  )}
                >
                  {column.isPrimaryKey ? (
                    <KeyRound className="size-2.5" />
                  ) : column.isForeignKey ? (
                    <Link2 className="size-2.5" />
                  ) : (
                    <span className="size-1 rounded-full bg-current" />
                  )}
                </span>
                <span className="truncate font-medium">{column.name}</span>
              </div>
              <span className="text-muted-foreground max-w-24 truncate font-mono text-[10px]">
                {column.type}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
