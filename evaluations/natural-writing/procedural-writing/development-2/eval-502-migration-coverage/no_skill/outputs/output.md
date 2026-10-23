# Migrate stock by CSV

Before migrating, export a backup. **Applying a migration cannot be undone.**

1. Under **Import**, choose **CSV**. Comments can be imported in the **Comment** column.
2. Preview the item and quantity rows.
3. On the **Apply** screen, confirm the destination workspace name before selecting **Apply**.

CSV import creates opening quantities, not past transactions. Opening quantities do not retain source lot labels or expiry dates, and later receipts do not retroactively identify those opening units. Keep the source records for recalls and expiry tracking of opening stock.
