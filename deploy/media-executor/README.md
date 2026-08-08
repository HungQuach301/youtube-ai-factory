# Media Executor deployment contract

Deploy this image as a Google Cloud Run Job, not as an audience-facing web service.
Each task heartbeats, claims at most one durable media job, performs the bounded
transform, stores evidence through the Factory API and exits.

Required runtime secrets:

- `FACTORY_SITE_AUTH_TOKEN`: transport credential for the private Factory.
- `MEDIA_EXECUTOR_SHARED_SECRET`: capability credential validated by Stage 09.

Required runtime configuration:

- `FACTORY_BASE_URL`: canonical Factory URL.
- `MEDIA_EXECUTOR_ID`: stable worker identity for heartbeat and lease ownership.

Production policy:

- task timeout: 15 minutes;
- Cloud Run task retries: 0 (the D1 lease owns the single bounded recovery);
- one job per task;
- start with one task for the MP-001 root-cause proof;
- increase tasks only after source-frame, composite and 30-second sequence gates pass;
- store both credentials in Secret Manager and never in image layers or command history.
