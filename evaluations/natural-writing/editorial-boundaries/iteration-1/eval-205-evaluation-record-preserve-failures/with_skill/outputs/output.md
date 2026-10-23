# Retrieval release evaluation

The feature is not ready for release. The required confirmation evaluation has not been run, and the UI's “ready to ship” label is unsupported by the register.

## Evidence to date

Candidate A answered 7 of 10 development queries correctly on its first run, at a measured test cost of $8. An audit later found answer text in the test index. That leakage invalidates the comparison as evidence of retrieval quality. Keep the result in the register, marked invalid, along with its cost.

Candidate B rebuilt the index without answer text. Its first clean development run answered 6 of 10 queries correctly and cost $11. After prompt changes, a targeted replay reached 8 of 10 at an additional cost of $5. Those were the same practiced queries, so the replay cannot establish performance on fresh queries. Total recorded test cost is $24, including the invalid run.

## Recommendation

Hold release and correct the UI status. Run the reserved six-query confirmation set against the candidate proposed for release and verify that there is no answer-text leakage. Release requires at least 5 of 6 correct answers and no leakage; neither the practiced-query replay nor the invalid Candidate A result satisfies that gate.
