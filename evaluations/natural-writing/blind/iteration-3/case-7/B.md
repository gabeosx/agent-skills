1. Run `deployctl status --env staging`.
2. Create a snapshot with `deployctl snapshot --label pre-release`.
3. Run `deployctl apply release.yaml --env staging`.
4. Check `/healthz` for HTTP 200. If `/healthz` is not HTTP 200 after 60 seconds, run `deployctl rollback --label pre-release`.
