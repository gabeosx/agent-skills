#!/usr/bin/env python3
"""Freeze anonymized three-arm review packets; never overwrite existing packets."""
import argparse,json,random
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('phase',choices=['development','development-2','confirmation']);p.add_argument('--seed',type=int,required=True);a=p.parse_args()
r=Path(__file__).resolve().parent; cases=json.loads((r/f'{a.phase}.json').read_text())['evals']; arms=['with_skill','old_skill','no_skill']; m={}; rng=random.Random(a.seed)
mp=r/f'blind-mapping-{a.phase}.json'
if mp.exists(): raise SystemExit('Mapping already exists')
for c in cases:
 for arm in arms:
  f=r/a.phase/f"eval-{c['id']}-{c['name']}"/arm/'outputs/output.md'
  if not f.is_file() or not f.read_text().strip(): raise SystemExit(f'Missing {f}')
for c in cases:
 d=r/'blind'/a.phase/f"case-{c['id']}";d.mkdir(parents=True,exist_ok=True)
 (d/'task.json').write_text(json.dumps(c,indent=2)+'\n'); order=arms.copy();rng.shuffle(order);m[str(c['id'])]=dict(zip('ABC',order))
 for label,arm in m[str(c['id'])].items():
  f=r/a.phase/f"eval-{c['id']}-{c['name']}"/arm/'outputs/output.md';(d/f'{label}.md').write_bytes(f.read_bytes())
mp.write_text(json.dumps(m,indent=2)+'\n');print(f'Prepared {len(cases)} blinded triples')
