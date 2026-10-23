# Migrate stock to Brindle

1. Export a backup before migrating.
2. Under **Import**, choose **CSV**. Include comments in the **Comment** column to import them.
3. Preview the item and quantity rows.
4. On the **Apply** screen, confirm that the destination workspace name is correct. Apply only to the intended workspace: **applying cannot be undone**.

CSV import creates opening quantities, not past transactions. Opening quantities do not retain source lot labels or expiry dates, and later receipts do not retroactively identify those opening units. Keep the source records for recalls and expiry tracking of opening stock.
