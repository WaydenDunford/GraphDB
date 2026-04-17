"use client";

import { useEffect } from "react";
import { useSchemaStore } from "@/lib/store/schema-store";

export function SchemePersistenceController() {
  const storageHydrated = useSchemaStore((state) => state.storageHydrated);
  const saveStatus = useSchemaStore((state) => state.saveStatus);
  const code = useSchemaStore((state) => state.code);
  const format = useSchemaStore((state) => state.format);
  const schemeName = useSchemaStore((state) => state.schemeName);
  const nodePositions = useSchemaStore((state) => state.nodePositions);
  const groups = useSchemaStore((state) => state.groups);
  const initializePersistence = useSchemaStore(
    (state) => state.initializePersistence
  );
  const saveCurrentScheme = useSchemaStore((state) => state.saveCurrentScheme);

  useEffect(() => {
    initializePersistence();
  }, [initializePersistence]);

  useEffect(() => {
    if (!storageHydrated || saveStatus !== "dirty") {
      return;
    }

    const timeout = window.setTimeout(() => {
      void saveCurrentScheme();
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [
    code,
    format,
    groups,
    nodePositions,
    saveCurrentScheme,
    saveStatus,
    schemeName,
    storageHydrated
  ]);

  return null;
}
