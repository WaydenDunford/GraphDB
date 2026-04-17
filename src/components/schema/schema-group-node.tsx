"use client";

import { Group } from "lucide-react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { useSchemaStore } from "@/lib/store/schema-store";
import type { SchemaGroupFlowNode } from "@/components/schema/flow-types";

const groupColorClasses = {
  emerald:
    "border-primary/35 bg-primary/[0.055] text-primary shadow-[0_0_42px_rgba(52,211,153,0.08)]",
  cyan: "border-accent/35 bg-accent/[0.055] text-accent shadow-[0_0_42px_rgba(34,211,238,0.08)]",
  amber:
    "border-amber-300/35 bg-amber-300/[0.055] text-amber-200 shadow-[0_0_42px_rgba(252,211,77,0.08)]",
  rose: "border-rose-300/35 bg-rose-300/[0.055] text-rose-200 shadow-[0_0_42px_rgba(253,164,175,0.08)]"
};

export function SchemaGroupNode({
  id,
  data,
  selected
}: NodeProps<SchemaGroupFlowNode>) {
  const updateGroupBounds = useSchemaStore((state) => state.updateGroupBounds);
  const group = data.group;

  return (
    <div
      className={cn(
        "pointer-events-auto h-full min-h-28 w-full min-w-48 rounded-md border border-dashed backdrop-blur-[1px] transition-all",
        groupColorClasses[group.color],
        selected && "ring-primary/35 ring-2"
      )}
    >
      <NodeResizer
        nodeId={id}
        isVisible={Boolean(selected)}
        minWidth={190}
        minHeight={120}
        color="#34d399"
        lineClassName="!border-primary"
        handleClassName="!border-primary !bg-background"
        onResizeEnd={(_, params) => {
          updateGroupBounds(group.id, {
            x: params.x,
            y: params.y,
            width: params.width,
            height: params.height
          });
        }}
      />
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold tracking-[0.18em] uppercase">
        <Group className="size-3.5" />
        <span>{group.title}</span>
      </div>
      <div className="absolute right-3 bottom-2 text-[10px] font-medium tracking-[0.16em] uppercase opacity-55">
        {group.tableIds.length} tables
      </div>
    </div>
  );
}
