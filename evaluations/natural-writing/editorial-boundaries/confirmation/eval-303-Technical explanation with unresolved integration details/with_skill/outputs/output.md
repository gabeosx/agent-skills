# Integrating record exports

Record exports run as jobs. A client submits a workspace identifier and a date range; an accepted request returns a job identifier. A worker reads matching records and writes an export file. The client uses the job identifier to check status.

The documented states are `queued`, `running`, `complete`, and `failed`. A complete job provides a download link, while a failed job includes an error summary. Files are retained for seven days after completion. Download-link validity is a separate unresolved detail: the record does not establish whether an individual link expires before the file is removed. Cancellation is outside the initial scope.

Several parts of the production integration contract still need decisions. Authentication and authorization are unspecified, including the authentication scheme, token format, permission names, and permission behavior. The suggestion to reuse normal account checks is a planning note, not an approved access contract. Maximum date ranges and export size limits also remain unapproved.

Failure handling needs definition before callers can implement reliable retry behavior. Worker retries have been proposed, but the record specifies no retry count, backoff schedule, or retryable errors. It also gives no client retry rule and does not establish whether repeated submissions create separate jobs or return the same job. Callers therefore cannot assume that resubmission is deduplicated or that worker failures will be retried automatically.

Dependency setup is similarly open: no storage vendor, client package, version, installation command, or environment variable has been selected. Production integration needs these choices, the access rules, capacity limits, link lifetime, and retry semantics resolved. The current record supports designing the request-and-status workflow, but it does not yet supply a complete production contract.
