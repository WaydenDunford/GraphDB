import { useRef, useState } from "react";
import {
  AlertTriangle,
  FileInput,
  History,
  Play,
  RotateCcw,
  Sparkles,
  Wand2
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { SchemaEditor } from "@/components/editor/schema-editor";
import { formatLabels, samplePresets } from "@/lib/samples";
import { useSchemaStore } from "@/lib/store/schema-store";
import type { SchemaFormat } from "@/types/schema";

const prompts = [
  "Create users, orders, products, categories, payments and foreign keys",
  "Build a SaaS workspace schema with teams, members, users and audit events",
  "Create a blog schema with users, posts and comments"
];

export function LeftWorkspacePanel() {
  const [tab, setTab] = useState("code");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const code = useSchemaStore((state) => state.code);
  const format = useSchemaStore((state) => state.format);
  const schema = useSchemaStore((state) => state.schema);
  const errors = useSchemaStore((state) => state.errors);
  const aiPrompt = useSchemaStore((state) => state.aiPrompt);
  const history = useSchemaStore((state) => state.history);
  const isGenerating = useSchemaStore((state) => state.isGenerating);
  const lastAiSummary = useSchemaStore((state) => state.lastAiSummary);
  const setCode = useSchemaStore((state) => state.setCode);
  const setFormat = useSchemaStore((state) => state.setFormat);
  const loadPreset = useSchemaStore((state) => state.loadPreset);
  const resetCode = useSchemaStore((state) => state.resetCode);
  const setAiPrompt = useSchemaStore((state) => state.setAiPrompt);
  const generateFromPrompt = useSchemaStore(
    (state) => state.generateFromPrompt
  );

  const handleGenerate = () => {
    setCode(code);
    if (errors.length > 0) {
      toast.error(errors[0]?.message ?? "Schema has parser errors.");
      return;
    }
    toast.success(
      `Rendered ${schema.tables.length} tables and ${schema.relationships.length} relationships.`
    );
  };

  const handleAiGenerate = async () => {
    await generateFromPrompt();
    const state = useSchemaStore.getState();
    if (state.errors.length > 0) {
      toast.error(state.errors[0]?.message ?? "AI output could not be parsed.");
      return;
    }
    toast.success(state.lastAiSummary ?? "Schema generated.");
    setTab("code");
  };

  const importFile = async (file: File) => {
    const text = await file.text();
    setCode(text);
    toast.success(`Imported ${file.name}.`);
  };

  return (
    <aside className="border-border flex h-full min-h-0 flex-col border-r bg-[#0d0d0c]">
      <Tabs
        value={tab}
        onValueChange={setTab}
        className="flex h-full min-h-0 flex-col"
      >
        <div className="border-border flex items-center justify-between border-b px-3 py-2">
          <TabsList className="h-8">
            <TabsTrigger value="code">Code</TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles className="mr-1.5 size-3.5" />
              AI
            </TabsTrigger>
          </TabsList>
          <Badge variant={errors.length ? "danger" : "secondary"}>
            {errors.length ? "needs fix" : "live"}
          </Badge>
        </div>

        <TabsContent value="code" className="m-0 flex min-h-0 flex-1 flex-col">
          <div className="border-border flex flex-wrap items-center gap-2 border-b bg-black/20 px-3 py-2">
            {(["dbml", "sql", "postgresql"] as SchemaFormat[]).map((item) => (
              <button
                key={item}
                className={`rounded px-2.5 py-1 text-[11px] font-semibold tracking-[0.15em] uppercase transition-colors ${
                  format === item
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
                }`}
                onClick={() => setFormat(item)}
              >
                {formatLabels[item]}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1">
            <SchemaEditor />
          </div>

          <div className="border-border space-y-3 border-t bg-[#10100f] p-3">
            {errors.length > 0 ? (
              <div className="border-destructive/25 bg-destructive/10 text-destructive rounded-md border p-2 text-xs">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  <span>
                    {errors.length} validation issue
                    {errors.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="max-h-24 space-y-1 overflow-auto pr-1">
                  {errors.slice(0, 4).map((error, index) => (
                    <div
                      key={`${error.code ?? "schema-error"}-${error.line ?? index}-${index}`}
                      className="text-destructive/90"
                    >
                      {error.line ? (
                        <span className="font-mono opacity-70">
                          L{error.line}:{" "}
                        </span>
                      ) : null}
                      {error.message}
                    </div>
                  ))}
                  {errors.length > 4 ? (
                    <div className="text-destructive/65">
                      +{errors.length - 4} more in the editor
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleGenerate} size="sm">
                <Play className="size-4" />
                Generate Schema
              </Button>
              <Button
                onClick={() => setTab("ai")}
                variant="secondary"
                size="sm"
              >
                <Wand2 className="size-4" />
                Ask AI
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
              >
                <FileInput className="size-4" />
                Import code
              </Button>
              <Button variant="outline" size="sm" onClick={resetCode}>
                <RotateCcw className="size-4" />
                Reset
              </Button>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept=".sql,.dbml,.txt"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void importFile(file);
                }
                event.currentTarget.value = "";
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="ai" className="m-0 flex min-h-0 flex-1 flex-col">
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-5 p-4">
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold">AI schema prompt</h2>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Local mock provider, ready for LLM wiring.
                    </p>
                  </div>
                  <Badge>{formatLabels[format]}</Badge>
                </div>
                <Textarea
                  value={aiPrompt}
                  onChange={(event) => setAiPrompt(event.target.value)}
                  placeholder="create users and orders tables with foreign keys"
                  className="min-h-32 resize-none"
                />
                <Button
                  className="mt-3 w-full"
                  onClick={handleAiGenerate}
                  disabled={isGenerating || !aiPrompt.trim()}
                >
                  <Sparkles className="size-4" />
                  {isGenerating ? "Generating..." : "Generate Schema"}
                </Button>
                {lastAiSummary ? (
                  <p className="text-primary mt-2 text-xs">{lastAiSummary}</p>
                ) : null}
              </section>

              <section>
                <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.16em] uppercase">
                  Quick prompts
                </h3>
                <div className="space-y-2">
                  {prompts.map((prompt) => (
                    <button
                      key={prompt}
                      className="border-border bg-secondary/45 text-muted-foreground hover:border-border-strong hover:text-foreground w-full rounded-md border px-3 py-2 text-left text-xs leading-5 transition-colors"
                      onClick={() => setAiPrompt(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.16em] uppercase">
                  Sample schemas
                </h3>
                <div className="space-y-2">
                  {samplePresets.map((preset) => (
                    <button
                      key={preset.id}
                      className="border-border bg-secondary/45 hover:border-primary/45 hover:bg-primary/8 w-full rounded-md border p-3 text-left transition-colors"
                      onClick={() => {
                        loadPreset(preset);
                        toast.success(`${preset.name} loaded.`);
                        setTab("code");
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {preset.name}
                        </span>
                        <Badge variant="secondary">
                          {formatLabels[preset.format]}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs leading-5">
                        {preset.description}
                      </p>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-muted-foreground mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase">
                  <History className="size-3.5" />
                  History
                </h3>
                <div className="space-y-1">
                  {history.map((item) => (
                    <button
                      key={item}
                      className="text-muted-foreground hover:text-foreground w-full truncate rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-white/[0.05]"
                      onClick={() => setAiPrompt(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
