# BrightCart commercial intelligence dashboard

A grocery chain's pricing lead opens BrightCart Monday morning to spot margin leaks and decide which department to investigate. Build a working dashboard with a meaningful trend, current KPIs, and a readable department table. Use the exact synthetic dataset below.

| Period | Sales | Gross margin | Stockout rate |
|---|---:|---:|---:|
| 30 days | $1.28M | 24.8% | 3.1% |
| 7 days | $318K | 22.4% | 4.2% |

Weekly gross margins, oldest first, are 25.1%, 26.0%, 25.7%, 24.9%, 24.3%, 23.8%, 22.4%. Indicate the direction and give the visual a readable text equivalent with units. Show all seven in the default 30-day view; in the 7-day view emphasize the latest week with context rather than inventing data.

| Department | 30d sales | 30d margin | 7d sales | 7d margin | 7d status |
|---|---:|---:|---:|---:|---|
| Produce | $405K | 20.2% | $95K | 18.1% | Investigate |
| Grocery | $532K | 28.1% | $130K | 27.0% | On track |
| Frozen | $204K | 25.2% | $54K | 22.3% | Watch |
| Bakery | $139K | 25.1% | $39K | 19.4% | Investigate |

Switching period updates KPI and row values. The status filter shows only the two Investigate departments and can be reset. Clicking Produce reveals a readable detail view with "Supplier costs" and the selected period margin. Provide a way back to the overview. Keep department names, status text and one key figure reachable on mobile. Test at widths 1440, 834 and 390. No backend.

Stable hooks: period (select values 30, 7), revenue, margin, rows (container with row content), status (select values all, investigate), produce (row action), detail, detail-close. Empty starting directory.
