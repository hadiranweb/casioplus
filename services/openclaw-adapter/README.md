# OpenClaw Adapter

این adapter تنها مسیر actionهای محدود OpenClaw است. فهرست actionها allowlisted است، سرویس private می‌ماند و actionهای دارای side effect پیش از approval اجرا نمی‌شوند. هر request و result باید به Organization، Workspace، Actor، ProcessRun و idempotency key متصل و از مسیر Core/API ثبت شود.
