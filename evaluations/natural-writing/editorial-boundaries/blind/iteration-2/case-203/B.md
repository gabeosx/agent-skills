# Decision: Use SQLite for the offline archive viewer

## Context

The viewer must operate without connectivity for up to 72 hours. It stores at most 2 GB on one laptop and has one writer process.

## Considered alternatives

- A remote search service cannot meet the offline requirement.
- Plain JSON files would require rebuilding indexes for every search.
- Embedded SQLite supports local indexed queries without a separate service.

## Decision

Use an embedded SQLite database. Use transactions to prevent partial commits of import batches.

## Consequences

Search remains available offline, and deployments do not need a separate database service. Only one writer is supported. Backups are copied while the app is closed; live backup has not been implemented.

## Revisit condition

Reconsider storage if multiple writers become necessary or local data grows beyond 2 GB.
