// Benchmark adapters transport inputs; they do not solve tasks. Keep the legacy
// taskName argument for callers, but never branch on a task ID or intent family.
// Quoted goal literals are legitimate caller text, not hidden evaluator data.
export function suppliedValuesForGoal(_taskName, goal) {
  if (typeof goal !== 'string') throw new TypeError('Goal must be text');
  const literals = [...goal.matchAll(/"([^"\r\n]+)"|“([^”\r\n]+)”/g)]
    .map(match => match[1] ?? match[2]);
  return Object.fromEntries([...new Set(literals)].map((value,index)=>[`literal${index+1}`,value]));
}
