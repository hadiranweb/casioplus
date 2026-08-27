# قرارداد CI/CD و استقرار Casioplus روی Liara

## تصمیم معماری

Casioplus یک monorepo باقی می‌ماند، اما هر deployment unit به‌صورت مستقل build و deploy می‌شود: `core-api`، `native-diagnosis-worker`، `app-web` و `studio-web`. PostgreSQL، Redis و Object Storage resourceهای زیرساختی هستند و درون runtimeهای AI یا adapterها credential مستقیم PostgreSQL قرار نمی‌گیرد.

این تفکیک با مدل استقرار Liara هم‌راستاست: workflow از GitHub Actions اجرا می‌شود، Dockerfile مربوط به همان unit را به CLI می‌دهد و نام app و token فقط از GitHub Environment secrets خوانده می‌شوند. مستندات رسمی Liara، PaaS API را برای مدیریت lifecycle، deployment، environment variables، domain و scale معرفی می‌کند.[1] CLI رسمی نیز `liara deploy` را با flagهای `--api-token`، `--app`، `--path`، `--platform`، `--dockerfile` و `--port` ارائه می‌دهد.[2]

## workflowها

فایل `.github/workflows/ci.yml` برای pull request و push به `main` اجرا می‌شود و frozen install، formatting، typecheck، test، topology، migration روی PostgreSQL سرویس‌شده و build همهٔ unitها را انجام می‌دهد. هیچ secret deploymentی در CI عادی لازم نیست.

فایل `.github/workflows/deploy.yml` پس از push به `main` validation را تکرار و deployment staging را برای چهار unit آغاز می‌کند. production فقط از `workflow_dispatch` با انتخاب `production` فعال می‌شود و به GitHub Environment محافظت‌شدهٔ production وابسته است. در نتیجه merge به `main` به‌تنهایی نباید production را تغییر دهد.

| Environment  | Trigger                            | Required secrets                                                                                     | Gate                            |
| ------------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------- |
| `staging`    | push به `main` یا dispatch staging | `LIARA_API_TOKEN`، `LIARA_CORE_APP`، `LIARA_WORKER_APP`، `LIARA_APP_WEB_APP`، `LIARA_STUDIO_WEB_APP` | CI سبز و Environment staging    |
| `production` | فقط dispatch با input production   | همان secrets در Environment production                                                               | approval محافظت‌شدهٔ production |

## prerequisites دستی پیش از اولین deploy

ابتدا باید چهار app مستقل Liara، PostgreSQL canonical، Redis و Object Storage ساخته شوند. سپس هر app باید port، environment variables و در صورت نیاز private network مشترک خود را دریافت کند. `DATABASE_URL` و `SESSION_SECRET` فقط برای Core، `RUNTIME_SHARED_SECRET` و `NATIVE_WORKER_PORT` فقط برای Worker، و `VITE_CORE_API_URL` برای build سطح‌های web تنظیم می‌شوند. مقدارهای واقعی نباید در GitHub repository، Dockerfile یا frontend bundle commit شوند.

برای Core، health check باید به `/healthz` متصل شود و release migration طبق policy کنترل‌شدهٔ تیم اجرا شود. برای Worker، endpoint فقط روی شبکهٔ private منتشر شود و `RUNTIME_SHARED_SECRET` حداقل ۳۲ کاراکتر تصادفی باشد. برای App و Studio، دامنه‌ها به‌ترتیب `app.casioplus.com` و `studio.casioplus.com` و `CORS_ORIGINS` در Core باید به‌صورت allowlist دقیق تنظیم شوند.

## rollback و evidence

قبل از promotion، commit SHA، خروجی CI، migration registry و health check هر چهار unit باید ثبت شوند. rollback با انتخاب release قبلی همان Liara app انجام می‌شود؛ migrationهای destructive تا زمانی که rollback policy و backup تأیید نشده ممنوع‌اند. شواهد مورد انتظار در `deployment/RELEASE_MANIFEST.yaml` ثبت شده‌اند، اما این repository هنوز با این workflowها deploy نشده است و آماده‌بودن کد با production readiness عملیاتی یکسان نیست.

## References

[1]: https://developers.liara.ir/pages/paas 'Liara PaaS API documentation'
[2]: https://github.com/liara-cloud/cli 'Liara CLI official repository and command reference'
