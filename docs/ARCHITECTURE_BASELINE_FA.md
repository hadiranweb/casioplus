# معماری baseline Casioplus

## تصمیم اصلی

برای MVP، Casioplus با یک Core یکپارچهٔ TypeScript/Node.js و PostgreSQL ساخته می‌شود. PostgreSQL منبع حقیقت Work، Flow، Run، WorkCommit، Review، Memory، Actor، Organization و Artifact metadata است. Rust از critical path خارج است و فقط در آینده و پس از اثبات سود قابل‌اندازه‌گیری می‌تواند به‌عنوان Worker تخصصی بازگردد.

## boundaryها

App و Studio دو surface محصول هستند. App محل مصرف و مشاهدهٔ Work، Flow publication، ProcessRun، Review و Memory است. Studio محل ساخت و حکمرانی Flow، فرم، policy، version و publication است. هر دو در MVP می‌توانند از یک web host-aware و Core/API مشترک استفاده کنند، ولی route و permission آن‌ها جداست.

Core/API تنها مرجع mutation canonical است. Worker، n8n، Open WebUI و OpenClaw از API یا event contract استفاده می‌کنند و direct database credential ندارند. n8n فقط orchestrator، Open WebUI فقط interaction/model plane و OpenClaw فقط restricted action plane با allowlist و approval است.

## domain vocabulary

نام‌های حافظه از taxonomy علمی استفاده می‌کنند: `OperationalEvent`، `SemanticRecord`، `KnowledgeClaim`، `KnowledgeReview`، `KnowledgePromotion`، `OrganizationalMemoryItem`، `EvidenceSource` و `Provenance`. `WorkCommit` ثبت نتیجهٔ حکمرانی‌شدهٔ یک Work/Run است و با Git commit فنی یکی نیست.

## مسیر Golden Flow

```text
App user
  → WorkItem
  → Studio FlowDefinition + FlowVersion
  → ProcessRun
  → Native Diagnosis Worker
  → RuntimeEvent + WorkCommit
  → Review
  → MemoryItem
  → App Timeline / Governed Retrieval
```

## قواعد جلوگیری از debt

هیچ feature جدیدی بدون owner canonical، tenant scope، schema/contract، idempotency، test و rollback plan پذیرفته نمی‌شود. هیچ Runtime یا مدل AI مجاز به promotion مستقیم Memory نیست. هر failure باید با وضعیت صادقانه، correlation ID و audit قابل‌ردگیری باشد.
