// Wait for rendered accessibility evidence, not network idleness or site rules.
// Ref allocation can change between captures without changing the visible page.
export function observationSignature(data) {
  return String(data.snapshot ?? '').replace(/\bref=e\d+\b/g, 'ref');
}

export async function settledObservation({capture, wait, now = () => performance.now(),
  signal, minimumMs = 2000, quietMs = 1000, maximumMs = 6000, intervalMs = 250}) {
  const start = now();
  let data = await capture(), signature = observationSignature(data), changed = now();
  while (now() - start < maximumMs) {
    signal?.throwIfAborted();
    if (now() - start >= minimumMs && now() - changed >= quietMs) break;
    await wait(Math.min(intervalMs, maximumMs - (now() - start)));
    signal?.throwIfAborted();
    const next = await capture(), nextSignature = observationSignature(next);
    if (nextSignature !== signature) changed = now();
    data = next; signature = nextSignature;
  }
  return data;
}
