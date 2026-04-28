# SchemaSync

**Automated database schema reconciliation and migration SQL generation powered by ML-driven structural and semantic analysis.**

Schema reconciliation—mapping tables and columns across two different database schemas—is normally a manual, error-prone task that takes days. SchemaSync automates it in seconds using a 3-layer matching engine: structural fingerprinting, semantic similarity, and optimal assignment via the Hungarian algorithm. It then generates real, runnable migration SQL in multiple formats (Generic SQL, Flyway, Liquibase, AWS DMS, Rollback) with dialect support for MySQL and PostgreSQL.

---

## Table of Contents

- [What It Does](#what-it-does)
- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [How to Run](#how-to-run)
- [Docker Deployment](#docker-deployment)
- [Features](#features)
- [Schema Import Methods](#schema-import-methods)
- [Real Migration SQL Generation](#real-migration-sql-generation)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [Troubleshooting](#troubleshooting)
- [Development Status](#development-status)
- [Future Work](#future-work)

---

## What It Does

SchemaSync takes two SQL database schemas and produces:

1. **Table Mappings** — Which table in schema A matches which table in schema B, with confidence scores
2. **Column Mappings** — For each matched table, which columns map to each other  
3. **Conflict Report** — Type mismatches, nullability differences, constraint violations, missing defaults
4. **Real Migration SQL** — Production-ready SQL scripts with:
   - Multiple output formats: Generic SQL, Flyway, Liquibase XML, AWS DMS JSON, Rollback scripts
   - Dialect support: MySQL 5.7+, PostgreSQL 11+, or generic (dialect-agnostic)
   - Safe type conversions with NULLIF guards and CASE expressions
   - ALTER TABLE incremental migrations or DROP+CREATE approaches
   - Automatic rollback scripts for quick recovery
5. **Visual Analysis** — Mapping confidence scores, complexity assessment, data loss risk indicators, execution metrics

**Input:** Two schemas via `.sql` files, `.prisma` files, JSON Schema, or live database connections  
**Output:** 
- Visual mapping results with confidence scores
- Interactive conflict analysis and batch resolution
- Migration complexity assessment (Simple/Moderate/Complex)
- Data loss risk warnings before download
- Real migration SQL in 5 formats + rollback scripts
- Export history tracking
- Exportable as SQL/JSON/PDF reports

---

## The Problem

Every time systems integrate (M&A, platform migrations, data consolidation), teams face schema reconciliation:

- **Naming chaos:** `users` vs `wp_users` vs `accounts` vs `customer_profiles`
- **Semantic mismatch:** `created_at` vs `registered_on` vs `date_joined`
- **Type divergence:** `VARCHAR(255)` vs `TEXT` vs `CHARACTER VARYING`
- **Structural differences:** Foreign keys, constraints, indexes, enums

This forces engineers to:
1. Manually inspect both schemas side-by-side
2. Infer semantic meaning from names and context
3. Resolve conflicts (which differences are intentional? which are bugs?)
4. Hand-write migration logic

**The cost:**
- Slow: Days to weeks of senior engineer time
- Expensive: Only senior engineers can do this reliably
- Inconsistent: Depends on human judgment, prone to mistakes

---

## The Solution

SchemaSync automates reconciliation with a **3-layer matching engine**:

### Layer 1: Structural Analysis
Extracts format-agnostic **fingerprints** of each table:
- Primary key strategy (single vs composite, auto-increment)
- Foreign key density and patterns
- Column count, type distribution
- Junction table detection (many-to-many patterns)
- Audit column presence (`created_at`, `updated_at`, `deleted_at`)

Uses **cosine similarity** on fingerprint vectors to score table pairs structurally.

### Layer 2: Semantic Matching
Understands **meaning** beyond names:
- **Comprehensive Synonym Dictionaries** — 14 semantic categories:
  - Identity: `id`, `identifier`, `uid`, `guid`, `pk`, `key`, `oid`, `no`, `nbr`, `nr`
  - People: `user`, `account`, `member`, `author`, `owner`, `creator`, `person`, `profile`
  - Timestamps: `created`, `updated`, `deleted` (with 40+ variations)
  - Content: `content`, `body`, `text`, `html`, `markdown`, `description`, `excerpt`
  - ...and 10+ more categories for common database patterns
- **Semantic Tokenization** — Groups synonyms for Jaccard similarity matching
- **Hybrid Scoring** — 50% semantic weight, 30% name similarity, 20% core name matching
- **CMS Pattern Recognition** — Special boost for recognized patterns:
  - Detects `users`, `posts`, `tags`, `comments`, `roles`, `settings` across platforms
  - Recognizes WordPress (`wp_*`) and Ghost prefixes
  - Boosts confidence by 12% when both tables match the same CMS pattern
- **Optional: Transformer Embeddings** via `sentence-transformers` for deeper semantic context
- **Type Compatibility Scoring** — Numeric, string, date, boolean type categories
- **Transformation Suggestions** — Auto-proposes safe type conversions

### Layer 3: Optimal Assignment
Uses the **Hungarian Algorithm** (via SciPy) to find the **globally optimal table and column mappings** given all pairwise scores.

Instead of greedy matching (pick the best pair, repeat), this solves the bipartite matching problem optimally, ensuring no table is matched twice.

---

## Getting Started

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** and npm
- **Git**

### Quick Start (5 minutes)

#### 1. Set up backend

```bash
cd SchemaSync

# Create virtual environment
python3 -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
python -m uvicorn backend.main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

#### 2. Set up frontend (in a new terminal)

```bash
cd SchemaSync/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

You should see:
```
VITE v5.0.8  ready in 123 ms
➜  Local:   http://localhost:5173/
```

#### 3. Open the app

Go to **http://localhost:5173** in your browser. Click "Run Demo" to see it work—no files needed. The demo reconciles Ghost CMS vs WordPress schemas automatically.

---

## Project Structure

```
SchemaSync/
├── README.md                          # This file
├── requirements.txt                   # Python dependencies
├── .env.example                       # Environment variables template
├── .gitignore
├── Dockerfile                         # Multi-stage Docker build (Python 3.11-slim)
├── docker-compose.yml                 # Service orchestration with health checks
├── .dockerignore
│
├── backend/                           # FastAPI backend (port 8000)
│   ├── main.py                        # FastAPI app, CORS, middleware, routes
│   ├── config.py                      # Configuration (thresholds, env vars)
│   ├── logging_config.py              # Structured logging setup
│   │
│   ├── api/
│   │   ├── routes/
│   │   │   ├── upload.py              # POST /api/v1/upload/ — upload & parse schema
│   │   │   ├── reconcile.py           # POST /api/v1/reconcile/* — run reconciliation
│   │   │   ├── export.py              # POST /api/v1/export/* — 5 export formats
│   │   │   ├── graph.py               # Graph visualization data
│   │   │   ├── suggestions.py         # Smart mapping suggestions
│   │   │   ├── samples.py             # Sample/demo schema endpoints
│   │   │   ├── health.py              # GET /api/v1/health
│   │   │   └── validate.py            # Schema validation
│   │   ├── models/
│   │   │   ├── requests.py            # Pydantic request schemas
│   │   │   └── responses.py           # Pydantic response schemas
│   │   └── errors.py                  # Custom error codes & handlers
│   │
│   ├── core/
│   │   ├── ir/                        # Intermediate Representation
│   │   │   ├── models.py              # Schema, Table, Column, TableMapping dataclasses
│   │   │   └── normaliser.py          # Name & type normalisation
│   │   │
│   │   ├── parsers/                   # Multi-format schema parsers (1022 lines)
│   │   │   ├── base.py                # Abstract parser interface
│   │   │   ├── sql_ddl.py             # SQL DDL parser — MySQL/PostgreSQL (383 lines)
│   │   │   ├── prisma.py              # Prisma schema parser (284 lines)
│   │   │   └── json_schema.py         # JSON Schema parser (336 lines)
│   │   │
│   │   ├── analysis/                  # Matching algorithms (650+ lines)
│   │   │   ├── structural.py          # Fingerprint extraction & cosine similarity (213 lines)
│   │   │   ├── semantic.py            # Name similarity, synonym dicts, embeddings (437 lines)
│   │   │   └── validator.py           # Schema validation utilities
│   │   │
│   │   ├── reconciliation/            # Main orchestration (445 lines)
│   │   │   ├── engine.py              # ReconciliationEngine pipeline (142 lines)
│   │   │   ├── scorer.py              # Score matrix computation (224 lines)
│   │   │   └── assignment.py          # Hungarian algorithm + greedy fallback (79 lines)
│   │   │
│   │   ├── conflicts/                 # Conflict detection (355+ lines)
│   │   │   ├── detector.py            # Type/nullability/constraint/DEFAULT/FK detection
│   │   │   └── types.py               # Conflict type constants (7 types)
│   │   │
│   │   └── codegen/                   # SQL migration generation (803 lines)
│   │       ├── generator.py           # 3 generators: DROP+CREATE, ALTER TABLE, Rollback
│   │       ├── dialects.py            # MySQL vs PostgreSQL syntax adapters (139 lines)
│   │       └── transform.py           # Safe type conversion helpers (268 lines)
│   │
│   ├── services/
│   │   ├── pipeline.py                # Async job queue
│   │   ├── schema_cache.py            # Caching layer
│   │   └── llm.py                     # (stub) LLM integration
│   │
│   ├── demo/                          # Demo schema pairs (6 scenarios)
│   │   ├── ghost_schema.sql           # Ghost CMS schema
│   │   ├── wordpress_schema.sql       # WordPress schema
│   │   ├── crm_legacy_schema.sql      # Legacy CRM schema
│   │   ├── crm_modern_schema.sql      # Modern CRM schema
│   │   ├── messy_legacy_schema.sql    # Stress-test schema
│   │   └── messy_modern_schema.sql    # Stress-test schema
│   │
│   └── uploads/                       # User-uploaded files (runtime, gitignored)
│
├── frontend/                          # React + TypeScript (port 5173)
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── index.html
│   │
│   └── src/
│       ├── App.tsx                    # Main app shell with tab navigation
│       ├── main.tsx                   # React root
│       │
│       ├── api/
│       │   └── client.ts              # Axios API client
│       │
│       ├── lib/
│       │   ├── api.ts                 # API response transformer
│       │   ├── utils.ts               # cn() helper (clsx + tailwind-merge)
│       │   ├── exportFormats.ts       # 5 export format generators
│       │   ├── migrationUtils.ts      # Type conversion map, complexity estimator
│       │   ├── sqlDialect.ts          # MySQL/PostgreSQL/Generic dialect adapters
│       │   └── statisticsExport.ts    # Statistics export utilities
│       │
│       ├── types/
│       │   └── index.ts               # TypeScript types (ReconciliationResult, etc.)
│       │
│       ├── components/                # 67 components across 9 directories
│       │   ├── Upload/
│       │   │   └── UploadPanel.tsx    # Hero with file upload, drag-drop, 3 demo scenarios
│       │   │
│       │   ├── Mapping/               # 20+ components
│       │   │   ├── MappingTable.tsx                  # Main results view
│       │   │   ├── MappingEditor.tsx                 # Modal for editing mappings
│       │   │   ├── ColumnDetailsDrawer.tsx           # Side panel for column details
│       │   │   ├── ConfidenceFilterSlider.tsx        # Threshold slider
│       │   │   ├── BulkActionBar.tsx                 # Multi-select toolbar
│       │   │   ├── MappingDiffView.tsx               # Side-by-side comparison
│       │   │   ├── BatchConflictResolutionPanel.tsx  # Bulk conflict resolution
│       │   │   ├── ExportDrawer.tsx                  # 5-format export panel
│       │   │   ├── MigrationPreview.tsx              # Live SQL with syntax highlighting
│       │   │   ├── MigrationOptions.tsx              # Dialect selector
│       │   │   ├── MigrationSummaryCard.tsx          # Complexity + metrics
│       │   │   ├── DataLossRiskIndicator.tsx         # Risk warnings
│       │   │   ├── StatisticsDashboard.tsx           # Confidence dist, conflict breakdown
│       │   │   ├── AdvancedFilterBuilder.tsx         # Complex filter criteria
│       │   │   ├── FilterPresetsUI.tsx               # Save/load filter presets
│       │   │   ├── RulesUI.tsx                       # Custom transformation rules
│       │   │   ├── HistoryPanel.tsx                  # Action history viewer
│       │   │   ├── TemplateManager.tsx               # Save/load review templates
│       │   │   └── ...more
│       │   │
│       │   ├── Graph/
│       │   │   └── EquivalenceGraph.tsx  # Two-column view with connection lines
│       │   │
│       │   ├── Conflicts/
│       │   │   └── ConflictReport.tsx    # Grouped by severity
│       │   │
│       │   ├── Analytics/
│       │   │   └── AnalyticsView.tsx     # Metrics dashboard
│       │   │
│       │   ├── Review/                   # ReviewStatusBadge, Controls, ProgressBar
│       │   ├── Comments/                 # Comment threads on mappings
│       │   ├── CodeGen/                  # MigrationScaffold
│       │   ├── SchemaInput/              # Input variants
│       │   ├── shared/                   # ConfidenceBadge, ConfidenceTooltip, ProgressBar
│       │   └── ui/
│       │       └── shape-landing-hero.tsx  # Framer Motion animated hero
│       │
│       ├── hooks/                     # 53 custom React hooks
│       │   ├── useHistory.ts          # 50-action undo/redo stack
│       │   ├── useConflictResolutions.ts
│       │   ├── useConflictPatterns.ts
│       │   ├── useTemplates.ts
│       │   ├── useFilterPresets.ts
│       │   ├── useCustomRules.ts
│       │   ├── useProgressMetrics.ts
│       │   ├── useTableStatistics.ts
│       │   ├── useReviewState.ts
│       │   ├── useReviewFilters.ts
│       │   ├── useReviewHistory.ts
│       │   ├── useExportHistory.ts    # Last 10 exports in localStorage
│       │   └── useTypeConversions.ts
│       │
│       └── styles/
│           └── global.css             # Dark theme, scrollbars, base styles
│
└── tests/
    ├── test_parsers.py                # Parser unit tests
    └── test_reconciliation.py         # Reconciliation logic tests
```

---

## How to Run

### Full Setup (Fresh Install)

```bash
# 1. Navigate to project
cd SchemaSync

# 2. Set up backend
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. Start backend (Terminal 1)
python -m uvicorn backend.main:app --reload --port 8000

# 4. Set up and start frontend (Terminal 2)
cd frontend
npm install
npm run dev

# 5. Open http://localhost:5173
```

### Backend Only (Existing Setup)

```bash
source venv/bin/activate
python -m uvicorn backend.main:app --reload --port 8000
```

### Frontend Only (Existing Setup)

```bash
cd frontend
npm run dev
```

### Environment Variables

Create `.env.local` in the frontend root (optional):

```env
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=SchemaSync
VITE_APP_VERSION=0.0.1
VITE_ENABLE_EXPORT=true
VITE_ENABLE_POLLING=true
```

---

## Docker Deployment

SchemaSync ships with a production-ready Docker setup.

### Build and run with Docker Compose

```bash
docker compose up --build
```

The backend API will be available at `http://localhost:8000`.

### Build the image directly

```bash
docker build -t schemasync .
docker run -p 8000:8000 schemasync
```

### Configuration via environment

```yaml
# docker-compose.yml environment section supports:
PORT: 8000
DEBUG: false
CORS_ORIGINS: "http://localhost:5173"
MAX_REQUEST_SIZE_MB: 10
```

The Dockerfile uses a multi-stage build (Python 3.11-slim) with a non-root user for security. A health check hits `/api/v1/health` on startup.

---

## Features

### Core Schema Reconciliation

| Feature | Status | Details |
|---------|--------|---------|
| SQL DDL Parsing | ✅ | MySQL, PostgreSQL (`CREATE TABLE` statements) |
| Prisma Schema Parsing | ✅ | `.prisma` files with full type mapping |
| JSON Schema Parsing | ✅ | Standard JSON Schema format, flexible table layouts |
| Live Database Connectors | 🔲 Planned | Frontend UI exists (`DatabaseConnector.tsx`); backend introspection not yet implemented |
| Structural Analysis | ✅ | Fingerprinting, PK/FK detection, audit column detection |
| Semantic Matching | ✅ | 14-category synonym dicts, name similarity, optional embeddings |
| Hungarian Assignment | ✅ | Optimal global bipartite matching for tables & columns |
| Conflict Detection | ✅ | 7 types: type mismatch, nullability, constraint, FK, DEFAULT, cardinality, missing column |
| Demo Scenarios | ✅ | 3 built-in demos: Ghost→WordPress, Legacy CRM→Modern CRM, Messy schemas |
| File Upload | ✅ | `.sql` / `.prisma` / `.json` file parsing |
| Real-time Search | ✅ | Filter mappings by table/column name (Cmd+K) |
| Equivalence Graph | ✅ | Two-column schema view with visual connection lines |
| Confidence Filter | ✅ | Slider to hide results below a confidence threshold |
| Batch Conflict Resolution | ✅ | Group similar conflicts, apply bulk resolutions |

### Real Migration SQL Generation

| Feature | Status | Details |
|---------|--------|---------|
| Generic SQL Export | ✅ | BEGIN/COMMIT wrapper, ALTER TABLE or DROP+CREATE |
| Flyway Format | ✅ | `V{timestamp}__schema.sql` naming with `@undo` annotation |
| Liquibase XML Format | ✅ | `<databaseChangeLog>` with `<changeSet>` and rollback sections |
| AWS DMS JSON Format | ✅ | Task configuration with table/column mapping rules |
| Rollback SQL | ✅ | Reverse operations, DROP IF EXISTS with cascade |
| ALTER TABLE Path | ✅ | Incremental migration (rename/modify vs drop+create) |
| Safe Type Conversions | ✅ | NULLIF guards, STR_TO_DATE, FROM_UNIXTIME, CASE expressions |
| Dialect Adapters | ✅ | MySQL 5.7+, PostgreSQL 11+, Generic |
| Live SQL Preview | ✅ | Syntax highlighting, line numbers, per-table section copy |
| Conflict Annotations | ✅ | Visual markers with icons, colors, hover tooltips in preview |
| Sidebar Navigation | ✅ | Scroll to table section, conflict indicator per section |
| Complexity Estimation | ✅ | Simple/Moderate/Complex based on risky conversions and unmatched columns |
| Data Loss Risk Assessment | ✅ | Warns on risky casts, dropped columns, low-confidence mappings |
| Export History | ✅ | Last 10 exports persisted in localStorage |

### Advanced UI & Analysis

| Feature | Status | Details |
|---------|--------|---------|
| Execution Metrics | ✅ | Timing, confidence scores, precision/recall, algorithm details |
| Progress Tracking | ✅ | Review status, completion %, conflict resolution progress |
| Custom Rules Engine | ✅ | Define transformation rules, save/load templates |
| Filter Presets | ✅ | Save and apply filter configurations |
| Statistics Dashboard | ✅ | Tables overview, column stats, confidence distribution, conflict breakdown |
| PDF Report Export | ✅ | Full reconciliation report via jsPDF |
| Undo/Redo History | ✅ | 50-action buffer with stack-based tracking |
| Keyboard Shortcuts | ✅ | Cmd+K search, Escape clear, Ctrl+Z/Y undo/redo |
| Mapping Diff View | ✅ | Side-by-side source/target column comparison |
| Comment Threads | ✅ | Annotate individual mappings |
| Dark Theme | ✅ | Full dark UI with gradient backgrounds |

### Planned Features

| Feature | Notes |
|---------|-------|
| LLM-Powered Transformations | AI-suggested data transformation and mapping refinement |
| Batch Processing | Reconcile multiple schema pairs at once |
| Schema Versioning | Track schema evolution across migrations |
| Webhook Integration | Export to Slack, GitHub, Linear for team notifications |

---

## Schema Import Methods

### 1. SQL DDL

Upload `.sql` files or paste `CREATE TABLE` statements directly.

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Prisma Schema

Paste `.prisma` files with automatic type mapping:

```prisma
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}
```

SchemaSync maps Prisma types (`Int`, `String`, `DateTime`, etc.) to SQL equivalents and extracts relationships.

### 3. JSON Schema

Standard JSON Schema definitions with flexible table layouts:

```json
{
  "Users": {
    "type": "object",
    "properties": {
      "id": { "type": "integer" },
      "email": { "type": "string", "format": "email" }
    }
  }
}
```

### 4. Live Database Connection *(Planned)*

A `DatabaseConnector` UI component exists in the frontend, but backend introspection is not yet implemented. When complete, this will allow connecting directly to PostgreSQL, MySQL, or MongoDB to introspect live schemas without file upload.

---

## Real Migration SQL Generation

SchemaSync generates production-ready migration SQL across multiple formats and dialects.

### Supported Export Formats

#### 1. Generic SQL

```sql
-- SchemaSync Migration: 8 tables, 45 columns
-- Generated: 2026-04-28T12:00:00Z | Confidence: 87.3% | Complexity: MODERATE
BEGIN;

-- users → wp_users (0.95)
ALTER TABLE wp_users RENAME COLUMN user_id TO ID;
ALTER TABLE wp_users MODIFY COLUMN created_at DATETIME;
INSERT INTO wp_users (ID, email, name) SELECT user_id, email_addr, full_name FROM users;

COMMIT;
```

#### 2. Flyway SQL

```sql
-- V20260428_120000__Migrate_ghost_to_wordpress.sql
BEGIN;
-- Migration statements...
COMMIT;
-- @undo
-- ROLLBACK;
```

#### 3. Liquibase XML

```xml
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog">
  <changeSet id="schemasync-0" author="schemasync">
    <renameColumn tableName="wp_users" oldColumnName="user_id" newColumnName="ID"/>
    <modifyDataType tableName="wp_users" columnName="created_at" newDataType="DATETIME"/>
    <sql>INSERT INTO wp_users (...) SELECT ... FROM users;</sql>
    <rollback>...</rollback>
  </changeSet>
</databaseChangeLog>
```

#### 4. AWS DMS JSON

```json
{
  "version": "1.0",
  "table_mappings": [{
    "source_table": "users",
    "target_table": "wp_users",
    "column_mappings": [{ "source_column": "user_id", "target_column": "ID" }]
  }]
}
```

#### 5. Rollback SQL

```sql
BEGIN;
ALTER TABLE wp_users RENAME COLUMN ID TO user_id;
ALTER TABLE wp_users MODIFY COLUMN created_at VARCHAR(255);
DROP TABLE IF EXISTS wp_new_tables CASCADE;
-- ROLLBACK;
```

### Dialect Support

| Dialect | Syntax Differences |
|---------|-------------------|
| **MySQL 5.7+** | `MODIFY COLUMN`, `AUTO_INCREMENT`, `CAST(col AS SIGNED)`, `DATE_FORMAT()` |
| **PostgreSQL 11+** | `ALTER COLUMN TYPE`, `SERIAL`, `CAST(col AS INTEGER)`, `TO_TIMESTAMP()` |
| **Generic** | Comments indicate dialect-specific sections |

### Safe Type Conversion

Risky conversions are generated defensively:

```sql
-- VARCHAR to INT:
CAST(NULLIF(TRIM(col_name), '') AS SIGNED)

-- VARCHAR to DATE:
STR_TO_DATE(NULLIF(TRIM(col_name), ''), '%Y-%m-%d')

-- String to BOOLEAN:
CASE WHEN LOWER(NULLIF(TRIM(col_name), '')) IN ('true','yes','1','t','y')
     THEN 1 ELSE 0 END
```

### Migration Complexity

SchemaSync estimates complexity (Simple / Moderate / Complex) based on:
- Risky type conversions (high weight)
- Unmatched columns (medium weight)
- Low-confidence table mappings (low weight)
- Unresolved conflicts (high weight)

Data loss risks are surfaced before export:
```
Data Loss Risks:
  • 3 high-risk type conversions (VARCHAR→INT)
  • 2 source columns will be dropped
  • 1 low-confidence mapping (0.65 score)

Recommendation: Always test migrations in staging first and maintain backups.
```

---

## Architecture

### Backend Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | FastAPI | Async REST API, auto-docs, validation |
| Parsing | Custom hand-written parsers | SQL DDL, Prisma, JSON Schema |
| Analysis | SciPy, NumPy | Structural fingerprinting, cosine similarity |
| Matching | SciPy (linear_sum_assignment) | Hungarian optimal bipartite matching |
| Server | Uvicorn | ASGI server (2 workers in Docker) |
| Optional AI | sentence-transformers | Semantic embeddings (disabled by default) |

### Frontend Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | React 18 + TypeScript | Component-based UI |
| Build | Vite 5 | Fast bundling & dev server |
| HTTP | Axios | REST API calls |
| Data Fetching | TanStack Query 5 | Caching, loading states |
| Virtual Lists | TanStack Virtual 3 | Performance for large schemas |
| Animations | Framer Motion 12 | Smooth transitions, hero effects |
| Graph | ReactFlow 11 | Equivalence graph visualization |
| Styling | Tailwind CSS 3 | Utility-first CSS |
| Icons | Lucide React | Icon library |
| PDF | jsPDF | Report export |
| Validation | Zod | Runtime type safety |

### Data Flow

```
User provides 2 schemas (SQL / Prisma / JSON / Live DB)
        ↓
Backend parses → normalizes → IR (Schema, Table, Column objects)
        ↓
Structural analysis: Fingerprint vectors + cosine similarity
        ↓
Semantic analysis: Synonym matching + optional embeddings
        ↓
Score matrices: tables×tables and columns×columns
        ↓
Hungarian algorithm: Globally optimal assignment
        ↓
Conflict detection: 7 conflict types across all mappings
        ↓
SQL generation: 3 migration generators × 2+ dialects
        ↓
Frontend: Mappings, conflicts, analytics, interactive SQL export
```

---

## API Endpoints

All endpoints are prefixed with `/api/v1/`.

### Upload

**POST `/api/v1/upload/`** — Upload and parse a schema file

```json
// Response
{
  "filename": "users_schema.sql",
  "tables_found": 5,
  "table_names": ["users", "posts", "comments"],
  "schema_preview": { ... }
}
```

---

### Reconcile

**POST `/api/v1/reconcile/demo`** — Run a built-in demo scenario

Request body: `{}` (uses Ghost CMS vs WordPress by default)

**POST `/api/v1/reconcile/`** — Reconcile raw schema text

```json
{
  "source_sql": "CREATE TABLE users ...",
  "target_sql": "CREATE TABLE wp_users ...",
  "source_name": "legacy",
  "target_name": "wordpress"
}
```

**POST `/api/v1/reconcile/files`** — Reconcile previously uploaded files

```
?source_file=schema_a.sql&target_file=schema_b.sql
```

All three return:
```json
{
  "status": "complete",
  "result": {
    "summary": {
      "tables_matched": 8,
      "columns_matched": 45,
      "conflicts": 3,
      "avg_confidence": 0.87
    },
    "table_mappings": [ ... ],
    "unmatched_source_tables": [ ... ],
    "unmatched_target_tables": [ ... ],
    "conflicts": [ ... ],
    "migration_sql": "BEGIN; ..."
  }
}
```

---

### Export

**POST `/api/v1/export/sql`** — Generic SQL (DROP+CREATE)  
**POST `/api/v1/export/alter`** — ALTER TABLE migration (incremental)  
**POST `/api/v1/export/rollback`** — Rollback SQL  

All accept:
```json
{ "source_sql": "...", "target_sql": "..." }
```

**GET `/api/v1/export/demo/sql`** — Demo Generic SQL  
**GET `/api/v1/export/demo/alter`** — Demo ALTER migration  
**GET `/api/v1/export/demo/rollback`** — Demo rollback SQL  

---

### Health

**GET `/api/v1/health`**

```json
{ "status": "ok", "version": "0.1.0" }
```

---

## Troubleshooting

**`No module named uvicorn`**
```bash
source venv/bin/activate
pip install -r requirements.txt
```

**`Address already in use (port 8000)`**
```bash
python -m uvicorn backend.main:app --reload --port 8001
# Then update frontend/src/api/client.ts base URL to :8001
```

**`Cannot find module 'framer-motion'`**
```bash
cd frontend && npm install
```

**`Network Error` when clicking demo**
```bash
curl http://localhost:8000/api/v1/health  # confirm backend is up
```

**Slow reconciliation (>10 seconds)**
```bash
USE_EMBEDDINGS=false python -m uvicorn backend.main:app --reload
# sentence-transformers is slow on first use; disabling speeds things up significantly
```

---

## Development Status

### Current State (April 2026)

SchemaSync is a fully functional schema reconciliation platform. Key milestones completed:

**Core Matching Engine** ✅
- 3-layer pipeline: structural fingerprinting → semantic matching → Hungarian assignment
- 14-category synonym dictionaries with 40+ timestamp variations
- CMS pattern recognition and cross-platform boosts
- Globally optimal bipartite table and column matching

**Multi-Format Schema Import** ✅
- SQL DDL (MySQL + PostgreSQL)
- Prisma `.prisma` files
- JSON Schema (standard format)
- Live database introspection (planned — frontend UI ready, backend pending)

**Production SQL Generation** ✅
- 5 export formats: Generic SQL, Flyway, Liquibase, AWS DMS, Rollback
- MySQL 5.7+ and PostgreSQL 11+ dialect adapters
- Safe type conversion patterns (NULLIF, STR_TO_DATE, CASE)
- Interactive SQL preview with syntax highlighting and per-section copy

**Rich Interactive UI** ✅
- 67 React components, 53 custom hooks
- Dark theme with Framer Motion animations
- Confidence filter, batch conflict resolution, bulk actions
- Statistics dashboard, PDF export, undo/redo, keyboard shortcuts
- 3 built-in demo scenarios

**DevOps** ✅
- Docker multi-stage build with non-root user
- Docker Compose with health checks and volume management

### Test Coverage

- Parser unit tests (`tests/test_parsers.py`)
- Reconciliation logic tests (`tests/test_reconciliation.py`)
- Tested against 6 demo schema pairs (Ghost CMS, WordPress, CRM variants, messy schemas)
- Zero TypeScript errors on production build

---

## Future Work

- **Live database connectors** — Backend introspection for PostgreSQL, MySQL, MongoDB (frontend UI is ready)
- **LLM-powered transformations** — Use Claude/GPT to suggest data transformations and disambiguate low-confidence mappings
- **Batch processing** — Reconcile multiple schema pairs in one session
- **Schema versioning** — Track reconciliation history and schema evolution over time
- **Webhook integration** — Push results to Slack, GitHub, Linear
- **Custom transformation functions** — User-defined conversions for domain-specific edge cases
- **Performance at scale** — Profile and optimize for 1000+ column schemas
- **Collaboration** — Share mappings and comment threads across teams

---

## License

MIT

---

*Built for HackUPC — extended into a production-ready tool*
