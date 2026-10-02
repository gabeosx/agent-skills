// Missing cleanup is unknown, never evidence that a resource closed.
export function allResourcesClosed(trials, qualification = false) {
  const closed = receipt => receipt?.browserClosed === true && receipt?.serverClosed === true;
  return trials.length > 0 && trials.every(trial =>
    closed(trial.cleanup) && (!qualification || (trial.restored === true && closed(trial.restoredCleanup)))
  );
}
