/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Database, 
  Sparkles, 
  Download, 
  Search, 
  AlertTriangle, 
  Plus, 
  Minus, 
  Maximize, 
  User,
  History,
  Terminal,
  Layers,
  FileJson,
  FileCode,
  FileText,
  ChevronDown,
  FolderOpen,
  PlusSquare,
  Trash2,
  Edit3,
  X,
  Check,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Table, Relationship, Column, SavedSchema } from './types';

// Constants for layout
const HEADER_HEIGHT = 52;
const TABLE_WIDTH = 200;
const COLUMN_HEIGHT = 30;
const TABLE_HEADER_HEIGHT = 40;

// Modal Component
const Modal = ({ title, isOpen, onClose, children }: { title: string; isOpen: boolean; onClose: () => void; children: React.ReactNode }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-sidebar border border-border rounded-2xl shadow-2xl overflow-hidden glass"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white/[0.02]">
            <h3 className="text-sm font-bold uppercase tracking-widest text-accent">{title}</h3>
            <button onClick={onClose} className="text-text-secondary hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

// --- Mock Initial Code ---
const INITIAL_CODE = `Table users {
  id integer [primary key]
  email varchar
  created_at timestamp
}

Table orders {
  id integer [primary key]
  user_id integer [ref: > users.id]
  status varchar
  total decimal
}

Table products {
  id integer [primary key]
  sku varchar
  price decimal
  stock integer
}

Table order_items {
  id integer [primary key]
  order_id integer [ref: > orders.id]
  product_id integer [ref: > products.id]
  quantity integer
}`;

// Tooltip Component
const Tooltip = ({ text, children }: { text: string; children: React.ReactNode }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.9 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black border border-border text-[10px] text-white rounded whitespace-nowrap z-[100] shadow-xl pointer-events-none"
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- DBML Parser ---
const parseDBML = (text: string): { tables: Table[]; relationships: Relationship[] } => {
  const tables: Table[] = [];
  const relationships: Relationship[] = [];
  
  const tableMatches = text.matchAll(/Table\s+(\w+)\s*{([^}]+)}/g);
  let tableIdx = 0;

  for (const match of tableMatches) {
    const tableName = match[1];
    const content = match[2];
    const columns: Column[] = [];
    
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    lines.forEach((line, colIdx) => {
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        const colName = parts[0];
        const colType = parts[1];
        const isPk = line.includes('[primary key]') || line.includes('pk');
        const refMatch = line.match(/ref:\s*>\s*(\w+)\.(\w+)/);
        
        const col: Column = {
          id: `${tableName}_${colName}`,
          name: colName,
          type: colType,
          isPrimaryKey: isPk,
          isForeignKey: !!refMatch,
          ref: refMatch ? { table: refMatch[1], column: refMatch[2] } : undefined
        };
        columns.push(col);

        if (refMatch) {
          relationships.push({
            id: `rel_${tableName}_${colName}`,
            fromTable: tableName,
            fromColumn: colName,
            toTable: refMatch[1],
            toColumn: refMatch[2]
          });
        }
      }
    });

    tables.push({
      id: tableName,
      name: tableName,
      columns,
      position: { 
        x: 100 + (tableIdx % 3) * 350, 
        y: 100 + Math.floor(tableIdx / 3) * 300 
      }
    });

    tableIdx++;
  }

  return { tables, relationships };
};

export default function App() {
  const [code, setCode] = useState(INITIAL_CODE);
  const [activeTab, setActiveTab ] = useState<'Code' | 'AI'>('Code');
  const [activeDialect, setActiveDialect] = useState<'DBML' | 'PostgreSQL' | 'SQL'>('DBML');
  
  const [tables, setTables] = useState<Table[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [hoveredTableId, setHoveredTableId] = useState<string | null>(null);
  const [hoveredRelationshipId, setHoveredRelationshipId] = useState<string | null>(null);
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);
  
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Schema Management State
  const [savedSchemas, setSavedSchemas] = useState<SavedSchema[]>([]);
  const [currentSchemaId, setCurrentSchemaId] = useState<string | null>(null);
  const [schemaName, setSchemaName] = useState('Untitled Schema');
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedSearchMatch, setHighlightedSearchMatch] = useState<{ tableId: string; colName?: string } | null>(null);

  // Persist current schema locally
  useEffect(() => {
    const stored = localStorage.getItem('graphdb_schemas');
    if (stored) {
      try {
        setSavedSchemas(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse saved schemas', e);
      }
    }
  }, []);

  const saveToStorage = useCallback((schemas: SavedSchema[]) => {
    localStorage.setItem('graphdb_schemas', JSON.stringify(schemas));
    setSavedSchemas(schemas);
  }, []);

  const createNewSchema = () => {
    const newSchema: SavedSchema = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Schema ' + (savedSchemas.length + 1),
      code: INITIAL_CODE,
      updatedAt: Date.now()
    };
    const next = [...savedSchemas, newSchema];
    saveToStorage(next);
    loadSchema(newSchema);
  };

  const loadSchema = (schema: SavedSchema) => {
    setCurrentSchemaId(schema.id);
    setSchemaName(schema.name);
    setCode(schema.code);
    setIsLoadModalOpen(false);
  };

  const autoSave = useCallback(() => {
    if (!currentSchemaId) return;
    const next = savedSchemas.map(s => 
      s.id === currentSchemaId ? { ...s, code, updatedAt: Date.now(), name: schemaName } : s
    );
    saveToStorage(next);
  }, [currentSchemaId, code, schemaName, savedSchemas, saveToStorage]);

  // Debounced autosave
  useEffect(() => {
    const timer = setTimeout(autoSave, 1000);
    return () => clearTimeout(timer);
  }, [code, schemaName]);

  const deleteSchema = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = savedSchemas.filter(s => s.id !== id);
    saveToStorage(next);
    if (currentSchemaId === id) {
      setCurrentSchemaId(null);
      setSchemaName('Untitled Schema');
      setCode(INITIAL_CODE);
    }
  };

  const renameSchema = (newName: string) => {
    if (!currentSchemaId) return;
    setSchemaName(newName);
    setIsRenameModalOpen(false);
  };

  // Search Logic
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const results: Array<{ type: 'TABLE' | 'COLUMN'; tableName: string; colName?: string }> = [];

    tables.forEach(t => {
      if (t.name.toLowerCase().includes(query)) {
        results.push({ type: 'TABLE', tableName: t.name });
      }
      t.columns.forEach(c => {
        if (c.name.toLowerCase().includes(query)) {
          results.push({ type: 'COLUMN', tableName: t.name, colName: c.name });
        }
      });
    });

    return results.slice(0, 8);
  }, [searchQuery, tables]);

  // Handle highlighted match
  useEffect(() => {
    if (highlightedSearchMatch) {
      setHoveredTableId(highlightedSearchMatch.tableId);
    } else {
      setHoveredTableId(null);
    }
  }, [highlightedSearchMatch]);

  // Parse logic
  useEffect(() => {
    const { tables: parsedTables, relationships: parsedRels } = parseDBML(code);
    setTables(prev => {
      // Retain positions for existing tables if already moved
      return parsedTables.map(pt => {
        const existing = prev.find(t => t.id === pt.id);
        return existing ? { ...pt, position: existing.position } : pt;
      });
    });
    setRelationships(parsedRels);
  }, [code]);

  // Sync highlighting: Code line to Table
  const activeTableFromCode = useMemo(() => {
    if (hoveredLineIndex === null) return null;
    const lines = code.split('\n');
    let currentTable = null;
    for (let i = 0; i <= hoveredLineIndex; i++) {
      const match = lines[i]?.match(/Table\s+(\w+)/);
      if (match) currentTable = match[1];
    }
    return currentTable;
  }, [code, hoveredLineIndex]);

  useEffect(() => {
    if (activeTableFromCode) setHoveredTableId(activeTableFromCode);
  }, [activeTableFromCode]);

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.min(Math.max(prev * (1 + delta), 0.2), 3));
  };

  const handleFit = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleAiGenerate = () => {
    if (!aiPrompt) return;
    setIsAiGenerating(true);
    setTimeout(() => {
      setIsAiGenerating(false);
      setAiPrompt('');
      // Simulation: Add a new table in real app context
      setCode(prev => prev + `\n\nTable comments {\n  id integer [primary key]\n  post_id integer [ref: > orders.id]\n  body text\n}`);
    }, 1500);
  };

  const exportToFile = (type: 'PDF' | 'TBM' | 'SQL' | 'EXPRESS_SQL') => {
    const filename = `schema_export_${Date.now()}`;
    let content = "";
    let extension = "";

    switch(type) {
      case 'SQL':
      case 'EXPRESS_SQL':
        extension = "sql";
        content = "-- Generated SQL Schema\n" + tables.map(t => {
          const cols = t.columns.map(c => `  ${c.name} ${c.type}${c.isPrimaryKey ? ' PRIMARY KEY' : ''}`).join(',\n');
          return `CREATE TABLE ${t.name} (\n${cols}\n);`;
        }).join('\n\n');
        break;
      case 'TBM':
        extension = "tbm";
        content = code;
        break;
      case 'PDF':
        window.print();
        return;
    }

    if (content) {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.${extension}`;
      link.click();
      URL.revokeObjectURL(url);
    }
    setShowExportMenu(false);
  };

  // Drag logic for smooth movement
  const onDragTable = useCallback((id: string, delta: { x: number; y: number }) => {
    setTables(prev => prev.map(t => t.id === id ? {
      ...t,
      position: { x: t.position.x + delta.x / zoom, y: t.position.y + delta.y / zoom }
    } : t));
  }, [zoom]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg text-text-primary selection:bg-accent selection:text-black">
      {/* Top Navbar */}
      <nav className="h-[HEADER_HEIGHT] border-b border-border glass flex items-center justify-between px-4 z-[100]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-bold tracking-tight text-accent group cursor-pointer" onClick={() => handleFit()}>
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center group-hover:shadow-[0_0_15px_rgba(62,207,142,0.4)] transition-all">
              <Database className="text-black w-5 h-5" />
            </div>
            <span className="hidden sm:inline">GRAPHDB SCHEMA</span>
          </div>

          <div className="flex items-center gap-2 border-l border-border pl-6">
            <Tooltip text="Create New Schema">
              <button 
                onClick={createNewSchema}
                className="p-2 rounded-lg hover:bg-white/5 text-text-secondary hover:text-accent transition-all cursor-pointer"
              >
                <PlusSquare className="w-5 h-5" />
              </button>
            </Tooltip>
            <Tooltip text="Load Saved Schema">
              <button 
                onClick={() => setIsLoadModalOpen(true)}
                className="p-2 rounded-lg hover:bg-white/5 text-text-secondary hover:text-accent transition-all cursor-pointer"
              >
                <FolderOpen className="w-5 h-5" />
              </button>
            </Tooltip>
          </div>

          <div className="flex items-center gap-3 text-sm text-text-secondary border-l border-border pl-6">
            <div 
              onClick={() => setIsRenameModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1 rounded bg-white/5 hover:bg-white/10 cursor-pointer transition-colors group"
            >
              <Layers className="w-3.5 h-3.5 text-accent" />
              <span className="font-medium text-text-primary">{schemaName}</span>
              <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
            </div>
            <span className="opacity-30 hidden md:inline">•</span>
            <div className="hidden md:flex items-center gap-1 font-medium">
              <Terminal className="w-3.5 h-3.5 text-accent" />
              <span className="text-accent">main</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 relative">
          <button 
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-accent text-black hover:shadow-[0_0_15px_rgba(62,207,142,0.3)] transition-all text-sm font-bold cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export
            <ChevronDown className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showExportMenu && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full mt-2 right-0 w-48 bg-card-bg border border-border rounded-lg shadow-2xl p-1 glass z-[200]"
              >
                {[
                  { label: 'PDF Report', icon: FileText, type: 'PDF' },
                  { label: 'TBM (DBML)', icon: FileCode, type: 'TBM' },
                  { label: 'SQL (DDL)', icon: Database, type: 'SQL' },
                  { label: 'Express SQL', icon: Terminal, type: 'EXPRESS_SQL' },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => exportToFile(item.type as any)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-md transition-colors text-left"
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="w-8 h-8 rounded-full border border-border overflow-hidden cursor-pointer hover:border-accent transition-all ml-4">
            <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
              <User className="text-white w-5 h-5" />
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar: Tabs */}
        <div className="w-[340px] lg:w-[420px] border-r border-border bg-sidebar flex flex-col z-[50]">
          <div className="flex border-b border-border h-10 px-2 items-end gap-1">
            {(['Code', 'AI'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex px-6 py-2 text-[11px] font-bold uppercase tracking-wider transition-all relative cursor-pointer ${
                  activeTab === tab ? 'text-accent' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab === 'AI' && <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                {tab}
                {activeTab === tab && (
                  <motion.div layoutId="activeMainTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              {activeTab === 'Code' ? (
                <motion.div 
                  key="codeTab"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="h-full flex flex-col"
                >
                  <div className="flex border-b border-border h-8 px-2 items-center gap-4 bg-black/20">
                    {(['DBML', 'PostgreSQL', 'SQL'] as const).map(dialect => (
                      <button
                        key={dialect}
                        onClick={() => setActiveDialect(dialect)}
                        className={`text-[9px] font-bold tracking-widest px-2 transition-all ${
                          activeDialect === dialect ? 'text-accent' : 'text-text-secondary/50 hover:text-text-secondary'
                        }`}
                      >
                        {dialect}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 bg-editor-bg relative font-mono text-[13px] leading-[22px] p-4 group">
                    <div className="absolute top-4 left-4 pointer-events-none opacity-10 select-none">
                      {[...Array(50)].map((_, i) => (
                        <div key={i} className="h-[22px] text-right pr-4 border-r border-border/20 w-8">{i + 1}</div>
                      ))}
                    </div>
                    <textarea
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      spellCheck={false}
                      className="w-full h-full bg-transparent border-none outline-none resize-none relative z-10 text-text-primary whitespace-pre focus:ring-0 pl-10"
                      onMouseMove={(e) => {
                        const rect = (e.target as HTMLTextAreaElement).getBoundingClientRect();
                        const y = e.clientY - rect.top;
                        const lineIndex = Math.floor(y / 22); 
                        setHoveredLineIndex(lineIndex);
                      }}
                      onMouseLeave={() => setHoveredLineIndex(null)}
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="aiTab"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="h-full p-6 flex flex-col gap-6"
                >
                   <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/40">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-tight">AI Schema Assistant</h3>
                        <p className="text-[10px] text-text-secondary">Generate and modify code with natural language</p>
                      </div>
                   </div>

                   <div className="bg-black/40 border border-border rounded-xl p-4 shadow-inner flex-1 flex flex-col">
                      <textarea
                        placeholder="Describe your schema changes... (e.g., 'Add a payments table linked to orders')"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="w-full h-full bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-secondary/20 resize-none leading-relaxed"
                      />
                   </div>

                   <div className="flex flex-col gap-3">
                      <button 
                        onClick={handleAiGenerate}
                        disabled={isAiGenerating || !aiPrompt}
                        className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl transition-all font-bold text-sm shadow-lg ${
                          isAiGenerating || !aiPrompt 
                            ? 'bg-white/5 text-white/20 cursor-not-allowed border border-border' 
                            : 'bg-accent text-black hover:shadow-[0_0_20px_rgba(62,207,142,0.4)] active:scale-95'
                        }`}
                      >
                        {isAiGenerating ? (
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                            <Database className="w-4 h-4" />
                          </motion.div>
                        ) : <Terminal className="w-4 h-4" />}
                        {isAiGenerating ? 'AI IS THINKING...' : 'UPGRADE SCHEMA'}
                      </button>
                      <button 
                        onClick={() => setAiPrompt('')}
                        className="w-full py-2 border border-border rounded-lg hover:bg-white/5 transition-colors text-[10px] uppercase font-bold text-text-secondary tracking-widest"
                      >
                        Reset Prompt
                      </button>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Canvas Pane */}
        <div 
          className="flex-1 relative bg-bg grid-bg overflow-hidden cursor-crosshair" 
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              const startX = e.clientX;
              const startY = e.clientY;
              const startPan = { ...pan };
              const onMouseMove = (moveE: MouseEvent) => {
                setPan({
                  x: startPan.x + (moveE.clientX - startX) / zoom,
                  y: startPan.y + (moveE.clientY - startY) / zoom
                });
              };
              const onMouseUp = () => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
              };
              window.addEventListener('mousemove', onMouseMove);
              window.addEventListener('mouseup', onMouseUp);
            }
          }}
        >
          {/* Canvas Sub-layer */}
          <div 
            className="absolute inset-0 origin-top-left transition-transform duration-75 cursor-default"
            style={{ 
              transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            }}
          >
            {/* SVG Connection Layer */}
            <svg className="absolute inset-0 z-10 w-[5000px] h-[5000px] pointer-events-none overflow-visible">
              <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                   <feGaussianBlur stdDeviation="4" result="blur" />
                   <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              {relationships.map(rel => {
                const fromTable = tables.find(t => t.id === rel.fromTable);
                const toTable = tables.find(t => t.id === rel.toTable);
                if (!fromTable || !toTable) return null;

                const fromColIdx = fromTable.columns.findIndex(c => c.name === rel.fromColumn);
                const toColIdx = toTable.columns.findIndex(c => c.name === rel.toColumn);
                
                // Calculate anchor points precisely based on column index
                const startX = fromTable.position.x + TABLE_WIDTH;
                const startY = fromTable.position.y + TABLE_HEADER_HEIGHT + fromColIdx * COLUMN_HEIGHT + COLUMN_HEIGHT / 2;
                
                const endX = toTable.position.x;
                const endY = toTable.position.y + TABLE_HEADER_HEIGHT + toColIdx * COLUMN_HEIGHT + COLUMN_HEIGHT / 2;

                const isHovered = hoveredRelationshipId === rel.id;
                const isTableHovered = hoveredTableId === rel.fromTable || hoveredTableId === rel.toTable;
                const isActive = isHovered || isTableHovered;

                return (
                  <g key={rel.id} className="pointer-events-auto cursor-pointer" 
                     onMouseEnter={() => setHoveredRelationshipId(rel.id)} 
                     onMouseLeave={() => setHoveredRelationshipId(null)}
                  >
                    <path
                      d={`M ${startX} ${startY} C ${startX + 60} ${startY}, ${endX - 60} ${endY}, ${endX} ${endY}`}
                      stroke="transparent"
                      strokeWidth={15}
                      fill="none"
                    />
                    <motion.path
                      d={`M ${startX} ${startY} C ${startX + 60} ${startY}, ${endX - 60} ${endY}, ${endX} ${endY}`}
                      stroke={isActive ? 'var(--color-accent)' : '#222'}
                      strokeWidth={isActive ? 3 : 1.5}
                      fill="none"
                      filter={isActive ? 'url(#glow)' : ''}
                      strokeDasharray={isActive ? "none" : "4 2"}
                      opacity={isActive ? 1 : 0.4}
                      className="transition-all duration-300"
                    />
                    {isActive && (
                      <>
                        <circle cx={startX} cy={startY} r={4} fill="var(--color-accent)" />
                        <circle cx={endX} cy={endY} r={4} fill="var(--color-accent)" />
                      </>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Tables */}
            {tables.map(table => (
              <motion.div
                key={table.id}
                drag
                dragMomentum={false}
                onDrag={(_, info) => onDragTable(table.id, info.delta)}
                className={`absolute w-[${TABLE_WIDTH}px] bg-card-bg border rounded-xl shadow-2xl overflow-hidden cursor-move z-20 ${
                  hoveredTableId === table.id 
                    ? 'border-accent ring-2 ring-accent/30 scale-[1.02]' 
                    : 'border-border'
                }`}
                style={{ left: table.position.x, top: table.position.y }}
                onMouseEnter={() => setHoveredTableId(table.id)}
                onMouseLeave={() => setHoveredTableId(null)}
              >
                <div className="bg-white/[0.04] h-[TABLE_HEADER_HEIGHT] px-3 flex items-center justify-between border-b border-border hover:bg-white/[0.08] transition-colors">
                  <span className="text-[11px] font-black uppercase tracking-widest text-text-primary">{table.name}</span>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-border" />
                    <div className="w-1 h-1 rounded-full bg-border" />
                  </div>
                </div>
                <div className="py-1">
                  {table.columns.map((col, idx) => {
                    const isLinked = relationships.some(r => 
                      (r.fromTable === table.id && r.fromColumn === col.name && (hoveredRelationshipId === r.id || hoveredTableId === r.toTable)) ||
                      (r.toTable === table.id && r.toColumn === col.name && (hoveredRelationshipId === r.id || hoveredTableId === r.fromTable))
                    );

                    return (
                      <div 
                        key={col.id} 
                        className={`h-[${COLUMN_HEIGHT}px] flex items-center justify-between px-3 text-[12px] group transition-all ${
                          isLinked ? 'bg-accent/15 border-l-2 border-accent text-accent' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold  ${col.isPrimaryKey ? 'text-amber-400' : isLinked ? 'text-accent' : 'text-text-primary'}`}>
                            {col.name}
                          </span>
                          {col.isPrimaryKey && <Tooltip text="Primary Key"><span className="text-[10px]">🔑</span></Tooltip>}
                          {col.isForeignKey && <Tooltip text="Foreign Key"><span className="text-[10px]">🔗</span></Tooltip>}
                        </div>
                        <span className="text-text-secondary font-mono text-[10px] opacity-40 group-hover:opacity-100 transition-opacity">
                          {col.type}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Floating UI: Search */}
          <div className="absolute top-6 left-6 z-[110]">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 bg-card-bg border border-border rounded-xl px-4 py-2.5 shadow-2xl glass min-w-[320px] focus-within:border-accent transition-all">
                <Search className="w-4 h-4 text-text-secondary" />
                <input 
                  placeholder="Find tables or fields..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm text-text-primary w-full placeholder:text-text-secondary/30"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-text-secondary hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-card-bg border border-border rounded-xl overflow-hidden shadow-2xl glass py-2"
                  >
                    {searchResults.map((result, i) => (
                      <button
                        key={i}
                        className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/5 text-left transition-colors group"
                        onMouseEnter={() => setHighlightedSearchMatch({ tableId: result.tableName, colName: result.colName })}
                        onMouseLeave={() => setHighlightedSearchMatch(null)}
                        onClick={() => {
                          const table = tables.find(t => t.id === result.tableName);
                          if (table) {
                            setPan({ x: -table.position.x + 400, y: -table.position.y + 400 });
                            setSearchQuery('');
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${result.type === 'TABLE' ? 'bg-accent' : 'bg-blue-400'}`} />
                          <div>
                            <span className="text-sm font-bold text-text-primary">
                              {result.type === 'TABLE' ? result.tableName : result.colName}
                            </span>
                            <div className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">
                              {result.type === 'TABLE' ? 'Table' : `Found in ${result.tableName}`}
                            </div>
                          </div>
                        </div>
                        <Check className="w-4 h-4 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Map Controls */}
          <div className="absolute bottom-10 right-10 flex flex-col gap-3 z-[110]">
            <Tooltip text="Zoom In">
              <button 
                onClick={() => handleZoom(0.2)}
                className="w-12 h-12 bg-card-bg border border-border rounded-xl flex items-center justify-center hover:bg-white/10 hover:border-accent transition-all text-text-secondary hover:text-white cursor-pointer active:scale-90 shadow-2xl group"
              >
                <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </Tooltip>
            <Tooltip text="Zoom Out">
              <button 
                onClick={() => handleZoom(-0.2)}
                className="w-12 h-12 bg-card-bg border border-border rounded-xl flex items-center justify-center hover:bg-white/10 hover:border-accent transition-all text-text-secondary hover:text-white cursor-pointer active:scale-90 shadow-2xl group"
              >
                <Minus className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </Tooltip>
            <Tooltip text="Fit to Screen">
              <button 
                onClick={handleFit}
                className="w-12 h-12 bg-card-bg border border-border rounded-xl flex items-center justify-center hover:bg-white/10 hover:border-accent transition-all text-text-secondary hover:text-white cursor-pointer active:scale-90 shadow-2xl group"
              >
                <Maximize className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </Tooltip>
          </div>

          <div className="absolute bottom-10 left-10 z-[110]">
             <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-xl text-[11px] text-amber-400 glass animate-pulse">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-bold tracking-tight">SCHEMA ALERT:</span>
                <span>Missing indexed constraint on foreign keys.</span>
             </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <Modal 
        title="Open Schema" 
        isOpen={isLoadModalOpen} 
        onClose={() => setIsLoadModalOpen(false)}
      >
        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
          {savedSchemas.length === 0 ? (
            <div className="text-center py-8">
              <History className="w-12 h-12 text-border mx-auto mb-4" />
              <p className="text-text-secondary text-sm italic">No saved schemas yet.</p>
            </div>
          ) : (
            savedSchemas.sort((a, b) => b.updatedAt - a.updatedAt).map(schema => (
              <div 
                key={schema.id}
                onClick={() => loadSchema(schema)}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group ${
                  currentSchemaId === schema.id 
                    ? 'border-accent bg-accent/5' 
                    : 'border-border hover:bg-white/5 hover:border-text-secondary/30'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-text-primary">{schema.name}</span>
                  <span className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">
                    Last updated {new Date(schema.updatedAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => deleteSchema(schema.id, e)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-text-secondary hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
          <button 
            onClick={createNewSchema}
            className="mt-4 w-full py-4 border-2 border-dashed border-border rounded-xl flex items-center justify-center gap-3 text-text-secondary hover:text-accent hover:border-accent hover:bg-accent/5 transition-all text-sm font-bold"
          >
            <PlusSquare className="w-5 h-5" />
            CREATE NEW PROJECT
          </button>
        </div>
      </Modal>

      <Modal 
        title="Rename Schema" 
        isOpen={isRenameModalOpen} 
        onClose={() => setIsRenameModalOpen(false)}
      >
        <div className="flex flex-col gap-6">
           <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase font-bold text-text-secondary tracking-widest ml-1">Schema Name</label>
              <input 
                autoFocus
                defaultValue={schemaName}
                onKeyDown={(e) => { if(e.key === 'Enter') renameSchema(e.currentTarget.value); }}
                className="w-full bg-black/40 border border-border rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:border-accent transition-all"
              />
           </div>
           <button 
             onClick={() => {
                const el = document.querySelector('input') as HTMLInputElement;
                renameSchema(el.value);
             }}
             className="w-full py-3 bg-accent text-black rounded-xl font-bold text-sm shadow-lg hover:shadow-[0_0_20px_rgba(62,207,142,0.4)] transition-all"
           >
             UPDATE NAME
           </button>
        </div>
      </Modal>
    </div>
  );
}
