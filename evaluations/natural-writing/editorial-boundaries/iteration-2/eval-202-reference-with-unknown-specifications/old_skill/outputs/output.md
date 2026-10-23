### Export retries, authentication and cache

Failed export requests now receive automatic retries. The release notes do not specify the retry count, backoff interval or behavior after retries are exhausted.

Authentication was refactored, but the notes do not identify the protocol or describe the resulting authentication behavior.

`CACHE_URL` remains an accepted configuration setting. Its backend and whether it is required are unspecified. The experimental Redis dependency was removed; this does not establish which backend the shipped cache configuration uses.

The notes include no load-test or reliability results to support a production-readiness claim.
