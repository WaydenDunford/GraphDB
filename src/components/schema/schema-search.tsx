import { useMemo, useState, type KeyboardEvent } from "react";
import { Focus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  ParsedSchema,
  SchemaColumn,
  SchemaGroup,
  SchemaTable
} from "@/types/schema";

export type SchemaSearchSuggestion =
  | {
      id: string;
      kind: "table";
      table: SchemaTable;
    }
  | {
      id: string;
      kind: "key" | "field";
      table: SchemaTable;
      column: SchemaColumn;
    }
  | {
      id: string;
      kind: "group";
      group: SchemaGroup;
    };

interface SchemaSearchProps {
  query: string;
  schema: ParsedSchema;
  groups: SchemaGroup[];
  onQueryChange: (query: string) => void;
  onClear: () => void;
  onSelect: (suggestion: SchemaSearchSuggestion) => void;
  onHover: (suggestion: SchemaSearchSuggestion | null) => void;
  onFitSearch: () => void;
}

function suggestionScore(query: string, value: string) {
  const lowerValue = value.toLowerCase();
  if (lowerValue === query) {
    return 0;
  }
  if (lowerValue.startsWith(query)) {
    return 1;
  }
  return lowerValue.includes(query) ? 2 : 99;
}

export function buildSchemaSearchSuggestions(
  schema: ParsedSchema,
  groups: SchemaGroup[],
  query: string,
  limit = 14
): SchemaSearchSuggestion[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  const tableSuggestions = schema.tables
    .filter((table) => table.name.toLowerCase().includes(normalized))
    .map((table) => ({
      id: `suggestion:${table.id}`,
      kind: "table" as const,
      table,
      score: suggestionScore(normalized, table.name)
    }));

  const groupSuggestions = groups
    .filter((group) => group.title.toLowerCase().includes(normalized))
    .map((group) => ({
      id: `suggestion:${group.id}`,
      kind: "group" as const,
      group,
      score: suggestionScore(normalized, group.title)
    }));

  const columnSuggestions = schema.tables.flatMap((table) =>
    table.columns
      .filter((column) => column.name.toLowerCase().includes(normalized))
      .map((column) => ({
        id: `suggestion:${column.id}`,
        kind:
          column.isPrimaryKey || column.isForeignKey
            ? ("key" as const)
            : ("field" as const),
        table,
        column,
        score:
          suggestionScore(normalized, column.name) +
          (column.isPrimaryKey || column.isForeignKey ? 0 : 1)
      }))
  );

  return [...tableSuggestions, ...groupSuggestions, ...columnSuggestions]
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((suggestion) => {
      if (suggestion.kind === "table") {
        return {
          id: suggestion.id,
          kind: suggestion.kind,
          table: suggestion.table
        };
      }

      if (suggestion.kind === "group") {
        return {
          id: suggestion.id,
          kind: suggestion.kind,
          group: suggestion.group
        };
      }

      return {
        id: suggestion.id,
        kind: suggestion.kind,
        table: suggestion.table,
        column: suggestion.column
      };
    });
}

const badgeStyles = {
  table:
    "border-primary/40 bg-primary/15 text-primary shadow-[0_0_16px_rgba(52,211,153,0.25)]",
  key: "border-accent/40 bg-accent/15 text-accent shadow-[0_0_16px_rgba(34,211,238,0.25)]",
  group:
    "border-amber-300/40 bg-amber-300/15 text-amber-200 shadow-[0_0_16px_rgba(252,211,77,0.22)]",
  field:
    "border-rose-300/40 bg-rose-300/15 text-rose-200 shadow-[0_0_16px_rgba(253,164,175,0.22)]"
};

const badgeLabels = {
  table: "T",
  key: "K",
  group: "G",
  field: "F"
};

function SuggestionBadge({ kind }: { kind: SchemaSearchSuggestion["kind"] }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border px-1.5 font-mono text-[11px] font-black shadow-lg",
        badgeStyles[kind]
      )}
      title={
        kind === "table"
          ? "Table"
          : kind === "key"
            ? "Key"
            : kind === "group"
              ? "Group"
              : "Field"
      }
    >
      {badgeLabels[kind]}
    </span>
  );
}

function suggestionPrimary(suggestion: SchemaSearchSuggestion) {
  if (suggestion.kind === "table") {
    return suggestion.table.name;
  }
  if (suggestion.kind === "group") {
    return suggestion.group.title;
  }
  return suggestion.column.name;
}

function suggestionMeta(suggestion: SchemaSearchSuggestion) {
  if (suggestion.kind === "table") {
    return `${suggestion.table.columns.length} fields`;
  }
  if (suggestion.kind === "group") {
    return `${suggestion.group.tableIds.length} tables`;
  }
  return suggestion.table.name;
}

export function SchemaSearch({
  query,
  schema,
  groups,
  onQueryChange,
  onClear,
  onSelect,
  onHover,
  onFitSearch
}: SchemaSearchProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const suggestions = useMemo(
    () => buildSchemaSearchSuggestions(schema, groups, query),
    [groups, query, schema]
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) =>
        suggestions.length ? (index + 1) % suggestions.length : 0
      );
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        suggestions.length
          ? (index - 1 + suggestions.length) % suggestions.length
          : 0
      );
    }

    if (event.key === "Enter" && suggestions[activeIndex]) {
      event.preventDefault();
      onSelect(suggestions[activeIndex]);
    }

    if (event.key === "Escape") {
      onClear();
    }
  };

  return (
    <div className="border-border bg-card/90 rounded-md border p-3 shadow-2xl backdrop-blur">
      <div className="flex items-center gap-2">
        <Search className="text-muted-foreground size-4" />
        <Input
          value={query}
          onChange={(event) => {
            setActiveIndex(0);
            onQueryChange(event.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Find tables, keys, groups, or fields"
          className="h-8 border-0 bg-transparent px-0 shadow-none focus:ring-0"
        />
        {query ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => {
              setActiveIndex(0);
              onClear();
            }}
            aria-label="Clear search"
          >
            <X className="size-4" />
          </Button>
        ) : null}
        <Button type="button" variant="ghost" size="sm" onClick={onFitSearch}>
          <Focus className="size-4" />
          Fit
        </Button>
      </div>

      {suggestions.length > 0 ? (
        <div
          className="border-border/70 mt-3 max-h-72 overflow-hidden rounded-md border bg-black/25 p-1"
          role="listbox"
        >
          {suggestions.map((suggestion, index) => {
            const active = index === activeIndex;

            return (
              <button
                key={suggestion.id}
                role="option"
                aria-selected={active}
                className={cn(
                  "grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded px-2.5 py-2.5 text-left transition-all",
                  active
                    ? "border-border-strong text-foreground bg-white/[0.075] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.045]"
                )}
                onMouseEnter={() => {
                  setActiveIndex(index);
                  onHover(suggestion);
                }}
                onMouseLeave={() => onHover(null)}
                onClick={() => onSelect(suggestion)}
              >
                <span className="truncate text-sm font-medium">
                  {suggestionPrimary(suggestion)}
                </span>
                <SuggestionBadge kind={suggestion.kind} />
                <span
                  className={cn(
                    "justify-self-end text-[11px] font-semibold tracking-[0.16em] uppercase",
                    suggestion.kind === "table"
                      ? "text-primary/85"
                      : suggestion.kind === "key"
                        ? "text-accent/85"
                        : suggestion.kind === "group"
                          ? "text-amber-200/85"
                          : "text-rose-200/85"
                  )}
                >
                  {suggestionMeta(suggestion)}
                </span>
              </button>
            );
          })}
        </div>
      ) : query.trim() ? (
        <div className="text-muted-foreground border-border/70 mt-3 rounded-md border bg-black/20 px-3 py-3 text-xs">
          No schema symbols matched.
        </div>
      ) : null}
    </div>
  );
}
