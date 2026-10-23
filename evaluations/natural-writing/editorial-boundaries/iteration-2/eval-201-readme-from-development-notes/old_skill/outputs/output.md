# Harbor Queue

Harbor Queue accepts CSV files and delivers their rows to a configured HTTPS endpoint. It requires Python 3.12 and PostgreSQL 16, with PostgreSQL running as an external service.

## Quick start

Install Harbor Queue:

```sh
pip install harbor-queue
```

Set the database connection and destination endpoint, then ingest a CSV file:

```sh
export DATABASE_URL="<PostgreSQL connection URL>"
export DESTINATION_URL="<HTTPS endpoint URL>"
harbor-queue ingest orders.csv
```

For endpoint authentication, supply the configured `Authorization` header value.

Delivery is **at least once**: a row may arrive more than once. Consumers must deduplicate rows using the supplied `delivery_id`; delivery is not exactly once.

Files over 25 MB are rejected without importing any of their rows.
