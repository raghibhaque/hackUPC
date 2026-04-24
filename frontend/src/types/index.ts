// Schema input types
export type SchemaFormat = 'sql_ddl' | 'prisma' | 'json_schema';

export interface Schema {
  format: SchemaFormat;
  content: string;
  name: string;
}

export interface SchemaUploadRequest {
  sourceSchema: Schema;
  targetSchema: Schema;
}

// Column mapping types
export interface ColumnMapping {
  sourceColumn: string;
  targetColumn: string;
  sourceTable: string;
  targetTable: string;
  confidence: number; // 0-1
  type: string;
  sourcetype?: string;
  targetType?: string;
  conflict?: string;
  reason?: string;
}

// Equivalence graph types
export type GraphNodeType = 'table' | 'column' | 'schema';
export type SchemaPosition = 'source' | 'target';

export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  schema: SchemaPosition;
  data?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  confidence: number;
  label?: string;
}

export interface EquivalenceGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Conflict types
export type ConflictType =
  | 'type_mismatch'
  | 'cardinality_mismatch'
  | 'missing_column'
  | 'extra_column'
  | 'naming_ambiguity'
  | 'multi_match';

export interface ConflictDetail {
  id: string;
  type: ConflictType;
  sourceElement: string;
  targetElement?: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  suggestedResolution?: string;
}

export interface ConflictReport {
  conflicts: ConflictDetail[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
    info: number;
  };
}

// Migration scaffold types
export interface MigrationScaffold {
  migrationCode: string;
  language: 'sql' | 'python' | 'typescript';
  description: string;
  estimatedComplexity: 'low' | 'medium' | 'high';
}

// Complete reconciliation result
export interface ReconciliationResult {
  id?: string;
  timestamp?: string;
  sourceSchema?: Schema;
  targetSchema?: Schema;
  summary: {
    tables_matched: number;
    tables_in_a: number;
    tables_in_b: number;
    average_confidence: number;
    total_conflicts: number;
    critical_conflicts: number;
  };
  table_mappings: Array<{
    table_a: { name: string };
    table_b: { name: string };
    confidence: number;
  }>;
  unmatched_tables_a: string[];
  unmatched_tables_b: string[];
  migration_scaffold: string;
  mappings?: ColumnMapping[];
  graph?: EquivalenceGraph;
  conflicts?: ConflictReport;
  migrationScaffold?: MigrationScaffold;
  overallConfidence?: number;
  status?: 'completed' | 'processing' | 'failed';
  error?: string;
}

// API request/response types
export interface ReconcileRequest {
  sourceSchema: Schema;
  targetSchema: Schema;
  analysisDepth?: 'basic' | 'standard' | 'deep'; // default: standard
}

export interface ReconcileResponse {
  result: ReconciliationResult;
}

export interface ExportRequest {
  resultId: string;
  format: 'sql' | 'python' | 'json';
  includeComments: boolean;
}

export interface ExportResponse {
  content: string;
  filename: string;
  mimeType: string;
}

// UI state types
export interface UploadState {
  sourceFile?: File;
  targetFile?: File;
  sourceFormat?: SchemaFormat;
  targetFormat?: SchemaFormat;
  isLoading: boolean;
  error?: string;
}

export interface AnalysisState {
  result?: ReconciliationResult;
  activeTab: 'mappings' | 'graph' | 'conflicts' | 'migration';
  selectedMapping?: ColumnMapping;
  isExporting: boolean;
  error?: string;
}

// Pagination/filtering types
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface MappingFilters {
  confidenceMin: number;
  confidenceMax: number;
  conflictOnly: boolean;
  searchTerm: string;
}
