# Send tonight’s Evening East manifest

Tonight’s batch contains 24 shipments. Check the receiving team’s copy after sending; the green **Request accepted** message confirms only that the request entered the queue.

1. Open **Shipments** and select **Evening East**.
2. Click **Send manifest**.
3. Set **Destination** to **East review**, then click **Send**.
4. Open **Review desk > East review > Incoming**. Find the **Evening East** row and check both values:
   - **Status = Ready**
   - **Shipments = 24**

These values confirm that the receiving team’s copy is ready with all 24 shipments. A **Request accepted** toast alone does not confirm delivery.

## If the receiving copy is not ready

If the row shows **Status = Destination paused**:

1. Open **Review desk > East review > Settings**.
2. Switch **Receiving** from **Paused** to **Active**.
3. Return to **Shipments** and send **Evening East** again, with **Destination = East review**. Resending replaces the pending copy; it does not create a duplicate.
4. Return to **Review desk > East review > Incoming** and check that **Evening East** shows **Status = Ready** and **Shipments = 24**.

For any other failed status, there is no documented operator remedy. If the row is missing or does not show the required values, delivery has not been confirmed by this check; the supplied instructions give no further recovery procedure for that situation.

## Partner archive copy: unverified

The handover says East review should also receive a second copy in a partner’s archive. No archive address, inspection method, or recovery procedure has been supplied. This guide cannot verify or recover that copy. Record its outcome as **unverified**; neither the queue message nor the receiving team’s ready copy proves that the partner copy succeeded or failed.
