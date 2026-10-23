## Recommendation: hold release

The retrieval feature has not met its release criteria. Replace the UI's “ready to ship” status with wording that reflects the pending confirmation evaluation. Release requires at least 5/6 correct answers on the reserved confirmation set and no answer-text leakage.

## Evidence so far

Candidate A answered 7/10 development queries correctly in its first run, at a measured cost of $8. A later audit found answer text in the test index, invalidating the comparison as evidence of retrieval quality. Keep that result in the register, marked invalid, along with its cost; it cannot support a release decision.

Candidate B rebuilt the index without the answer text. Its first clean development run answered 6/10 queries correctly and cost $11. After prompt changes, a targeted replay answered 8/10 on the same practiced queries, adding $5 in cost. The replay shows performance on those queries after further development; it does not establish performance on fresh queries. Total measured test cost across these runs is $24, including the invalid run.

## Required next step

Run the separate six-query confirmation set, which remains unused, and verify that its index contains no answer-text leakage. Review that result against the stated release criteria before approving release. The development replay alone does not justify the current UI status.
