## Recommendation: Hold release pending confirmation

The retrieval feature has not met its release criteria. Approval requires at least 5/6 correct answers on the reserved confirmation set and no answer-text leakage. That set has not been run, so the UI's “ready to ship” status is unsupported.

## Evidence so far

Candidate A answered 7/10 development queries correctly in its first run, at a measured cost of $8. A later audit found answer text in the test index, invalidating the comparison as evidence of retrieval quality. Retain the result as invalid in the register, together with its cost; it cannot support a release decision.

Candidate B rebuilt the index without the answer text. Its first clean development run answered 6/10 correctly and cost $11. After prompt changes, a targeted replay answered 8/10 at an additional cost of $5. Those were the same practiced queries, so the replay does not establish performance on fresh queries. Total measured test cost across the recorded runs is $24, including the invalid run.

## Required next step

Run the reserved six-query confirmation set against the proposed release candidate and verify that its index contains no answer-text leakage. Record the outcome separately from development and replay results. Release remains pending until both criteria are met; the current evidence supports further evaluation, not readiness.
