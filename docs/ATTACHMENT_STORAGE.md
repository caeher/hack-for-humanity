# Clinical Attachment Storage

## Decision

CRI uses **Convex native file storage** (`ctx.storage.generateUploadUrl` + `ctx.storage.getUrl`) for clinical encounter and secure message attachments.

We evaluated an encapsulated storage component (`@convex-dev/storage` / R2) but chose built-in Convex storage because:

- Attachments are tightly coupled to Convex metadata, consent, and audit tables.
- Upload and download authorization already run in Convex mutations/queries.
- Short-lived signed URLs are provided without exposing permanent public links.
- No additional infrastructure or secrets are required for the demo deployment.

## Security model

1. **Upload**: `attachments.generateUploadUrl` validates type, size, count, filename, and care-team access, then returns a one-hour upload URL. The client uploads bytes directly to Convex storage.
2. **Finalize**: `attachments.finalizeUpload` binds `storageId`, runs a heuristic malware gate, and audits the outcome. Quarantined files remain metadata-only from the user's perspective.
3. **Download**: `attachments.getDownloadUrl` re-checks consent/RBAC and only issues a ~15-minute URL when `scanStatus=clean`.
4. **Cleanup**: `attachments.cleanupOrphanedUploads` (hourly cron) idempotently removes expired pending uploads, failed blobs, and records past org retention.

## Malware scanning

This environment implements **heuristic quarantine** (blocked MIME classes, extension/MIME mismatch, suspicious filenames). Production should wire `runHeuristicMalwareScan` to a real AV pipeline (e.g. ClamAV via internal action) before marking attachments `clean`.

## No permanent public URLs

Storage IDs are never returned to clients as durable links. Only short-lived URLs from authorized mutations are exposed.
