# Harbor Queue

Harbor Queue accepts CSV files and delivers their rows to a configured HTTPS endpoint. It requires Python 3.12 and an external PostgreSQL 16 service.

## Quick start

Install Harbor Queue:

```sh
pip install harbor-queue
```

Set `DATABASE_URL` to your PostgreSQL connection URL and `DESTINATION_URL` to the HTTPS endpoint that will receive rows. Configure the `Authorization` header with the credential value your endpoint requires.

Import a CSV file:

```sh
harbor-queue ingest orders.csv
```

Delivery is at least once: your endpoint may receive a row more than once. Deduplicate rows using the supplied `delivery_id`; delivery is not exactly once.

Files over 25 MB are rejected without partially importing their rows.
