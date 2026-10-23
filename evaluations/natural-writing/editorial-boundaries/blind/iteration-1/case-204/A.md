# Migrate from Packetline 1.x to 2.0

## Update configuration

Replace `endpoint` with `destination_url`. Version 2.0 rejects the old field.

Move your API key from the configuration file into the `PACKETLINE_TOKEN` environment variable, then remove it from the file. Version 2.0 deliberately prevents new API keys from being saved in configuration files.

## Back up before importing

Stop Packetline and copy the queue directory before the first import into 2.0.

Version 2.0 can read 1.x queue files, but importing them upgrades their format. Version 1.x cannot read the upgraded files, and there is no automatic downgrade.

## Roll back

Stop Packetline 2.0. Restore the pre-import queue directory copy before launching 1.x.
