# Harbor Queue

Harbor Queue accepts CSV files and delivers their rows to a configured HTTPS endpoint.

## Quick start

You need Python 3.12 and a PostgreSQL 16 service.

1. Install Harbor Queue:

   ```sh
   pip install harbor-queue
   ```

2. Set `DATABASE_URL` to your PostgreSQL connection URL and `DESTINATION_URL` to your HTTPS endpoint. Configure the `Authorization` header with the credential value your endpoint requires.

3. Import a CSV file:

   ```sh
   harbor-queue ingest orders.csv
   ```

Delivery is at least once: a row may arrive more than once. Consumers must use the supplied `delivery_id` to deduplicate rows.

Files over 25 MB are rejected without importing any rows from the file.
