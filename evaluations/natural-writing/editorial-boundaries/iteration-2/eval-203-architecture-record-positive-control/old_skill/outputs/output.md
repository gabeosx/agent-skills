# ADR: Use SQLite for the offline archive

## Context

The archive viewer must operate for up to 72 hours without connectivity. It stores at most 2 GB on one laptop and has one writer process.

## Considered alternatives

- A remote search service cannot meet the offline requirement.
- Plain JSON files would require rebuilding indexes for every search.
- An embedded SQLite database provides local indexed queries without a separate service.

## Decision

Use SQLite. Its indexed queries meet the local search requirement, and transactions protect batches of imports from partial commit.

## Consequences

Storage and search remain available without connectivity or a separate database service. Only one writer is supported. Backups must be copied while the app is closed; a live-backup mechanism has not been implemented.

## Revisit condition

Reconsider storage if multiple writers become necessary or local data grows beyond 2 GB.
