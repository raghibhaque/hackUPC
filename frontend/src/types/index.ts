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

// Data type representation
export interface ColumnDataType {
  base_type: string;
}

// Column with type info
export interface Column {
  name: string;
  data_type: ColumnDataType;
}

// Table structure
export interface Table {
  name: string;
  columns: Column[];
}

// Column mapping in reconciliation
export interface ColumnMapping {
  col_a: Column;
  col_b: Column;
  confidence: number;
  mapping_type: string;
  conflicts: unknown[];
  sample_values_a?: string[];
  sample_values_b?: string[];
}

// Table mapping in reconciliation
export interface TableMapping {
  table_a: Table;
  table_b: Table;
  confidence: number;
  confidence_label: 'LOW' | 'MEDIUM' | 'HIGH';
  structural_score: number;
  semantic_score: number;
  column_mappings: ColumnMapping[];
  unmatched_columns_a: Column[];
  unmatched_columns_b: Column[];
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
  summary: {
    tables_matched: number;
    tables_in_a: number;
    tables_in_b: number;
    average_confidence: number;
    total_conflicts: number;
    critical_conflicts: number;
  };
  table_mappings: TableMapping[];
  unmatched_tables_a: string[];
  unmatched_tables_b: string[];
  migration_scaffold: string;
}

// API request/response types
export interface ReconcileRequest {
  sourceSchema: Schema;
  targetSchema: Schema;
  analysisDepth?: 'basic' | 'standard' | 'deep';
}

// Upload endpoint response
export interface UploadResponse {
  session_id: string;
  schema_a: {
    table_count: number;
    tables: Table[];
  };
  schema_b: {
    table_count: number;
    tables: Table[];
  };
}

// Start reconciliation response
export interface ReconcileStartResponse {
  job_id: string;
}

// Status polling response
export interface ReconcileStatusResponse {
  job_id: string;
  status: 'running' | 'complete' | 'failed';
  progress: number;
  current_phase: string;
  phase_description: string;
  result: ReconciliationResult | null;
}

// API response from backend
export interface ReconcileApiResponse {
  status: 'complete' | 'processing' | 'failed';
  progress: number;
  result: ReconciliationResult;
}

// For type compatibility
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
