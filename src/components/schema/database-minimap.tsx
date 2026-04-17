"use client";

import { useMemo, useRef } from "react";
import { useReactFlow, useStore, useViewport } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { SchemaCanvasNode } from "@/components/schema/flow-types";

const mapWidth = 228;
const mapHeight = 152;
const mapPadding = 12;

interface DatabaseMinimapProps {
  nodes: SchemaCanvasNode[];
}

function getNodeSize(node: SchemaCanvasNode) {
  return {
    width: Number(node.width ?? 280),
    height: Number(node.height ?? 160)
  };
}

function getBounds(nodes: SchemaCanvasNode[]) {
  if (nodes.length === 0) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  const rects = nodes.map((node) => {
    const size = getNodeSize(node);
    return {
      x: node.position.x,
      y: node.position.y,
      right: node.position.x + size.width,
      bottom: node.position.y + size.height
    };
  });
  const minX = Math.min(...rects.map((rect) => rect.x)) - 120;
  const minY = Math.min(...rects.map((rect) => rect.y)) - 120;
  const maxX = Math.max(...rects.map((rect) => rect.right)) + 120;
  const maxY = Math.max(...rects.map((rect) => rect.bottom)) + 120;

  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1)
  };
}

export function DatabaseMinimap({ nodes }: DatabaseMinimapProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { setCenter } = useReactFlow();
  const viewport = useViewport();
  const dimensions = useStore((state) => ({
    width: state.width,
    height: state.height
  }));
  const tableNodes = useMemo(
    () => nodes.filter((node) => node.type === "schemaTable"),
    [nodes]
  );
  const groupNodes = useMemo(
    () => nodes.filter((node) => node.type === "schemaGroup"),
    [nodes]
  );
  const bounds = useMemo(() => getBounds(nodes), [nodes]);
  const scale = Math.min(
    (mapWidth - mapPadding * 2) / bounds.width,
    (mapHeight - mapPadding * 2) / bounds.height
  );
  const contentWidth = bounds.width * scale;
  const contentHeight = bounds.height * scale;
  const offsetX = (mapWidth - contentWidth) / 2;
  const offsetY = (mapHeight - contentHeight) / 2;

  const project = (x: number, y: number) => ({
    x: offsetX + (x - bounds.x) * scale,
    y: offsetY + (y - bounds.y) * scale
  });

  const viewportRect = {
    x: -viewport.x / viewport.zoom,
    y: -viewport.y / viewport.zoom,
    width: dimensions.width / viewport.zoom,
    height: dimensions.height / viewport.zoom
  };
  const viewportPoint = project(viewportRect.x, viewportRect.y);
  const viewportSize = {
    width: viewportRect.width * scale,
    height: viewportRect.height * scale
  };

  const moveViewport = (clientX: number, clientY: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const flowX = bounds.x + (localX - offsetX) / scale;
    const flowY = bounds.y + (localY - offsetY) / scale;

    setCenter(flowX, flowY, {
      zoom: viewport.zoom,
      duration: 0
    });
  };

  return (
    <div
      ref={ref}
      className="border-border bg-card/85 absolute bottom-4 left-4 z-20 overflow-hidden rounded-md border shadow-2xl backdrop-blur"
      style={{ width: mapWidth, height: mapHeight }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        moveViewport(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (event.buttons === 1) {
          moveViewport(event.clientX, event.clientY);
        }
      }}
      aria-label="Schema minimap"
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[length:18px_18px]" />
      {groupNodes.map((node) => {
        const size = getNodeSize(node);
        const point = project(node.position.x, node.position.y);
        return (
          <div
            key={node.id}
            className="border-primary/20 bg-primary/8 absolute rounded border"
            style={{
              left: point.x,
              top: point.y,
              width: size.width * scale,
              height: size.height * scale
            }}
          />
        );
      })}
      {tableNodes.map((node) => {
        const size = getNodeSize(node);
        const point = project(node.position.x, node.position.y);
        const selected = Boolean(node.selected);
        return (
          <div
            key={node.id}
            className={cn(
              "absolute rounded-[2px] border transition-colors",
              selected
                ? "border-primary bg-primary/55 shadow-[0_0_10px_rgba(52,211,153,0.45)]"
                : "border-white/15 bg-white/18"
            )}
            style={{
              left: point.x,
              top: point.y,
              width: Math.max(size.width * scale, 3),
              height: Math.max(size.height * scale, 3)
            }}
          />
        );
      })}
      <div
        className="absolute rounded border border-white/65 bg-white/10 shadow-[0_0_18px_rgba(255,255,255,0.18)]"
        style={{
          left: viewportPoint.x,
          top: viewportPoint.y,
          width: Math.max(viewportSize.width, 18),
          height: Math.max(viewportSize.height, 18)
        }}
      />
      <div className="text-muted-foreground pointer-events-none absolute right-2 bottom-2 text-[9px] font-semibold tracking-[0.18em] uppercase">
        minimap
      </div>
    </div>
  );
}
