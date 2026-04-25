#!/bin/bash

set +e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}==================================${NC}"
echo -e "${BLUE}Backend Features Issue Creator${NC}"
echo -e "${BLUE}==================================${NC}\n"

if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed${NC}"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

if ! gh auth status > /dev/null 2>&1; then
    echo -e "${RED}Error: GitHub CLI is not authenticated.${NC}"
    echo "Run: gh auth login"
    exit 1
fi

REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)

echo -e "${GREEN}✓ Creating backend issues in: $REPO${NC}\n"

gh label create backend \
    --color 5319E7 \
    --description "Backend related work" \
    --repo "$REPO" \
    2>/dev/null || true

gh label create enhancement \
    --color A2EEEF \
    --description "New feature or improvement" \
    --repo "$REPO" \
    2>/dev/null || true

gh label create bug \
    --color D73A4A \
    --description "Bug or broken behaviour" \
    --repo "$REPO" \
    2>/dev/null || true

gh label create security \
    --color B60205 \
    --description "Security improvement" \
    --repo "$REPO" \
    2>/dev/null || true

gh label create testing \
    --color 0E8A16 \
    --description "Tests and quality assurance" \
    --repo "$REPO" \
    2>/dev/null || true

declare -a ISSUES=(

"Backend: Add async reconciliation jobs with progress tracking|### Problem
The backend currently runs reconciliation synchronously inside the request lifecycle. A pipeline/job service exists, but it is not fully wired into the API.

### Goal
Add background reconciliation jobs so large schemas do not block HTTP requests.

### Tasks
- Add POST /api/reconcile/jobs endpoint.
- Return a job_id immediately.
- Add GET /api/reconcile/jobs/{job_id} endpoint.
- Track pending, running, complete, and error states.
- Track progress percentage.
- Store result when complete.
- Add cleanup for old jobs.

### Acceptance Criteria
- Large reconciliation requests return quickly with a job_id.
- Frontend can poll job status.
- Completed jobs return the reconciliation result.
- Failed jobs return a useful error message."

"Backend: Secure uploaded SQL file handling|### Problem
The upload endpoint writes files using the raw uploaded filename. This can allow unsafe filenames, overwrites, or path traversal-style mistakes.

### Goal
Make file upload handling safer.

### Tasks
- Sanitize uploaded filenames.
- Reject path separators.
- Restrict allowed extensions to .sql initially.
- Generate unique saved filenames.
- Add max file size validation.
- Return clear 400 errors for invalid files.

### Acceptance Criteria
- Unsafe filenames are rejected or sanitized.
- Files cannot overwrite arbitrary paths.
- Upload errors are clear.
- Existing frontend upload flow still works."

"Backend: Add parser auto-detection endpoint|### Problem
The backend has parser classes for SQL, Prisma, and JSON Schema, but only SQL DDL is currently used by routes.

### Goal
Create a unified parser detection layer.

### Tasks
- Add ParserRegistry service.
- Detect SQL DDL, Prisma schema, and JSON Schema.
- Return detected format during upload.
- Use the correct parser automatically.
- Add helpful errors when no parser matches.

### Acceptance Criteria
- SQL files still parse.
- Prisma and JSON Schema files can be detected once parsers are implemented.
- API response includes source_format.
- Invalid input returns a clear error."

"Backend: Implement Prisma schema parser|### Problem
backend/core/parsers/prisma.py exists but is empty.

### Goal
Parse Prisma model definitions into the internal Schema IR.

### Tasks
- Parse model blocks.
- Extract field names and types.
- Detect id fields.
- Detect unique constraints.
- Detect optional fields.
- Detect relations where possible.
- Map Prisma scalar types to ColumnType.

### Acceptance Criteria
- Basic Prisma schemas produce tables and columns.
- id and unique fields are represented.
- Optional fields map to nullable columns.
- Parser includes unit tests."

"Backend: Implement JSON Schema parser|### Problem
backend/core/parsers/json_schema.py exists but is empty.

### Goal
Parse JSON Schema objects into the internal Schema IR.

### Tasks
- Parse object properties.
- Map JSON types to ColumnType.
- Use required fields to determine nullable status.
- Support nested objects as related tables or JSON columns.
- Handle arrays safely.
- Add parser tests.

### Acceptance Criteria
- Basic JSON Schema input becomes a Schema object.
- Required fields are marked non-nullable.
- Unsupported structures degrade gracefully.
- Parser includes unit tests."

"Backend: Improve SQL DDL parser coverage|### Problem
The SQL parser currently handles common CREATE TABLE statements but needs stronger support for real-world DDL.

### Goal
Improve SQL parser robustness.

### Tasks
- Support schema-qualified table names.
- Support quoted table names with hyphens or spaces where possible.
- Parse composite primary keys.
- Parse composite foreign keys.
- Parse indexes and unique keys more completely.
- Support PostgreSQL SERIAL/BIGSERIAL.
- Add tests for MySQL and PostgreSQL examples.

### Acceptance Criteria
- Parser handles more real database dumps.
- Composite keys are represented correctly.
- Existing Ghost/WordPress demo still works.
- Parser tests cover edge cases."

"Backend: Add proper API error models|### Problem
Some routes return status='error' with HTTP 200 instead of using consistent HTTP errors.

### Goal
Make API errors predictable for the frontend.

### Tasks
- Add ErrorResponse model.
- Return 400 for invalid user input.
- Return 404 for missing uploaded files.
- Return 500 for unexpected backend errors.
- Avoid exposing raw internal stack details.
- Log full error internally.

### Acceptance Criteria
- Frontend can reliably handle failed requests.
- Invalid input does not return HTTP 200.
- Error response shape is consistent."

"Backend: Add structured logging|### Problem
The backend currently has limited runtime visibility.

### Goal
Add useful structured logs for debugging demos and failures.

### Tasks
- Configure Python logging.
- Log request-level events.
- Log parser detection results.
- Log reconciliation duration.
- Log table/column counts.
- Log exceptions with stack traces server-side.

### Acceptance Criteria
- Running backend prints useful logs.
- Errors are easier to diagnose.
- Logs do not expose uploaded SQL contents by default."

"Backend: Add reconciliation confidence explanation fields|### Problem
The frontend receives scores, but users need clearer backend-generated explanations for why mappings were chosen.

### Goal
Add human-readable explanation metadata to table and column mappings.

### Tasks
- Add explanation field to TableMapping.
- Add explanation field to ColumnMapping.
- Include semantic similarity reasons.
- Include structural similarity reasons.
- Include type compatibility notes.
- Include conflict summary.

### Acceptance Criteria
- API result includes explanations.
- Explanations are concise and readable.
- Frontend can display them in tooltips/drawers."

"Backend: Add unmatched column suggestion endpoint|### Problem
Unmatched columns need ranked alternative suggestions beyond strict assignment.

### Goal
Expose backend suggestions for unmatched columns.

### Tasks
- Add suggestion generation after reconciliation.
- Rank possible target columns by score.
- Include confidence and reason.
- Add endpoint or include in reconciliation result.
- Avoid duplicating already matched columns unless marked as alternative.

### Acceptance Criteria
- Unmatched columns include suggested matches.
- Suggestions have confidence scores.
- Suggestions explain why they were recommended."

"Backend: Generate safer migration SQL|### Problem
Generated migration SQL is useful but should be safer and more production-like.

### Goal
Improve SQL generation quality.

### Tasks
- Quote identifiers safely.
- Add optional dry-run comments.
- Add TODO comments for unresolved conflicts.
- Avoid unsafe casts where data loss is likely.
- Add transaction wrapping where supported.
- Add warnings for unmatched required target columns.

### Acceptance Criteria
- Generated SQL is safer to inspect.
- Risky transformations are clearly marked.
- SQL still generates for demo schemas."

"Backend: Add SQL dialect option for exports|### Problem
The current generated SQL is generic and mostly MySQL-oriented.

### Goal
Allow users to choose export dialect.

### Tasks
- Add dialect field to export request.
- Support mysql initially.
- Add postgres output mode.
- Map types per dialect.
- Adjust identifier quoting per dialect.
- Add tests for generated SQL.

### Acceptance Criteria
- Export endpoint accepts dialect=mysql/postgres.
- Generated SQL syntax matches selected dialect better.
- Invalid dialect returns 400."

"Backend: Add migration transform code export|### Problem
The codegen folder includes a transform.py template, but the API currently exposes only SQL export.

### Goal
Expose Python transformation scaffold export.

### Tasks
- Add /api/export/python endpoint.
- Generate transform script from reconciliation result.
- Include mapping comments.
- Include TODOs for conflicts.
- Include type conversion placeholders.
- Return downloadable text response.

### Acceptance Criteria
- User can export Python migration scaffold.
- Script includes mapped tables and columns.
- Conflicts are clearly marked as TODO."

"Backend: Add graph export endpoint|### Problem
The frontend may need a relationship graph, but the backend does not expose a dedicated graph response.

### Goal
Return schema relationships and mappings as graph nodes/edges.

### Tasks
- Add graph serialization service.
- Include table nodes.
- Include foreign key edges.
- Include mapping edges between source and target tables.
- Include confidence scores on mapping edges.
- Add /api/reconcile/graph or include graph in result.

### Acceptance Criteria
- Frontend can render graph without rebuilding it manually.
- Graph includes tables and relationships.
- Mapping edges include confidence."

"Backend: Add health and readiness checks|### Problem
/api/health exists but only returns a simple status.

### Goal
Add richer health/readiness information.

### Tasks
- Keep /api/health lightweight.
- Add /api/ready endpoint.
- Check upload directory availability.
- Check demo files exist.
- Include app version.
- Include enabled parser formats.

### Acceptance Criteria
- Health endpoint confirms app is alive.
- Readiness endpoint confirms dependencies/resources are usable.
- Demo file problems are visible quickly."

"Backend: Add pytest test suite for parsers|### Problem
Parser logic is central to the project but currently lacks visible test coverage.

### Goal
Add unit tests for parser correctness.

### Tasks
- Add pytest configuration.
- Test SQL CREATE TABLE parsing.
- Test primary keys.
- Test foreign keys.
- Test nullable/default parsing.
- Test indexes where supported.
- Add sample fixtures.

### Acceptance Criteria
- pytest runs successfully.
- Parser tests cover demo schemas.
- Tests catch parser regressions."

"Backend: Add pytest tests for reconciliation engine|### Problem
The reconciliation algorithm needs regression tests.

### Goal
Test matching, scoring, conflicts, and unmatched handling.

### Tasks
- Test obvious table matches.
- Test column matches with synonyms.
- Test unmatched source/target tables.
- Test low-confidence mappings are filtered.
- Test conflict detection is included.
- Test migration SQL is generated.

### Acceptance Criteria
- Engine tests pass.
- Score thresholds behave predictably.
- Demo reconciliation result remains stable."

"Backend: Add request size limits|### Problem
Raw SQL reconciliation accepts large strings without explicit limits.

### Goal
Protect backend from very large payloads.

### Tasks
- Add max request size config.
- Validate source_sql and target_sql length.
- Validate upload file size.
- Return 413 or 400 with clear message.
- Document limits in README or .env.example.

### Acceptance Criteria
- Oversized requests are rejected.
- Normal demo files still work.
- Error message explains the limit."

"Backend: Add CORS environment validation|### Problem
CORS origins come from environment variables and may be misconfigured.

### Goal
Make CORS safer and clearer.

### Tasks
- Strip whitespace from origins.
- Ignore empty origins.
- Warn when wildcard is used.
- Document CORS_ORIGINS in .env.example.
- Add test or simple config validation.

### Acceptance Criteria
- CORS config is predictable.
- Localhost defaults still work.
- Bad env values do not silently produce confusing behaviour."

"Backend: Add OpenAPI examples for main endpoints|### Problem
FastAPI docs exist, but request/response examples would make demo usage easier.

### Goal
Improve auto-generated API docs.

### Tasks
- Add Pydantic Field examples.
- Add endpoint summaries.
- Add response examples.
- Include demo schema request examples.
- Document export endpoints.

### Acceptance Criteria
- /docs is clearer.
- Requests can be tested easily from Swagger UI.
- Hackathon judges can understand API faster."

"Backend: Add Docker production command|### Problem
The README and local flow use uvicorn reload, but production/demo deployment should use a safer command.

### Goal
Improve backend deploy readiness.

### Tasks
- Add Dockerfile if missing.
- Use uvicorn without --reload for production.
- Expose PORT env var.
- Ensure backend starts from repo root.
- Update docker-compose if needed.

### Acceptance Criteria
- Backend runs in Docker.
- Production command does not use reload.
- Environment variables are respected."

"Backend: Add database schema comparison summary stats|### Problem
The frontend needs high-level summary values for dashboards.

### Goal
Return summary stats directly from backend.

### Tasks
- Include source table count.
- Include target table count.
- Include mapped table count.
- Include mapped column count.
- Include unmatched counts.
- Include conflict count.
- Include average confidence.

### Acceptance Criteria
- Reconciliation result includes summary object.
- Frontend does not need to recompute key stats.
- Values match actual mappings."

"Backend: Add conflict severity levels|### Problem
Conflicts are detected, but severity is needed for prioritisation.

### Goal
Classify conflicts by severity.

### Tasks
- Add severity field: low, medium, high, critical.
- Assign severity by conflict type.
- Mark data-loss risks as high/critical.
- Include severity in API response.
- Add tests for severity assignment.

### Acceptance Criteria
- Every conflict has severity.
- Frontend can filter/sort by severity.
- Severe conflicts are clearly identifiable."

"Backend: Add sample schema generator endpoint|### Problem
Users need quick sample schemas to test the app without uploading files.

### Goal
Expose backend-generated examples.

### Tasks
- Add /api/demo/schemas endpoint.
- Return available demo schema names.
- Add endpoint to fetch demo SQL.
- Add more demo pairs beyond Ghost/WordPress.
- Include small, medium, and conflict-heavy examples.

### Acceptance Criteria
- Frontend can list demos.
- User can load demo schemas quickly.
- Existing Ghost/WordPress demo still works."

"Backend: Add API versioning prefix|### Problem
Current endpoints are under /api but not versioned.

### Goal
Prepare API for future changes.

### Tasks
- Add /api/v1 route prefix.
- Keep /api routes temporarily for compatibility.
- Document preferred v1 endpoints.
- Update frontend later to use v1.

### Acceptance Criteria
- /api/v1 endpoints work.
- Existing /api endpoints still work during transition.
- No breaking change for current frontend."

)

CREATED=0
FAILED=0
SKIPPED=0

for issue in "${ISSUES[@]}"; do
    IFS='|' read -r TITLE BODY <<< "$issue"

    echo -n "Checking: $TITLE... "

    EXISTING=$(gh issue list \
        --repo "$REPO" \
        --search "$TITLE in:title" \
        --state all \
        --json number \
        --jq '.[0].number' 2>/dev/null)

    if [ -n "$EXISTING" ]; then
        echo -e "${YELLOW}skipped, already exists (#$EXISTING)${NC}"
        ((SKIPPED++))
        continue
    fi

    echo -n "creating... "

    EXTRA_LABELS="backend,enhancement"

    if [[ "$TITLE" == *"Secure"* ]] || [[ "$TITLE" == *"size limits"* ]]; then
        EXTRA_LABELS="backend,security"
    fi

    if [[ "$TITLE" == *"pytest"* ]] || [[ "$TITLE" == *"tests"* ]]; then
        EXTRA_LABELS="backend,testing"
    fi

    if [[ "$TITLE" == *"error"* ]] || [[ "$TITLE" == *"parser coverage"* ]]; then
        EXTRA_LABELS="backend,bug,enhancement"
    fi

    if gh issue create \
        --title "$TITLE" \
        --body "$BODY

---

**Type:** Backend Task  
**Component:** Backend  
**Priority:** Medium" \
        --label "$EXTRA_LABELS" \
        --repo "$REPO"; then

        echo -e "${GREEN}✓${NC}"
        ((CREATED++))
        sleep 1
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi
done

echo -e "\n${BLUE}==================================${NC}"
echo -e "${GREEN}Issues created: $CREATED${NC}"
echo -e "${YELLOW}Issues skipped: $SKIPPED${NC}"

if [ "$FAILED" -gt 0 ]; then
    echo -e "${RED}Issues failed: $FAILED${NC}"
fi

echo -e "${BLUE}==================================${NC}\n"
echo -e "View backend issues at: ${YELLOW}https://github.com/$REPO/issues?q=label%3Abackend${NC}"