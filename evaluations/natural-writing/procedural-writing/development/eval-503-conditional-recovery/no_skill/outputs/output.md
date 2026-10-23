# Connect your shop to Larch

1. Open **Connections > Add shop** and authorize the desired shop.
2. Select **Import products**.
3. Open **Connections > Products** and review **Mapping status** for each row:
   - **Mapped:** The row is ready. Do not remap it.
   - **Unmatched:** Select **Link item** and choose the corresponding inventory item. If that item does not exist, ask the inventory lead to create it before linking the row.
4. Once all rows are mapped, press **Start sync**. Importing products does not start order sync.

## If something needs attention

- **Wrong shop:** Only if **Connections > Account** shows the wrong shop, select **Disconnect**, authorize the correct shop, and reimport products.
- **Expired authorization:** Only if sync status is **Authorization expired**, select **Reauthorize**. This is not a routine setup step.
