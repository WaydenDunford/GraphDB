"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";
import type { BeforeMount, OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useSchemaStore } from "@/lib/store/schema-store";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="text-muted-foreground flex h-full items-center justify-center bg-[#0d0d0c] text-sm">
      Loading editor...
    </div>
  )
});

function languageForFormat(format: string) {
  return format === "dbml" ? "dbml" : "sql";
}

export function SchemaEditor() {
  const code = useSchemaStore((state) => state.code);
  const format = useSchemaStore((state) => state.format);
  const schema = useSchemaStore((state) => state.schema);
  const errors = useSchemaStore((state) => state.errors);
  const hoveredElement = useSchemaStore((state) => state.hoveredElement);
  const selectedElement = useSchemaStore((state) => state.selectedElement);
  const setCode = useSchemaStore((state) => state.setCode);
  const setHoveredFromLine = useSchemaStore(
    (state) => state.setHoveredFromLine
  );
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Parameters<BeforeMount>[0] | null>(null);
  const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(
    null
  );

  const beforeMount = useCallback<BeforeMount>((monaco) => {
    monacoRef.current = monaco;

    if (
      !monaco.languages
        .getLanguages()
        .some((language: { id: string }) => language.id === "dbml")
    ) {
      monaco.languages.register({ id: "dbml" });
      monaco.languages.setMonarchTokensProvider("dbml", {
        tokenizer: {
          root: [
            [/\/\/.*$/, "comment"],
            [
              /\b(Table|Ref|Enum|Project|indexes|primary key|pk|ref|not null|unique)\b/i,
              "keyword"
            ],
            [
              /\b(integer|int|uuid|varchar|text|timestamp|timestamptz|decimal|numeric|boolean|jsonb?)\b/i,
              "type"
            ],
            [/[{}[\]()>:-]/, "delimiter"],
            [/"[^"]*"/, "string"],
            [/'[^']*'/, "string"]
          ]
        }
      });
    }

    monaco.editor.defineTheme("graphdb-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "34d399", fontStyle: "bold" },
        { token: "type", foreground: "22d3ee" },
        { token: "comment", foreground: "77776f" },
        { token: "string", foreground: "fbbf24" }
      ],
      colors: {
        "editor.background": "#0d0d0c",
        "editor.foreground": "#ededeb",
        "editor.lineHighlightBackground": "#171716",
        "editorLineNumber.foreground": "#55554e",
        "editorLineNumber.activeForeground": "#a3a39a",
        "editorCursor.foreground": "#34d399",
        "editor.selectionBackground": "#34d39933",
        "editor.inactiveSelectionBackground": "#34d3991f"
      }
    });
  }, []);

  const onMount = useCallback<OnMount>(
    (editorInstance) => {
      editorRef.current = editorInstance;
      decorationsRef.current = editorInstance.createDecorationsCollection();

      editorInstance.onMouseMove((event) => {
        const lineNumber = event.target.position?.lineNumber;
        if (lineNumber) {
          setHoveredFromLine(lineNumber);
        }
      });

      editorInstance.onMouseLeave(() => setHoveredFromLine(null));
    },
    [setHoveredFromLine]
  );

  useEffect(() => {
    const monaco = monacoRef.current;
    const editorInstance = editorRef.current;
    const decorations = decorationsRef.current;
    const activeElement = hoveredElement ?? selectedElement;

    if (!monaco || !editorInstance || !decorations || !activeElement) {
      decorations?.clear();
      return;
    }

    const range = schema.sourceMap[activeElement.id];
    if (!range) {
      decorations.clear();
      return;
    }

    decorations.set([
      {
        range: new monaco.Range(
          range.startLine,
          range.startColumn,
          range.endLine,
          Math.max(range.endColumn, range.startColumn + 1)
        ),
        options: {
          isWholeLine: true,
          className:
            activeElement.kind === "column"
              ? "monaco-column-line"
              : "monaco-hover-line"
        }
      }
    ]);

    if (selectedElement?.id === activeElement.id) {
      editorInstance.revealLineInCenterIfOutsideViewport(range.startLine);
    }
  }, [hoveredElement, schema.sourceMap, selectedElement]);

  useEffect(() => {
    const monaco = monacoRef.current;
    const model = editorRef.current?.getModel();

    if (!monaco || !model) {
      return;
    }

    monaco.editor.setModelMarkers(
      model,
      "schema-validation",
      errors
        .filter((error) => error.source || error.line)
        .map((error) => {
          const range = error.source ?? {
            startLine: error.line ?? 1,
            endLine: error.line ?? 1,
            startColumn: 1,
            endColumn: model.getLineMaxColumn(error.line ?? 1)
          };

          return {
            severity:
              error.severity === "warning"
                ? monaco.MarkerSeverity.Warning
                : monaco.MarkerSeverity.Error,
            message: error.detail
              ? `${error.message}\n${error.detail}`
              : error.message,
            code: error.code,
            startLineNumber: range.startLine,
            endLineNumber: range.endLine,
            startColumn: range.startColumn,
            endColumn: range.endColumn
          };
        })
    );
  }, [errors]);

  return (
    <div className="border-border h-full min-h-0 overflow-hidden border-y">
      <MonacoEditor
        value={code}
        language={languageForFormat(format)}
        theme="graphdb-dark"
        beforeMount={beforeMount}
        onMount={onMount}
        onChange={(value) => setCode(value ?? "")}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily:
            "var(--font-mono-stack), Menlo, Monaco, Consolas, monospace",
          lineHeight: 22,
          padding: { top: 16, bottom: 16 },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          wordWrap: "on",
          automaticLayout: true,
          bracketPairColorization: { enabled: true },
          guides: { indentation: true },
          renderLineHighlight: "all",
          overviewRulerBorder: false
        }}
      />
    </div>
  );
}
