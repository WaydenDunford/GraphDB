export type DataType = string;

export interface Column {
  id: string;
  name: string;
  type: DataType;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  ref?: { table: string; column: string };
}

export interface Table {
  id: string;
  name: string;
  columns: Column[];
  position: { x: number; y: number };
}

export interface Relationship {
  id: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

export interface Schema {
  tables: Table[];
  relationships: Relationship[];
}

export interface SavedSchema {
  id: string;
  name: string;
  code: string;
  updatedAt: number;
}
