# Write to a temporary file so a crash cannot leave state.json partially written.
# Atomic replacement lets readers see either the old file or the complete new file.
# Rename alone does not guarantee survival of a power loss; durability depends
# on flush behavior.
