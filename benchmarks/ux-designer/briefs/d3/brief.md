# Sensory Bench product comparison

A lab manager needs to choose among three benchtop analyzers for high-throughput fragrance QA. Build a comparison interface prioritizing tradeoffs in dense specifications. Use the source values as written.

| Specification | Alder A2 | Birch X4 | Cedar Pro |
|---|---|---|---|
| Unit price | $12,400 | $16,900 | $19,200 |
| Runs per hour | 14 | 20 | 20 |
| Sample volume | 2 mL | 1 mL | 1 mL |
| Warm-up | 12 min | 10 min | 10 min |
| Export | CSV | CSV + API | CSV + API |
| Warranty | 2 years | 3 years | 5 years |
| Calibration | Weekly | Daily | Daily |
| Operating noise | 42 dBA | 38 dBA | 38 dBA |

Provide a differences-only toggle. With all three compared it keeps every differing row. Allow the operator to hide Alder A2, which must leave Birch and Cedar in context. With Alder hidden and differences-only enabled, preserve Unit price and Warranty and hide the common rows. Reset comparison restores all products and rows. Use a real semantic comparison table with row headers and clear model headers. Test widths 1440, 834 and 390. On narrow screens either preserve model/spec context through scoped table scrolling or make an equally usable comparison pattern. Include the source units and full row labels.

Stable hooks: differences (toggle), alder (toggle for hiding Alder), comparison (table), throughput (Runs per hour row), warranty (Warranty row), reset. Empty starting directory.
