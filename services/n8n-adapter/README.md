# n8n Adapter

این adapter تنها مرز ارتباط Casioplus با n8n است. n8n orchestrator باقی می‌ماند و مالک Work، Flow، ProcessRun، Commit یا Memory نیست. dispatch و callback باید با event contract نسخه‌دار، HMAC، timestamp، replay protection، correlation ID و idempotency انجام شوند.
