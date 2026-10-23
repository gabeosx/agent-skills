## Export retries, authentication and cache configuration

Failed export requests are retried automatically. The release notes do not specify the retry count, backoff interval or behavior after retries are exhausted.

The authentication protocol is unspecified in the available notes. Confirm the required protocol before configuring export credentials.

`CACHE_URL` remains an accepted configuration setting. Its backend and whether it is required are undocumented in these notes; removal of the experimental Redis dependency does not resolve either question.

No load-test or reliability results are provided, so the notes do not establish production readiness.
