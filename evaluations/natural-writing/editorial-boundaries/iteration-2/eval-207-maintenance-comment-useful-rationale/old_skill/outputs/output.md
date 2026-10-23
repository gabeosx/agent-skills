# Write to a temporary file and atomically replace state.json so readers see
# either the old file or the complete new file, avoiding partial writes on a crash.
# Atomic rename alone does not guarantee survival of a power loss; durability
# depends on flush behavior.
