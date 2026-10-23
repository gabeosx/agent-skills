# Harbor Queue

Harbor Queue accepts CSV files and delivers their rows to a configured HTTPS endpoint. It requires Python 3.12 and PostgreSQL 16, with PostgreSQL running as an external service.

## Quick start

Install Harbor Queue:

```sh
pip install harbor-queue
```

Set `DATABASE_URL` to your PostgreSQL connection URL and `DESTINATION_URL` to the receiving HTTPS endpoint. Supply the endpoint's credentials as the configured `Authorization` header value.

Import a CSV file:

```sh
harbor-queue ingest orders.csv
```

## Delivery and file limits

Delivery is at least once: a row may arrive more than once. Consumers must deduplicate rows using the supplied `delivery_id`; Harbor Queue does not guarantee exactly-once delivery.

Files over 25 MB are rejected without importing any rows.
