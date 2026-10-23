### Export retries, authentication and cache configuration

Failed export requests now receive automatic retry handling. The release notes do not specify the retry count, backoff interval or what happens after retries are exhausted.

Authentication was refactored, but the notes do not identify the authentication protocol or describe its configuration.

`CACHE_URL` remains an accepted configuration setting. Its backend and whether it is required are unspecified. The experimental Redis dependency was removed; this does not establish what backend `CACHE_URL` uses.

The notes include no load-test or reliability results supporting a production-readiness claim.
