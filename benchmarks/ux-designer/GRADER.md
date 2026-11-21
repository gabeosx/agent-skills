# Independent grading instructions

Your assignment is judgment only. Read this file, the rubric and the randomized packets at the supplied path. Open the actual screenshot pixels for each output at desktop, tablet and mobile, and inspect relevant post-interaction captures. Use the brief and functional evidence to assess task fit. If an essential point remains unclear, report what to inspect. Do not infer implementation quality from test success alone. Avoid browsing beyond the packet, reading workspace history or resolving output identities. Do not edit sources, screenshots or tests.

Write one file named `grades.json` in the packet root. Its top-level `tasks` object is keyed by task directory name, with this structure for each task:

```json
{
  "outputs": {
    "<anonymous-id>": {
      "dimensions": {
        "A": {"score": 0, "rationale": "", "strengths": [], "defects": [], "opportunity": ""}
      },
      "total": 0,
      "visual_problems": ["", "", ""],
      "effective_decisions": ["", "", ""],
      "blockers": []
    }
  },
  "pairs": [
    {"ids": ["<first-id>", "<second-id>"], "preference": "tie", "confidence": "low", "rationale": ""}
  ]
}
```

Include all six dimensions A–F and give honest scores. The examples above are structural placeholders. Fill every evidence field with concise, concrete observations. For an output that does not have essential screen pixels, add a `missing_evidence` string and set `total` to null. Include a `missing` flag on a pair when evidence makes a valid comparison impossible. Write each task as you finish to protect completed evidence. Your final response should state paths, count of completed tasks and any evidence gaps.
