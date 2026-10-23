# Duplicate invoice notifications on 8 August

Between 09:10 and 10:05 UTC, 312 accounts received one extra invoice notification. The ledger and invoices remained correct, and no account received an extra charge. Reconciliation of the incident window found no missed notifications. Support finished contacting the affected accounts at 11:40, explaining that invoice amounts and payment status had not changed.

The duplication followed the 08:55 deployment of a second notification worker. Both workers could select the same pending rows because selecting and claiming work were separate operations. A worker marked a row as sent only after the external send returned, leaving time for the other worker to select and send the same notification.

The deployment checklist checked queue depth and successful sends, but did not test two workers processing the same account concurrently. It therefore did not exercise the condition that caused this incident.

Support reported repeated emails at 09:22. At 09:28, engineering reduced each worker's batch size from 100 to 10, assuming that large batches caused the overlap. Duplicates continued because a smaller batch still allowed simultaneous selection of the same row. The mitigation changed the amount of work selected without changing how workers claimed it.

At 09:46, engineering paused the second worker. The remaining worker drained already claimed work, and by 10:05 no new duplicates were observed.

Engineering is preparing a fix that claims pending rows atomically before sending. Claims will expire so that abandoned work can be recovered. This fix has not been deployed. Before deployment, engineering owns a concurrency test with two workers and a recovery test for expired claims. The operations lead owns adding a two-worker check to the deployment checklist. Completion dates have not been set.

The proposed monitoring would alert on repeated notification identifiers for an account within the sending window. Its threshold and owner still need agreement. The immediate follow-up is to complete and verify the claim change, update the checklist, and settle those monitoring decisions before treating the preventive work as complete.
