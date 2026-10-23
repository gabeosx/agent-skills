# Write to a temporary file and replace state.json atomically so readers see
# either the old file or the new complete file, never a partial write.
# Atomic replacement alone does not guarantee survival of a power loss;
# durability depends on flush behavior.
