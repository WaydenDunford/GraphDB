import { create } from "zustand";
import { mockAiProvider } from "@/lib/ai";
import { findElementForLine, parseSchema } from "@/lib/parser";
import {
  getActiveSchemeId,
  loadPersistedSchemes,
  savePersistedSchemes,
  setActiveSchemeId
} from "@/lib/persistence/scheme-storage";
import { samplePresets, starterDbml } from "@/lib/samples";
import type {
  CanvasBounds,
  CanvasPoint,
  ParseError,
  ParsedSchema,
  PersistedScheme,
  SaveStatus,
  SchemaElementRef,
  SchemaFormat,
  SchemaGroup,
  SchemaPreset
} from "@/types/schema";

interface SchemaStore {
  currentSchemeId: string;
  schemeName: string;
  savedSchemes: PersistedScheme[];
  saveStatus: SaveStatus;
  lastSavedAt: number | null;
  storageHydrated: boolean;
  code: string;
  format: SchemaFormat;
  schema: ParsedSchema;
  errors: ParseError[];
  hoveredElement: SchemaElementRef | null;
  selectedElement: SchemaElementRef | null;
  searchQuery: string;
  aiPrompt: string;
  isGenerating: boolean;
  history: string[];
  lastAiSummary: string | null;
  nodePositions: Record<string, CanvasPoint>;
  groups: SchemaGroup[];
  selectedTableIds: string[];
  clipboardTableIds: string[];
  initializePersistence: () => void;
  saveCurrentScheme: () => Promise<void>;
  createScheme: (name: string, starter?: SchemaPreset) => void;
  loadScheme: (schemeId: string) => void;
  deleteScheme: (schemeId: string) => void;
  renameSavedScheme: (schemeId: string, name: string) => void;
  setSchemeName: (name: string) => void;
  setCode: (code: string) => void;
  setFormat: (format: SchemaFormat) => void;
  loadPreset: (preset: SchemaPreset) => void;
  resetCode: () => void;
  updateNodePosition: (nodeId: string, position: CanvasPoint) => void;
  setSelectedTableIds: (tableIds: string[]) => void;
  addGroup: (
    title: string,
    tableIds: string[],
    bounds: CanvasBounds
  ) => SchemaGroup;
  updateGroupBounds: (groupId: string, bounds: CanvasBounds) => void;
  copySelectedTables: () => string[];
  cutSelectedTables: () => string[];
  clearSearch: () => void;
  setHoveredElement: (element: SchemaElementRef | null) => void;
  setHoveredFromLine: (lineNumber: number | null) => void;
  setSelectedElement: (element: SchemaElementRef | null) => void;
  setSearchQuery: (query: string) => void;
  setAiPrompt: (prompt: string) => void;
  generateFromPrompt: () => Promise<void>;
}

function parse(code: string, format: SchemaFormat) {
  return parseSchema(code, format);
}

function schemeId() {
  return `scheme:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function arraysEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function pointEqual(a: CanvasPoint | undefined, b: CanvasPoint) {
  return Boolean(a) && Math.abs(a!.x - b.x) < 0.5 && Math.abs(a!.y - b.y) < 0.5;
}

function boundsEqual(a: CanvasBounds, b: CanvasBounds) {
  return (
    Math.abs(a.x - b.x) < 0.5 &&
    Math.abs(a.y - b.y) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

function markDirty(state: SchemaStore): Partial<SchemaStore> {
  return state.saveStatus === "dirty" ? {} : { saveStatus: "dirty" };
}

function shouldResetDefaultLayout(schema: ParsedSchema) {
  return schema.relationships.length === 0 || schema.tables.length > 10;
}

function tableSignature(schema: ParsedSchema) {
  return schema.tables
    .map((table) => table.id)
    .sort()
    .join("|");
}

function filterNodePositions(
  positions: Record<string, CanvasPoint>,
  schema: ParsedSchema
) {
  const tableIds = new Set(schema.tables.map((table) => table.id));

  return Object.fromEntries(
    Object.entries(positions).filter(([tableId]) => tableIds.has(tableId))
  );
}

function toPersistedScheme(
  state: SchemaStore,
  updatedAt = Date.now()
): PersistedScheme {
  const existing = state.savedSchemes.find(
    (scheme) => scheme.id === state.currentSchemeId
  );

  return {
    id: state.currentSchemeId,
    name: state.schemeName.trim() || "Untitled scheme",
    code: state.code,
    format: state.format,
    nodePositions: state.nodePositions,
    groups: state.groups,
    createdAt: existing?.createdAt ?? updatedAt,
    updatedAt,
    tableCount: state.schema.tables.length,
    relationshipCount: state.schema.relationships.length
  };
}

function applyScheme(scheme: PersistedScheme) {
  const result = parse(scheme.code, scheme.format);

  return {
    currentSchemeId: scheme.id,
    schemeName: scheme.name,
    code: scheme.code,
    format: scheme.format,
    schema: result.schema,
    errors: result.errors,
    nodePositions: shouldResetDefaultLayout(result.schema)
      ? {}
      : filterNodePositions(scheme.nodePositions ?? {}, result.schema),
    groups: scheme.groups ?? [],
    hoveredElement: null,
    selectedElement: null,
    selectedTableIds: [],
    searchQuery: "",
    saveStatus: "saved" as SaveStatus,
    lastSavedAt: scheme.updatedAt
  };
}

const initialResult = parse(starterDbml, "dbml");
const initialSchemeId = "scheme:local-default";

export const useSchemaStore = create<SchemaStore>((set, get) => ({
  currentSchemeId: initialSchemeId,
  schemeName: "Untitled production schema",
  savedSchemes: [],
  saveStatus: "dirty",
  lastSavedAt: null,
  storageHydrated: false,
  code: starterDbml,
  format: "dbml",
  schema: initialResult.schema,
  errors: initialResult.errors,
  hoveredElement: null,
  selectedElement: null,
  searchQuery: "",
  aiPrompt: "",
  isGenerating: false,
  history: samplePresets.map((preset) => preset.name),
  lastAiSummary: null,
  nodePositions: {},
  groups: [],
  selectedTableIds: [],
  clipboardTableIds: [],
  initializePersistence: () => {
    if (get().storageHydrated) {
      return;
    }

    const savedSchemes = loadPersistedSchemes();
    const activeSchemeId = getActiveSchemeId();
    const activeScheme =
      savedSchemes.find((scheme) => scheme.id === activeSchemeId) ??
      savedSchemes[0];

    if (activeScheme) {
      set({
        ...applyScheme(activeScheme),
        savedSchemes,
        storageHydrated: true
      });
      return;
    }

    set({
      savedSchemes,
      storageHydrated: true,
      saveStatus: "dirty"
    });
  },
  saveCurrentScheme: async () => {
    set({ saveStatus: "saving" });

    try {
      const state = get();
      const persisted = toPersistedScheme(state);
      const savedSchemes = [
        persisted,
        ...state.savedSchemes.filter((scheme) => scheme.id !== persisted.id)
      ].sort((a, b) => b.updatedAt - a.updatedAt);

      savePersistedSchemes(savedSchemes);
      setActiveSchemeId(persisted.id);
      set({
        savedSchemes,
        saveStatus: "saved",
        lastSavedAt: persisted.updatedAt
      });
    } catch {
      set({ saveStatus: "error" });
    }
  },
  createScheme: (name, starter = samplePresets[0]) => {
    const nextId = schemeId();
    const result = parse(starter.code, starter.format);

    set({
      currentSchemeId: nextId,
      schemeName: name.trim() || "Untitled scheme",
      code: starter.code,
      format: starter.format,
      schema: result.schema,
      errors: result.errors,
      nodePositions: {},
      groups: [],
      hoveredElement: null,
      selectedElement: null,
      selectedTableIds: [],
      searchQuery: "",
      saveStatus: "dirty"
    });
    setActiveSchemeId(nextId);
  },
  loadScheme: (schemeIdToLoad) => {
    const scheme = get().savedSchemes.find(
      (item) => item.id === schemeIdToLoad
    );

    if (!scheme) {
      return;
    }

    set(applyScheme(scheme));
    setActiveSchemeId(scheme.id);
  },
  deleteScheme: (schemeIdToDelete) => {
    const savedSchemes = get().savedSchemes.filter(
      (scheme) => scheme.id !== schemeIdToDelete
    );
    savePersistedSchemes(savedSchemes);

    if (get().currentSchemeId === schemeIdToDelete) {
      const nextScheme = savedSchemes[0];
      if (nextScheme) {
        set({ ...applyScheme(nextScheme), savedSchemes });
        setActiveSchemeId(nextScheme.id);
      } else {
        const result = parse(starterDbml, "dbml");
        set({
          currentSchemeId: initialSchemeId,
          schemeName: "Untitled production schema",
          code: starterDbml,
          format: "dbml",
          schema: result.schema,
          errors: result.errors,
          nodePositions: {},
          groups: [],
          selectedTableIds: [],
          savedSchemes,
          saveStatus: "dirty"
        });
      }
      return;
    }

    set({ savedSchemes });
  },
  renameSavedScheme: (schemeIdToRename, name) => {
    const cleaned = name.trim();
    if (!cleaned) {
      return;
    }

    const savedSchemes = get().savedSchemes.map((scheme) =>
      scheme.id === schemeIdToRename
        ? { ...scheme, name: cleaned, updatedAt: Date.now() }
        : scheme
    );
    savePersistedSchemes(savedSchemes);
    set((state) => ({
      savedSchemes,
      ...(state.currentSchemeId === schemeIdToRename
        ? { schemeName: cleaned, saveStatus: "saved" as SaveStatus }
        : {})
    }));
  },
  setSchemeName: (schemeName) =>
    set((state) =>
      state.schemeName === schemeName
        ? {}
        : {
            schemeName,
            ...markDirty(state)
          }
    ),
  setCode: (code) => {
    const state = get();
    if (state.code === code) {
      return;
    }

    const result = parse(code, state.format);
    const tableSetChanged =
      tableSignature(state.schema) !== tableSignature(result.schema);
    set({
      code,
      schema: result.schema,
      errors: result.errors,
      nodePositions:
        tableSetChanged || shouldResetDefaultLayout(result.schema)
          ? {}
          : filterNodePositions(state.nodePositions, result.schema),
      selectedTableIds: state.selectedTableIds.filter((tableId) =>
        result.schema.tables.some((table) => table.id === tableId)
      ),
      groups: state.groups
        .map((group) => ({
          ...group,
          tableIds: group.tableIds.filter((tableId) =>
            result.schema.tables.some((table) => table.id === tableId)
          )
        }))
        .filter((group) => group.tableIds.length > 0),
      saveStatus: "dirty"
    });
  },
  setFormat: (format) => {
    const state = get();
    if (state.format === format) {
      return;
    }

    const result = parse(state.code, format);
    set({
      format,
      schema: result.schema,
      errors: result.errors,
      nodePositions: shouldResetDefaultLayout(result.schema)
        ? {}
        : filterNodePositions(state.nodePositions, result.schema),
      hoveredElement: null,
      selectedElement: null,
      selectedTableIds: [],
      saveStatus: "dirty"
    });
  },
  loadPreset: (preset) => {
    const result = parse(preset.code, preset.format);
    set((state) => ({
      code: preset.code,
      format: preset.format,
      schema: result.schema,
      errors: result.errors,
      hoveredElement: null,
      selectedElement: null,
      selectedTableIds: [],
      groups: [],
      nodePositions: {},
      saveStatus: "dirty",
      history: [
        preset.name,
        ...state.history.filter((item) => item !== preset.name)
      ].slice(0, 8)
    }));
  },
  resetCode: () => {
    const currentFormat = get().format;
    const preset =
      samplePresets.find((item) => item.format === currentFormat) ??
      samplePresets[0];
    get().loadPreset(preset);
  },
  updateNodePosition: (nodeId, position) =>
    set((state) =>
      pointEqual(state.nodePositions[nodeId], position)
        ? {}
        : {
            nodePositions: {
              ...state.nodePositions,
              [nodeId]: position
            },
            ...markDirty(state)
          }
    ),
  setSelectedTableIds: (selectedTableIds) =>
    set((state) =>
      arraysEqual(state.selectedTableIds, selectedTableIds)
        ? {}
        : { selectedTableIds }
    ),
  addGroup: (title, tableIds, bounds) => {
    const colors: SchemaGroup["color"][] = ["emerald", "cyan", "amber", "rose"];
    const group: SchemaGroup = {
      id: `group:${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      title,
      tableIds,
      bounds,
      color: colors[get().groups.length % colors.length]
    };

    set((state) => ({
      groups: [...state.groups, group],
      ...markDirty(state)
    }));
    return group;
  },
  updateGroupBounds: (groupId, bounds) =>
    set((state) => {
      const group = state.groups.find((item) => item.id === groupId);
      if (!group || boundsEqual(group.bounds, bounds)) {
        return {};
      }

      return {
        groups: state.groups.map((item) =>
          item.id === groupId ? { ...item, bounds } : item
        ),
        ...markDirty(state)
      };
    }),
  copySelectedTables: () => {
    const selectedTableIds = get().selectedTableIds;
    set({ clipboardTableIds: selectedTableIds });
    return selectedTableIds;
  },
  cutSelectedTables: () => {
    const selectedTableIds = get().selectedTableIds;
    set({ clipboardTableIds: selectedTableIds });
    return selectedTableIds;
  },
  clearSearch: () =>
    set({
      searchQuery: "",
      hoveredElement: null
    }),
  setHoveredElement: (element) =>
    set((state) =>
      state.hoveredElement?.id === element?.id &&
      state.hoveredElement?.kind === element?.kind
        ? {}
        : { hoveredElement: element }
    ),
  setHoveredFromLine: (lineNumber) => {
    if (!lineNumber) {
      get().setHoveredElement(null);
      return;
    }

    const element = findElementForLine(get().schema.sourceMap, lineNumber);
    get().setHoveredElement(element);
  },
  setSelectedElement: (element) =>
    set((state) =>
      state.selectedElement?.id === element?.id &&
      state.selectedElement?.kind === element?.kind
        ? {}
        : { selectedElement: element }
    ),
  setSearchQuery: (searchQuery) =>
    set((state) => (state.searchQuery === searchQuery ? {} : { searchQuery })),
  setAiPrompt: (aiPrompt) => set({ aiPrompt }),
  generateFromPrompt: async () => {
    const { aiPrompt, format, code } = get();
    if (!aiPrompt.trim()) {
      return;
    }

    set({ isGenerating: true, lastAiSummary: null });
    try {
      const response = await mockAiProvider.generateSchema({
        prompt: aiPrompt,
        format,
        currentCode: code
      });
      const result = parse(response.code, response.format);

      set((state) => ({
        code: response.code,
        format: response.format,
        schema: result.schema,
        errors: result.errors,
        aiPrompt: "",
        isGenerating: false,
        lastAiSummary: response.summary,
        selectedTableIds: [],
        groups: [],
        nodePositions: {},
        saveStatus: "dirty",
        history: [
          aiPrompt,
          ...state.history.filter((item) => item !== aiPrompt)
        ].slice(0, 8)
      }));
    } catch (error) {
      set({
        isGenerating: false,
        errors: [
          {
            message: "AI generation failed.",
            detail:
              error instanceof Error
                ? error.message
                : "Unknown generation error."
          }
        ]
      });
    }
  }
}));
