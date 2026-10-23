#!/usr/bin/env python3
"""Unblind persisted reviews and produce per-arm summaries without discarding failures."""
import argparse,json,hashlib,statistics
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('phase');a=p.parse_args();r=Path(__file__).resolve().parent
cases=json.loads((r/f'{a.phase}.json').read_text())['evals'];mapping=json.loads((r/f'blind-mapping-{a.phase}.json').read_text());summary={arm:dict(passed=0,total=0,critical=[],substantive=[],scores=[],preferred_cases=[]) for arm in ['with_skill','old_skill','no_skill']}
for c in cases:
 g=json.loads((r/'reviews'/a.phase/f"{c['id']}.json").read_text())
 for label,arm in mapping[str(c['id'])].items():
  v=g['labels'][label]; assert [e['text'] for e in v['expectations']]==c['assertions']
  assert (r/'blind'/a.phase/f"case-{c['id']}"/f'{label}.md').read_bytes()==(r/a.phase/f"eval-{c['id']}-{c['name']}"/arm/'outputs/output.md').read_bytes(), 'Reviewed output changed'
  s=summary[arm];s['passed']+=sum(e['passed'] for e in v['expectations']);s['total']+=len(v['expectations']);s['critical'] += [f"{c['id']}: {x}" for x in v['critical']];s['substantive'] += [f"{c['id']}: {x}" for x in v['substantive']];s['scores'].append(v['scores'])
  if label in g['preferred']:s['preferred_cases'].append(c['id'])
  run=r/a.phase/f"eval-{c['id']}-{c['name']}"/arm
  (run/'grading.json').write_text(json.dumps({'expectations':v['expectations'],'summary':{'passed':sum(e['passed'] for e in v['expectations']),'failed':sum(not e['passed'] for e in v['expectations']),'total':len(v['expectations']),'pass_rate':sum(e['passed'] for e in v['expectations'])/len(v['expectations'])},'blind_review':str((r/'reviews'/a.phase/f"{c['id']}.json").relative_to(r)),'output_sha256':hashlib.sha256((run/'outputs/output.md').read_bytes()).hexdigest(),'scores':v['scores'],'critical':v['critical'],'substantive':v['substantive']},indent=2)+'\n')
for s in summary.values():
 s['mean_scores']={key:sum(v[key] for v in s['scores'])/len(s['scores']) for key in s['scores'][0]};del s['scores']
(r/a.phase/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))

runs=[]
for c in cases:
 for arm in summary:
  g=json.loads((r/a.phase/f"eval-{c['id']}-{c['name']}"/arm/'grading.json').read_text())
  runs.append({'eval_id':c['id'],'configuration':arm,'run_number':1,'result':g['summary'],'expectations':g['expectations']})
def stats(v):return {'mean':statistics.mean(v),'stddev':statistics.stdev(v) if len(v)>1 else 0,'min':min(v),'max':max(v)}
benchmark={'metadata':{'skill_name':'natural-writing','executor_model':'session model; exact build unavailable','analyzer_model':'independent session subagent; exact build unavailable','runs_per_configuration':1,'evals_run':[c['id'] for c in cases]},'runs':runs,'run_summary':{arm:{'pass_rate':stats([v['result']['pass_rate'] for v in runs if v['configuration']==arm])} for arm in summary},'notes':['Three arms; compare old-skill and no-skill separately.','Assertion rates measure task constraints, not naturalness.','Unknown tokens, runtime and billing omitted, not zero.','Development-2 reuses frozen old/no-skill outputs without resampling.','Single blind agent review is not human validation or a population estimate.']}
benchmark['run_summary']['delta']={'pass_rate':f"{benchmark['run_summary']['with_skill']['pass_rate']['mean']-benchmark['run_summary']['old_skill']['pass_rate']['mean']:+.2f}"}
(r/a.phase/'benchmark.json').write_text(json.dumps(benchmark,indent=2)+'\n')
