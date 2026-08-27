# گزارش وضعیت Release Readiness — Casioplus

**وضعیت کلی:** MVP قابل‌توسعه و قابل‌اعتبارسنجی در repository عمومی آماده است، اما هنوز production deployment عملی روی Liara انجام نشده است. معیار این گزارش تفکیک دقیق بین «کد و pipeline سبز» و «سرویس production با resource و secret واقعی» است.

## source of truth

Repository محلی `/home/ubuntu/casioplus` روی branch `main` تمیز است و آخرین commit آن `b77edb7e9b64045a2473104cb9d41c9e102315e9` است. همین SHA در `hadiranweb/casioplus` روی `main` قرار دارد. repository جدید اکنون ۱۳ commit منطقی دارد و هیچ token یا environment credential در آن commit نشده است.

## آنچه اکنون واقعاً ساخته شده است

| حوزه                | وضعیت                       | شواهد                                                                                                                                           |
| ------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| معماری و scope      | تکمیل                       | `MVP_CHARTER_FA.md`، `GOLDEN_FLOW_FA.md`، `DOMAIN_GLOSSARY_FA.md` و `ARCHITECTURE_BASELINE_FA.md`                                               |
| Core/API            | فعال در مسیر vertical slice | TypeScript/Node.js، PostgreSQL، session امضاشده، membership enforcement، CORS allowlist، correlation ID و request logging بدون body/token       |
| canonical lifecycle | فعال                        | WorkItem، Flow/FlowVersion، ProcessRun، RuntimeEvent، Artifact metadata، SemanticRecord، KnowledgeClaim، Review، Promotion و governed retrieval |
| Native runtime      | فعال و مستقل                | HTTP server با HMAC، body limit، schema validation، health و execute؛ بدون direct database access                                               |
| App surface         | build‌شده، non-public       | Vite/React dashboard فارسی‌اول برای Work، Run، Artifact و Memory                                                                                |
| Studio surface      | build‌شده، non-public       | Vite/React authoring/governance surface برای Flow، version، runtime binding و publication                                                       |
| runtime boundaries  | قراردادهای MVP موجود        | n8n orchestrator-only، Open WebUI interaction/model-plane و OpenClaw allowlisted/approval-gated                                                 |
| migrations          | production-oriented         | migrationهای ordered با registry، SHA-256 checksum، drift detection و idempotent rerun                                                          |
| CI/CD               | فعال در GitHub              | CI با PostgreSQL service و build همهٔ unitها؛ deploy workflow با staging و production gate                                                      |

## شواهد validation محلی

فرمان‌های زیر در آخرین دور validation موفق اجرا شدند: `pnpm format:check`، `pnpm check`، `pnpm test`، `pnpm validate:topology` و `pnpm build`. آخرین اجرای unit test محلی شامل **۷ فایل تست و ۲۷ تست موفق** بود. Golden Flow واقعی نیز روی PostgreSQL محلی اجرا شد و از signed Bearer session، ایجاد FlowVersion، ساخت و شروع ProcessRun، اجرای built Native Worker، ثبت `diagnosis.completed`، ثبت Artifact، دو SemanticRecord، KnowledgeClaim، Review، Promotion و governed search عبور کرد.

Migration smoke روی database تمیز و اجرای مجدد آن با checksum registry موفق است. Native Worker built-artifact smoke نیز health، HMAC نامعتبر و execution معتبر را آزموده است. خطاهای transient اتصال در حلقهٔ انتظار smoke صرفاً مربوط به startup محلی بودند و در پایان همان smoke، status رسمی `GOLDEN_FLOW_STATUS=passed` ثبت شد.

## شواهد GitHub Actions

پس از آخرین push، اجرای CI برای commit `b77edb7` با conclusion موفق پایان یافت. اجرای `Deploy to Liara` برای همان commit نیز با conclusion موفق پایان یافت، اما دلیل موفقیت آن فعال‌نبودن عمدی deployment gate است؛ تا زمانی که repository variable به نام `LIARA_DEPLOY_ENABLED` روی `true` تنظیم نشود، jobهای deploy skip می‌شوند. این رفتار در وضعیت فعلی مطلوب است و از تلاش برای deploy با app name یا secret ناقص جلوگیری می‌کند.

| workflow          | آخرین وضعیت مشاهده‌شده              | تفسیر                                                         |
| ----------------- | ----------------------------------- | ------------------------------------------------------------- |
| `CI`              | success                             | code، tests، migration smoke و build pipeline سبز است         |
| `Deploy to Liara` | success با deployment jobs skip‌شده | workflow معتبر است، ولی Liara deploy هنوز عمداً فعال نشده است |

## کارهای باقی‌مانده تا production واقعی

پیش از فعال‌کردن gate باید چهار app مستقل Liara برای Core، Worker، App و Studio ساخته شوند و PostgreSQL canonical، Redis، Object Storage، private network، domain و environment variables واقعی پیکربندی شوند. سپس secrets زیر باید در GitHub Environmentهای مناسب قرار گیرند: `LIARA_API_TOKEN`، `LIARA_CORE_APP`، `LIARA_WORKER_APP`، `LIARA_APP_WEB_APP` و `LIARA_STUDIO_WEB_APP`. `LIARA_DEPLOY_ENABLED` باید ابتدا برای staging فعال شود، نه production.

همچنین باید `DATABASE_URL`، `SESSION_SECRET`، `RUNTIME_SHARED_SECRET`، `NATIVE_WORKER_URL`، `CORS_ORIGINS` و `VITE_CORE_API_URL` با مقادیر staging تنظیم و بعد از health، tenant isolation، migration و Golden Flow از بیرون شبکهٔ deployment بررسی شوند. production فقط پس از approval Environment و ثبت rollback pointer فعال شود. Login/onboarding واقعی، artifact upload به Object Storage و queue/BullMQ هنوز بخشی از hardening بعدی هستند و نباید با session issuer محلی یا header bootstrap فعلی جایگزین شوند.

## تصمیم release

این repository برای ادامهٔ کار تیمی، branch protection و ساخت staging آماده است؛ برای اعلام «production-ready» هنوز زود است. گام بعدی عملیاتی، ساخت resourceهای Liara و اجرای یک deployment staging کنترل‌شده با secrets خارج از repository است. تا آن زمان، `main` باید منبع واحد کد بماند و هیچ credentialی در workflow، Dockerfile، frontend bundle یا commit قرار نگیرد.
