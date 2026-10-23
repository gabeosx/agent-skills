# Duplicate invoice notifications: 8 August

Between 09:10 and 10:05 UTC, 312 accounts received one extra invoice notification. The ledger and invoices remained correct, and no account received an extra charge. Reconciliation of the incident window found no missed notification. Support finished notifying affected accounts at 11:40, explaining that invoice amounts and payment status had not changed.

## Cause and response

The 08:55 deployment added a second notification worker. The deployment checklist covered queue depth and successful sends, but did not test two workers processing the same account concurrently.

At 09:10, both workers began selecting the same pending rows. Selecting and claiming a row were separate operations, and each worker marked a row sent only after the external send returned. This allowed both workers to select and send the same notification before either marked it sent.

Support reported repeated emails at 09:22. At 09:28, engineering reduced each worker's batch size from 100 to 10, assuming large batches caused the overlap. Duplicates continued because smaller batches did not prevent simultaneous selection of the same row. The mitigation changed how many rows a worker selected without closing the gap between selection and claiming.

At 09:46, engineering paused the second worker. The remaining worker drained already claimed work. By 10:05, no new duplicates were observed. Pausing the worker contained the incident; it did not correct the concurrency flaw.

## Prevention and outstanding decisions

Engineering is preparing a fix that claims pending rows atomically before sending. Claim expiry will allow abandoned work to be recovered. This fix has not been deployed, so the proposed prevention still needs validation.

Before deployment, engineering owns a concurrency test using two workers and a recovery test for expired claims. The operations lead owns adding a two-worker check to the deployment checklist. No completion dates have been set for these actions.

The proposed monitoring would alert on repeated notification identifiers for an account within the sending window. Its threshold and owner still need agreement. Until those decisions are made and the alert is implemented, the proposal should not be treated as an active detection control.
