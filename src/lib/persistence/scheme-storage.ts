import type { PersistedScheme } from "@/types/schema";

const storageKey = "graphdb.schemes.v1";
const activeSchemeKey = "graphdb.activeSchemeId.v1";

function browserStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function loadPersistedSchemes(): PersistedScheme[] {
  const storage = browserStorage();
  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(storageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((scheme) => ({
      ...scheme,
      groups: scheme.groups ?? scheme.sections ?? []
    }));
  } catch {
    return [];
  }
}

export function savePersistedSchemes(schemes: PersistedScheme[]) {
  const storage = browserStorage();
  if (!storage) {
    return;
  }

  storage.setItem(storageKey, JSON.stringify(schemes));
}

export function getActiveSchemeId() {
  return browserStorage()?.getItem(activeSchemeKey) ?? null;
}

export function setActiveSchemeId(id: string) {
  browserStorage()?.setItem(activeSchemeKey, id);
}

export function removeActiveSchemeId() {
  browserStorage()?.removeItem(activeSchemeKey);
}
