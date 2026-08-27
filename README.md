# Casioplus

Casioplus یک پلتفرم برای ساخت، انتشار و مصرف Flowهای قابل‌حکمرانی است. این repository، مسیر MVP را با یک Core یکپارچهٔ TypeScript/Node.js و PostgreSQL canonical آغاز می‌کند. Rust از critical path خارج است و در آینده فقط در صورت نیاز اثبات‌شده می‌تواند به‌عنوان Worker تخصصی یا موتور پردازشی بازگردد.

## سطوح محصول

`app.casioplus.com` سطح مصرف و عملیات است: Work Board، Timeline، اجرای publication، Review، Artifact و Memory View. `studio.casioplus.com` سطح ساخت و حکمرانی است: Flow builder، input/output، policy، test، version، publication و تنظیمات Runtime. در MVP این دو surface می‌توانند از یک host-aware web application و یک Core/API مشترک استفاده کنند؛ مرزهای permission و route از ابتدا مستقل تعریف می‌شوند.

## مالکیت داده

PostgreSQL تنها منبع حقیقت برای Organization، Workspace، Actor، Work، Flow، FlowVersion، ProcessRun، WorkCommit، Review، Memory و Artifact metadata است. App، Studio، Worker، n8n، Open WebUI و OpenClaw مستقیماً به database متصل نمی‌شوند و فقط از contractهای API/event استفاده می‌کنند.

## ساختار فعلی

```text
apps/
  app-web/                 App surface
  studio-web/              Studio surface
services/
  core-api/                TypeScript/Node.js + PostgreSQL API/Core
  native-diagnosis-worker/ first Golden Flow worker
  n8n-adapter/             orchestration boundary
  open-webui-adapter/      interaction/model boundary
  openclaw-adapter/        restricted action boundary
packages/
  contracts/               Zod API and runtime contracts
  domain/                  Work, Flow, Run, Commit and Actor types
  knowledge-model/         Semantic and Organizational Memory types
  auth/                    session and identity boundary
  tenant-policy/           tenant scope and authorization
  observability/           correlation and redaction
  ui/                      shared UI primitives
migrations/                PostgreSQL canonical migrations
deployment/                Liara manifests and release configuration
docs/                      ADRs, runbooks and domain contracts
scripts/                   validators and smoke tests
tests/                     contract and end-to-end tests
```

## Golden Flow MVP

```text
Create WorkItem
  → select Flow and FlowVersion
  → create ProcessRun
  → collect RuntimeEvent
  → create WorkCommit
  → Review
  → promote approved result to MemoryItem
  → display Timeline and Governed Retrieval
```

اولین worker، تحلیل عارضه‌یابی کسب‌وکار، خروجی structured JSON و HTML و در صورت نیاز PDF ثابت تولید می‌کند. n8n فقط orchestrator، Open WebUI فقط interaction/model plane و OpenClaw فقط action plane محدود و approval-gated هستند.

## توسعهٔ محلی

```bash
pnpm install
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB pnpm db:migrate
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB pnpm dev:core
```

سرویس Core در `PORT=8080` به `GET /healthz` پاسخ می‌دهد. در محیط production، نبود `DATABASE_URL` باید باعث fail-fast شود و هیچ fake persistence مجاز نیست.

## تصمیم‌های مهم

این repository عمداً از code یا migration خراب Rust کپی نمی‌کند. مفاهیم domain مفید از کارهای قبلی به TypeScript contracts منتقل می‌شوند، اما canonical implementation جدید با migration تمیز، tenant scope، idempotency، audit، review gate و تست PostgreSQL واقعی ساخته می‌شود.

در MVP از اصطلاحات GitHub برای نام entityهای حافظه استفاده نمی‌شود. `WorkCommit` یک نام domain برای ثبت outcome حکمرانی‌شده است و با commit فنی Git اشتباه نشود. مدل حافظه از `OperationalEvent`، `SemanticRecord`، `KnowledgeClaim`، `KnowledgeReview`، `KnowledgePromotion` و `OrganizationalMemoryItem` استفاده می‌کند.

## وضعیت baseline

Baseline اولیهٔ repository شامل monorepo workspace، PostgreSQL migration، مدل‌های typed، Core/API health، endpointهای Work/Flow و smoke واقعی روی PostgreSQL است. قابلیت‌های کامل Work Run، Commit Review، Memory Promotion، UI، Runtime adapters، CI/CD و Liara در فازهای بعدی سوپرپلن اجرا می‌شوند.
