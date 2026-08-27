# Casioplus

Casioplus یک پلتفرم برای ساخت، انتشار و مصرف Flowهای قابل‌حکمرانی است. این repository مسیر MVP را با یک **Core یکپارچهٔ TypeScript/Node.js** و **PostgreSQL canonical** پیاده می‌کند. Rust از critical path خارج است و فقط پس از MVP، با اثبات مستقل ارزش، می‌تواند به‌عنوان Worker تخصصی یا موتور پردازشی بازگردد.

## سطوح محصول

`app.casioplus.com` سطح مصرف و عملیات است: Work Board، Timeline، اجرای publication، Review، Artifact و Memory View. `studio.casioplus.com` سطح ساخت و حکمرانی است: Flow builder، input/output، policy، test، version، publication و تنظیمات Runtime. در MVP این دو surface می‌توانند از یک host-aware web application و یک Core/API مشترک استفاده کنند؛ مرزهای permission و route از ابتدا مستقل تعریف شده‌اند.

## مالکیت داده و runtime boundaries

PostgreSQL تنها منبع حقیقت برای Organization، Workspace، Actor، Work، Flow، FlowVersion، ProcessRun، OperationalEvent، SemanticRecord، KnowledgeClaim، KnowledgeReview، KnowledgePromotion، OrganizationalMemoryItem، Artifact و Audit است. Core/API تنها canonical writer است. App، Studio، Native Worker، n8n، Open WebUI و OpenClaw direct database access ندارند و فقط از contractهای API/event استفاده می‌کنند.

n8n تنها orchestrator است؛ Open WebUI interaction/model plane است؛ OpenClaw action plane محدود و approval-gated است؛ و Native Diagnosis Worker اولین runtime Golden Flow است. هیچ runtime credential مستقیم PostgreSQL ندارد.

## ساختار repository

```text
apps/
  app-web/                 App surface boundary
  studio-web/              Studio surface boundary
services/
  core-api/                TypeScript/Node.js Core + API
  native-diagnosis-worker/ اولین worker deterministic عارضه‌یابی
  n8n-adapter/             signed orchestration boundary
  open-webui-adapter/      interaction/model boundary
  openclaw-adapter/        restricted action boundary
packages/
  contracts/               Zod API و runtime contracts
  domain/                  Work, Flow, Run و scientific memory types
  knowledge-model/         memory-plane types
migrations/                ordered PostgreSQL migrations با checksum registry
deployment/                Liara release manifest و promotion evidence
docs/                      Charter، ADR، glossary، taxonomy، threat model و Golden Flow
scripts/                   topology، auth issuer و smoke tests
```

## Golden Flow MVP

```text
Form Submission
  → WorkItem + FlowVersion
  → ProcessRun
  → Native Diagnosis Worker
  → RuntimeEvent
  → JSON/HTML Artifact
  → SemanticRecord
  → KnowledgeClaim candidate
  → Human Review
  → KnowledgePromotion
  → OrganizationalMemoryItem
  → Governed Retrieval
```

اولین Flow، ورودی عارضه‌یابی کسب‌وکار را به پروفایل ساختاریافتهٔ موقعیت شغلی و ارزیابی کاندیدا با **matching پنج‌محوره** تبدیل می‌کند. Worker فعلی deterministic است و score را همراه با evidence، confidence و limitation تولید می‌کند؛ خروجی تصمیم استخدامی خودکار نیست و human review لازم است. JSON و HTML artifact در مسیر پایه هستند و PDF تا زمان وجود renderer پایدار و regression test اختیاری است.

## توسعهٔ محلی

```bash
pnpm install
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB pnpm db:migrate
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB SESSION_SECRET='at-least-32-characters' pnpm dev:core
```

برای smoke محلی با seed database، `pnpm smoke:golden` به‌صورت موقت password role تست را تنظیم و پس از اجرا پاک می‌کند، session امضاشده صادر می‌نماید و raw tenant headers را فعال نمی‌کند. این script برای production نیست و باید به database تست جدا متصل شود.

سرویس Core در `PORT=8080` به `GET /healthz` پاسخ می‌دهد. اگر `ALLOW_DEV_TENANT_HEADERS=true` فعال شود، فقط در محیط غیرproduction مجاز است. server واقعی membership authorization را enforce می‌کند و بدون `DATABASE_URL` یا `SESSION_SECRET` معتبر fail-fast می‌شود.

## commandهای validation

```bash
pnpm format:check
pnpm check
pnpm test
pnpm validate:topology
pnpm build
pnpm smoke:golden
```

## تصمیم‌های مهم

این repository عمداً code یا migration خراب Rust را به مسیر MVP وارد نمی‌کند. مفاهیم domain مفید از کارهای قبلی به TypeScript contracts منتقل شده‌اند، اما canonical implementation با migration تمیز، tenant scope، idempotency، audit، review gate و تست PostgreSQL واقعی ساخته می‌شود.

در MVP از literal GitHub برای نام entityهای حافظه استفاده نمی‌شود. `Commit` یا `WorkCommit` فقط در صورت نیاز یک view/interaction label محدود برای outcome است؛ مدل canonical حافظه از `OperationalEvent`، `SemanticRecord`، `KnowledgeClaim`، `KnowledgeReview`، `KnowledgePromotion` و `OrganizationalMemoryItem` استفاده می‌کند.

## وضعیت فعلی baseline

در baseline فعلی، monorepo، migrationهای ordered با checksum، signed session boundary، membership enforcement، endpointهای Work/Flow/FlowVersion/ProcessRun/RuntimeEvent/Artifact، lifecycle حافظه، Native Diagnosis Worker، smoke script و تست‌های قرارداد/API/auth/worker وجود دارد. App و Studio هنوز UI قابل‌استفادهٔ production ندارند و integrationهای n8n/Open WebUI/OpenClaw، object storage واقعی، CI/CD و Liara عمداً پس از تثبیت Core/Auth در فازهای بعدی ساخته می‌شوند.

## اسناد canonical

| سند                                                         | نقش                                      |
| ----------------------------------------------------------- | ---------------------------------------- |
| [`MVP_CHARTER_FA.md`](docs/MVP_CHARTER_FA.md)               | product scope، roles و اصول MVP          |
| [`GOLDEN_FLOW_FA.md`](docs/GOLDEN_FLOW_FA.md)               | task list و Definition of Done مسیر اصلی |
| [`DOMAIN_GLOSSARY_FA.md`](docs/DOMAIN_GLOSSARY_FA.md)       | واژه‌های canonical دامنه                 |
| [`MEMORY_TAXONOMY_FA.md`](docs/MEMORY_TAXONOMY_FA.md)       | طبقه‌بندی حافظه و governed retrieval     |
| [`THREAT_MODEL_FA.md`](docs/THREAT_MODEL_FA.md)             | تهدیدها و کنترل‌های امنیتی               |
| [`CORE_SELECTION_ADR_FA.md`](docs/CORE_SELECTION_ADR_FA.md) | ADR انتخاب TypeScript Core               |
