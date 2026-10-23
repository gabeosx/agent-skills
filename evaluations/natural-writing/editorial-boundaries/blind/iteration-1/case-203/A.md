# ADR: Use SQLite for local archive storage

## Context

The offline archive viewer must run for up to 72 hours without connectivity. It stores at most 2 GB on one laptop and has one writer process.

## Considered alternatives

- A remote search service cannot support the required offline operation.
- Plain JSON files would require rebuilding indexes for every search.
- An embedded SQLite database provides local indexed queries without a separate service.

## Decision

Use SQLite. Transactions protect each batch of imports from partial commit.

## Consequences

The viewer can query local indexes while offline. Only one writer is supported. Backups must be copied while the app is closed; a live-backup mechanism has not been implemented.

## Revisit condition

Reconsider storage if multiple writers become necessary or local data grows beyond 2 GB.
