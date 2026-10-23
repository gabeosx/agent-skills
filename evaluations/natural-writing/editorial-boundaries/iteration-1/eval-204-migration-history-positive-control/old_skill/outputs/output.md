# Migrate from Packetline 1.x to 2.0

## Update configuration

Replace `endpoint` with `destination_url`. Packetline 2.0 rejects `endpoint`.

Move the API key from the configuration file into the `PACKETLINE_TOKEN` environment variable, then remove the key from the file. Version 2.0 deliberately prevents new API keys from being saved in configuration files.

## Back up before importing

Stop Packetline and copy the queue directory before the first import into 2.0.

Version 2.0 can read 1.x queue files, but importing them upgrades their format. Packetline 1.x cannot read the upgraded files, and there is no automatic downgrade.

## Roll back if needed

1. Stop Packetline 2.0.
2. Restore the pre-import copy of the queue directory.
3. Launch Packetline 1.x.

Keep the pre-import backup available for any rollback.
