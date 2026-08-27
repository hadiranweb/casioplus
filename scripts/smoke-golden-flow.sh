#!/usr/bin/env bash
set -euo pipefail

cd /home/ubuntu/casioplus
DB_NAME='casioplus_ts_core_bootstrap'
TEST_DB_PASSWORD="$(openssl rand -hex 32)"
SERVER_PID=''
cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    kill -- -"$SERVER_PID" 2>/dev/null || true
    kill "$SERVER_PID" 2>/dev/null || true
  fi
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER ROLE genflow_test PASSWORD NULL;" >/dev/null 2>&1 || true
}
trap cleanup EXIT

sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER ROLE genflow_test PASSWORD '${TEST_DB_PASSWORD}';" >/dev/null
export PGPASSWORD="$TEST_DB_PASSWORD"
export DATABASE_URL="postgresql://genflow_test@127.0.0.1:5432/${DB_NAME}"
ORG_ID="$(psql -h 127.0.0.1 -U genflow_test -d "$DB_NAME" -Atc 'SELECT id FROM organizations ORDER BY created_at LIMIT 1')"
WORKSPACE_ID="$(psql -h 127.0.0.1 -U genflow_test -d "$DB_NAME" -Atc 'SELECT id FROM workspaces ORDER BY created_at LIMIT 1')"
ACTOR_ID="$(psql -h 127.0.0.1 -U genflow_test -d "$DB_NAME" -Atc 'SELECT id FROM actors ORDER BY created_at LIMIT 1')"
FLOW_ID="$(psql -h 127.0.0.1 -U genflow_test -d "$DB_NAME" -Atc 'SELECT id FROM flows ORDER BY created_at LIMIT 1')"
WORK_ID="$(psql -h 127.0.0.1 -U genflow_test -d "$DB_NAME" -Atc 'SELECT id FROM work_items ORDER BY created_at LIMIT 1')"
HEADERS=(-H "x-casioplus-organization-id: ${ORG_ID}" -H "x-casioplus-workspace-id: ${WORKSPACE_ID}" -H "x-casioplus-actor-id: ${ACTOR_ID}")
export ALLOW_DEV_TENANT_HEADERS=true
export NODE_ENV=development
export PORT=8093
setsid pnpm dev:core > /tmp/casioplus-golden-smoke.log 2>&1 &
SERVER_PID=$!
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:8093/healthz >/dev/null; then break; fi
  sleep 0.5
done
curl -fsS http://127.0.0.1:8093/healthz >/tmp/casioplus-golden-health.json

curl -fsS "${HEADERS[@]}" -X POST http://127.0.0.1:8093/api/v1/flows/${FLOW_ID}/versions \
  -H 'content-type: application/json' \
  -d '{"inputSchema":{"type":"object","required":["business"]},"outputSchema":{"type":"object","required":["jobProfile"]},"definition":{"name":"business-diagnosis-v1","axes":["capabilityFit","experienceFit","contextFit","motivationFit","riskAndReadiness"]},"runtimeBinding":"native"}' > /tmp/casioplus-golden-version.json
VERSION_ID="$(grep -oE '"id":"[0-9a-f-]{36}"' /tmp/casioplus-golden-version.json | head -1 | cut -d'"' -f4)"
test -n "$VERSION_ID"
curl -fsS "${HEADERS[@]}" -X POST http://127.0.0.1:8093/api/v1/flows/${FLOW_ID}/versions/${VERSION_ID}/publish > /tmp/casioplus-golden-publish.json

RUN_SUFFIX="${CASIOPLUS_SMOKE_SUFFIX:-$(date +%s%N)}"
IDEMPOTENCY_KEY="golden-flow-submit-${RUN_SUFFIX}"
EVENT_IDEMPOTENCY_KEY="golden-flow-event-${RUN_SUFFIX}"
curl -fsS "${HEADERS[@]}" -X POST http://127.0.0.1:8093/api/v1/process-runs \
  -H 'content-type: application/json' \
  -d "{\"workItemId\":\"${WORK_ID}\",\"flowId\":\"${FLOW_ID}\",\"flowVersionId\":\"${VERSION_ID}\",\"idempotencyKey\":\"${IDEMPOTENCY_KEY}\",\"input\":{\"business\":{\"industry\":\"technology\",\"size\":\"small\"},\"position\":{\"title\":\"Operations Lead\",\"responsibilities\":[\"build hiring process\"]},\"candidates\":[{\"id\":\"candidate-2\",\"experience\":[\"operations\"]}]}}" > /tmp/casioplus-golden-run.json
RUN_ID="$(grep -oE '"id":"[0-9a-f-]{36}"' /tmp/casioplus-golden-run.json | head -1 | cut -d'"' -f4)"
test -n "$RUN_ID"

curl -fsS "${HEADERS[@]}" -X POST http://127.0.0.1:8093/api/v1/process-runs/${RUN_ID}/events \
  -H 'content-type: application/json' \
  -d "{\"type\":\"analysis.started\",\"payload\":{\"worker\":\"native-diagnosis\"},\"idempotencyKey\":\"${EVENT_IDEMPOTENCY_KEY}\"}" > /tmp/casioplus-golden-event.json
curl -fsS "${HEADERS[@]}" -X POST http://127.0.0.1:8093/api/v1/semantic-records \
  -H 'content-type: application/json' \
  -d "{\"workItemId\":\"${WORK_ID}\",\"processRunId\":\"${RUN_ID}\",\"type\":\"diagnostic_observation\",\"title\":\"Hiring process observation\",\"summary\":\"The organization needs an operations lead with evidence-backed process ownership.\",\"payload\":{\"fiveAxis\":{\"capabilityFit\":0.8,\"experienceFit\":0.7,\"contextFit\":0.75,\"motivationFit\":0.65,\"riskAndReadiness\":0.7}},\"provenance\":{\"sourceType\":\"process_run\",\"sourceId\":\"${RUN_ID}\",\"actorId\":\"${ACTOR_ID}\"}}" > /tmp/casioplus-golden-record.json
RECORD_ID="$(grep -oE '"id":"[0-9a-f-]{36}"' /tmp/casioplus-golden-record.json | head -1 | cut -d'"' -f4)"
test -n "$RECORD_ID"

curl -fsS "${HEADERS[@]}" -X POST http://127.0.0.1:8093/api/v1/knowledge-claims \
  -H 'content-type: application/json' \
  -d "{\"semanticRecordId\":\"${RECORD_ID}\",\"processRunId\":\"${RUN_ID}\",\"subject\":\"Operations lead hiring\",\"claimType\":\"verified_fact\",\"content\":{\"finding\":\"Process ownership is a hiring priority\"},\"evidence\":[\"${RECORD_ID}\"],\"confidence\":0.86}" > /tmp/casioplus-golden-claim.json
CLAIM_ID="$(grep -oE '"id":"[0-9a-f-]{36}"' /tmp/casioplus-golden-claim.json | head -1 | cut -d'"' -f4)"
test -n "$CLAIM_ID"

curl -fsS "${HEADERS[@]}" -X POST http://127.0.0.1:8093/api/v1/knowledge-claims/${CLAIM_ID}/review \
  -H 'content-type: application/json' \
  -d '{"decision":"approve","rationale":"Evidence is sufficient for workspace-level reuse."}' > /tmp/casioplus-golden-review.json
REVIEW_ID="$(grep -oE '"id":"[0-9a-f-]{36}"' /tmp/casioplus-golden-review.json | head -1 | cut -d'"' -f4)"
test -n "$REVIEW_ID"

curl -fsS "${HEADERS[@]}" -X POST http://127.0.0.1:8093/api/v1/knowledge-claims/${CLAIM_ID}/promote \
  -H 'content-type: application/json' \
  -d "{\"reviewId\":\"${REVIEW_ID}\",\"targetKind\":\"verified_fact\",\"title\":\"Hiring process ownership priority\",\"content\":{\"finding\":\"Operations ownership is a priority\"},\"sensitivity\":\"workspace\",\"rationale\":\"Approved for workspace governed retrieval.\"}" > /tmp/casioplus-golden-memory.json
curl -fsS "${HEADERS[@]}" 'http://127.0.0.1:8093/api/v1/memory/search?query=operations%20priority' > /tmp/casioplus-golden-search.json

printf '%s\n' 'GOLDEN_FLOW_STATUS=passed'
printf '%s\n' "flow=${FLOW_ID} version=${VERSION_ID} run=${RUN_ID} record=${RECORD_ID} claim=${CLAIM_ID} review=${REVIEW_ID}"
printf '%s\n' 'SEARCH_RESULT='
cat /tmp/casioplus-golden-search.json
