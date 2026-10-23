# Migrate from Packetline 1.x to 2.0

## Before the first import

1. Stop Packetline and copy the queue directory. Keep this pre-import copy for rollback.
2. Replace `endpoint` with `destination_url` in your configuration. Version 2.0 rejects `endpoint`.
3. Move your API key to the `PACKETLINE_TOKEN` environment variable and remove it from the configuration file. Version 2.0 deliberately prevents new API keys from being saved in configuration files.

## Import existing queues

Version 2.0 can read 1.x queue files, but importing them upgrades their format. Packetline 1.x cannot read the upgraded files.

## Roll back to 1.x

Stop 2.0, restore the pre-import queue directory copy, then launch 1.x. There is no automatic downgrade; rollback requires the saved copy.
