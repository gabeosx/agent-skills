## Recommendation: hold release

The retrieval feature has not met the release criteria. The separate six-query confirmation set remains unrun; release requires at least 5/6 correct on that set and no answer-text leakage. The UI's “ready to ship” label is ahead of the evidence and should be corrected.

## Evidence so far

Candidate A answered 7/10 development queries correctly in its first run, at a measured test cost of $8. A later audit found answer text in the test index, invalidating the comparison as evidence of retrieval quality. Keep the result in the register, marked invalid, along with its cost.

Candidate B rebuilt the index without answer text. Its first clean development run scored 6/10 and cost $11. After prompt changes, a targeted replay scored 8/10 on the same practiced queries, costing another $5. That result can inform development, but it is not a fresh-query evaluation and does not establish performance on the reserved set. Measured test spending totals $24, including the invalid run.

## Next step

Evaluate the release candidate on the reserved confirmation set and verify that the index contains no answer-text leakage. Review those results against both release requirements before changing the recommendation or restoring a readiness claim.
