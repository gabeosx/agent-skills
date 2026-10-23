# Migrate Packetline 1.x to 2.0

## Update configuration

Replace `endpoint` with `destination_url`. Version 2.0 rejects `endpoint`.

Move the API key from the configuration file into the `PACKETLINE_TOKEN` environment variable, then remove the key from the file. This change deliberately prevents new API keys from being saved in configuration files.

## Back up before importing

Stop Packetline and copy the queue directory **before the first import into 2.0**.

Version 2.0 can read 1.x queue files, but importing them upgrades their format. Version 1.x cannot read the upgraded files, and no automatic downgrade exists. Keep the pre-import directory copy if you may need to roll back.

## Roll back

1. Stop Packetline 2.0.
2. Restore the pre-import queue directory copy.
3. Launch Packetline 1.x.
