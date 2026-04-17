import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  AlertTriangle,
  Braces,
  Check,
  Cloud,
  DatabaseZap,
  Download,
  FileCode2,
  FileJson,
  FilePlus2,
  FolderOpen,
  Loader2,
  Maximize2,
  Minimize2,
  Moon,
  Pencil,
  Save,
  Sun,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { useGraphTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { exportSource, type ExportKind } from "@/lib/export/schema-export";
import { formatLabels, samplePresets } from "@/lib/samples";
import { useSchemaStore } from "@/lib/store/schema-store";
import type { SchemaFormat, SchemaPreset } from "@/types/schema";

const exportItems: Array<{
  kind: ExportKind;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { kind: "json", label: "Schema JSON", icon: FileJson },
  { kind: "code", label: "Source code", icon: FileCode2 },
  { kind: "png", label: "PNG image", icon: Download },
  { kind: "pdf", label: "PDF document", icon: Download }
];

function saveStatusCopy(status: string) {
  if (status === "saving") {
    return "saving";
  }
  if (status === "dirty") {
    return "unsaved changes";
  }
  if (status === "error") {
    return "save error";
  }
  return "saved";
}

export function TopNav() {
  const { theme, toggleTheme } = useGraphTheme();
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [newSchemeOpen, setNewSchemeOpen] = useState(false);
  const [loadSchemesOpen, setLoadSchemesOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [newSchemeName, setNewSchemeName] = useState("");
  const [newSchemePresetId, setNewSchemePresetId] = useState(
    samplePresets[0].id
  );
  const [schemeSearch, setSchemeSearch] = useState("");
  const code = useSchemaStore((state) => state.code);
  const format = useSchemaStore((state) => state.format);
  const schemeName = useSchemaStore((state) => state.schemeName);
  const schema = useSchemaStore((state) => state.schema);
  const groups = useSchemaStore((state) => state.groups);
  const nodePositions = useSchemaStore((state) => state.nodePositions);
  const saveStatus = useSchemaStore((state) => state.saveStatus);
  const lastSavedAt = useSchemaStore((state) => state.lastSavedAt);
  const savedSchemes = useSchemaStore((state) => state.savedSchemes);
  const setFormat = useSchemaStore((state) => state.setFormat);
  const setSchemeName = useSchemaStore((state) => state.setSchemeName);
  const createScheme = useSchemaStore((state) => state.createScheme);
  const loadScheme = useSchemaStore((state) => state.loadScheme);
  const deleteScheme = useSchemaStore((state) => state.deleteScheme);
  const saveCurrentScheme = useSchemaStore((state) => state.saveCurrentScheme);

  const filteredSchemes = useMemo(() => {
    const query = schemeSearch.trim().toLowerCase();
    if (!query) {
      return savedSchemes;
    }

    return savedSchemes.filter((scheme) =>
      scheme.name.toLowerCase().includes(query)
    );
  }, [savedSchemes, schemeSearch]);

  const commitName = () => {
    const cleaned = draftName.trim();
    setSchemeName(cleaned || "Untitled scheme");
    setIsEditingName(false);
  };

  const beginNameEdit = () => {
    setDraftName(schemeName);
    setIsEditingName(true);
  };

  useEffect(() => {
    const updateFullscreenState = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    updateFullscreenState();
    document.addEventListener("fullscreenchange", updateFullscreenState);
    return () =>
      document.removeEventListener("fullscreenchange", updateFullscreenState);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenEnabled) {
        toast.error("Fullscreen is not available in this browser.");
        return;
      }

      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not toggle fullscreen."
      );
    }
  };

  const handleExport = async (kind: ExportKind) => {
    if (kind === "png" || kind === "pdf") {
      window.dispatchEvent(
        new CustomEvent("graphdb:export-canvas", { detail: { kind } })
      );
      return;
    }

    const result = exportSource(kind, {
      schemeName,
      schema,
      code,
      format,
      nodePositions,
      groups
    });
    toast.success(result.message);
  };

  const handleCreateScheme = async () => {
    const cleaned = newSchemeName.trim();
    if (!cleaned) {
      toast.error("Scheme name is required.");
      return;
    }

    if (saveStatus === "dirty") {
      await saveCurrentScheme();
    }

    const preset =
      samplePresets.find((item) => item.id === newSchemePresetId) ??
      samplePresets[0];
    createScheme(cleaned, preset);
    setNewSchemeName("");
    setNewSchemeOpen(false);
    toast.success(`${cleaned} created.`);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <header className="border-border bg-background/92 text-foreground flex h-14 shrink-0 items-center justify-between border-b px-3 shadow-[0_1px_0_rgba(255,255,255,0.04)] backdrop-blur md:px-4 dark:bg-[#070707]/95 dark:text-[#f2f2ee]">
        <div className="flex min-w-0 items-center gap-3 md:gap-5">
          <div className="flex items-center gap-2">
            <div className="border-primary/30 bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md border shadow-[0_0_28px_rgba(52,211,153,0.24)]">
              <DatabaseZap className="size-4" />
            </div>
            <div className="hidden leading-tight sm:block">
              <div className="text-foreground text-sm font-semibold tracking-tight dark:text-white">
                GraphDB Studio
              </div>
              <div className="text-muted-foreground text-[10px] tracking-[0.18em] uppercase">
                Schema graph
              </div>
            </div>
          </div>

          <div className="bg-border hidden h-6 w-px md:block" />

          <div className="min-w-0">
            <div className="group flex h-6 w-[min(360px,34vw)] min-w-52 items-center gap-2">
              {isEditingName ? (
                <Input
                  autoFocus
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  onBlur={commitName}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      commitName();
                    }
                    if (event.key === "Escape") {
                      setIsEditingName(false);
                    }
                  }}
                  className="h-7 px-2 text-sm font-medium"
                />
              ) : (
                <button
                  className="text-foreground hover:text-primary min-w-0 truncate text-left text-sm font-medium transition-colors dark:text-white"
                  onClick={beginNameEdit}
                  title="Rename scheme"
                >
                  {schemeName}
                </button>
              )}
              {!isEditingName ? (
                <button
                  className="text-muted-foreground hover:text-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={beginNameEdit}
                  aria-label="Edit scheme name"
                >
                  <Pencil className="size-3.5" />
                </button>
              ) : null}
            </div>
            <div className="text-muted-foreground hidden text-xs md:block">
              {schema.tables.length} tables, {schema.relationships.length}{" "}
              relationships, {groups.length} groups
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden w-36 sm:block">
            <Select
              value={format}
              onValueChange={(value) => setFormat(value as SchemaFormat)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["dbml", "sql", "postgresql"] as SchemaFormat[]).map(
                  (item) => (
                    <SelectItem value={item} key={item}>
                      {formatLabels[item]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setNewSchemeOpen(true)}
                aria-label="New scheme"
              >
                <FilePlus2 className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New scheme</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLoadSchemesOpen(true)}
                aria-label="Load schemes"
              >
                <FolderOpen className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Load schemes</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void saveCurrentScheme()}
                aria-label="Cloud save"
                className={
                  saveStatus === "dirty"
                    ? "text-amber-300"
                    : saveStatus === "error"
                      ? "text-destructive"
                      : saveStatus === "saved"
                        ? "text-primary"
                        : undefined
                }
              >
                {saveStatus === "saving" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : saveStatus === "saved" ? (
                  <Cloud className="size-4" />
                ) : saveStatus === "error" ? (
                  <AlertTriangle className="size-4" />
                ) : (
                  <Save className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {saveStatusCopy(saveStatus)}
              {lastSavedAt && saveStatus === "saved"
                ? ` at ${new Date(lastSavedAt).toLocaleTimeString()}`
                : ""}
            </TooltipContent>
          </Tooltip>
          <span className="text-muted-foreground hidden w-24 truncate text-xs xl:inline">
            {saveStatusCopy(saveStatus)}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-9">
                <Download className="size-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {exportItems.map((item, index) => (
                <div key={item.kind}>
                  {index === 2 ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuItem
                    onClick={() => void handleExport(item.kind)}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </DropdownMenuItem>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                onClick={toggleTheme}
                aria-label={
                  theme === "dark"
                    ? "Switch to light theme"
                    : "Switch to dark theme"
                }
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:bg-[#121211] dark:text-white dark:hover:bg-[#1c1c1a]"
              >
                {theme === "dark" ? (
                  <Sun className="size-4" />
                ) : (
                  <Moon className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {theme === "dark"
                ? "Switch to light theme"
                : "Switch to dark theme"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => void toggleFullscreen()}
                aria-label={
                  isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
                }
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:bg-[#121211] dark:text-white dark:hover:bg-[#1c1c1a]"
              >
                {isFullscreen ? (
                  <Minimize2 className="size-4" />
                ) : (
                  <Maximize2 className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            </TooltipContent>
          </Tooltip>

          <div className="border-border bg-secondary text-muted-foreground hidden h-9 items-center gap-2 rounded-md border px-3 text-xs lg:flex">
            <Braces className="text-accent size-3.5" />
            Live parse
          </div>
        </div>
      </header>

      <Dialog open={newSchemeOpen} onOpenChange={setNewSchemeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New scheme</DialogTitle>
            <DialogDescription>
              Create a fresh workspace with a starter schema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
                Name
              </label>
              <Input
                value={newSchemeName}
                onChange={(event) => setNewSchemeName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void handleCreateScheme();
                  }
                }}
                placeholder="Billing graph"
              />
            </div>
            <div className="space-y-2">
              <label className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
                Starter template
              </label>
              <Select
                value={newSchemePresetId}
                onValueChange={setNewSchemePresetId}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {samplePresets.map((preset: SchemaPreset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewSchemeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateScheme()}>
              <Check className="size-4" />
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={loadSchemesOpen} onOpenChange={setLoadSchemesOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Load schemes</DialogTitle>
            <DialogDescription>
              Open a locally saved schema workspace.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={schemeSearch}
            onChange={(event) => setSchemeSearch(event.target.value)}
            placeholder="Search saved schemes"
          />
          <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
            {filteredSchemes.length === 0 ? (
              <div className="border-border text-muted-foreground rounded-md border p-6 text-center text-sm">
                No saved schemes found.
              </div>
            ) : (
              filteredSchemes.map((scheme) => (
                <div
                  key={scheme.id}
                  className="border-border bg-secondary/45 grid gap-3 rounded-md border p-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {scheme.name}
                    </div>
                    <div className="text-muted-foreground mt-1 text-xs">
                      Updated {new Date(scheme.updatedAt).toLocaleString()} ·{" "}
                      {scheme.tableCount} tables · {scheme.groups?.length ?? 0}{" "}
                      groups
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        if (saveStatus === "dirty") {
                          await saveCurrentScheme();
                        }
                        loadScheme(scheme.id);
                        setLoadSchemesOpen(false);
                      }}
                    >
                      Load
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        deleteScheme(scheme.id);
                        toast.success("Scheme deleted.");
                      }}
                      aria-label={`Delete ${scheme.name}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
