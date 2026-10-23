#!/usr/bin/env python3
"""Verify frozen inputs, reviewed-output identity and the literal proofreading control."""
import hashlib,json
from pathlib import Path
r=Path(__file__).resolve().parent
expected='By six, the garden had gone blue. My father kept digging—slowly, as if the potatoes might object. We ate late; nobody mentioned the clock.'
def exact(text):return text.rstrip('\n')==expected
assert exact(expected+'\n')
assert not exact(expected.replace('—','-'))
assert not exact('Edited: '+expected)
assert not exact(expected+'\nA useful reminder.')
for name in ('experiment.json','experiment-2.json'):
 for path,digest in json.loads((r/name).read_text())['hashes'].items():
  assert hashlib.sha256((r/path).read_bytes()).hexdigest()==digest,path
canonical=r.parents[2]/'skills/natural-writing'
snapshot=r/'snapshots/candidate-2'
assert (canonical/'SKILL.md').read_bytes()==(snapshot/'instructions.md').read_bytes()
for f in (canonical/'references').glob('*.md'):assert f.read_bytes()==(snapshot/'references'/f.name).read_bytes(),str(f)
count=0
for phase in ('development','development-2','confirmation'):
 cases=json.loads((r/f'{phase}.json').read_text())['evals'];mapping=json.loads((r/f'blind-mapping-{phase}.json').read_text())
 actor=json.loads((r/f'{phase}-actor-input.json').read_text())
 assert actor==[{k:c[k] for k in ('id','name','prompt','files')} for c in cases]
 for c in cases:
  for label,arm in mapping[str(c['id'])].items():
   run=r/phase/f"eval-{c['id']}-{c['name']}"/arm
   raw=(run/'outputs/output.md').read_bytes()
   assert raw==(r/'blind'/phase/f"case-{c['id']}"/f'{label}.md').read_bytes()
   assert hashlib.sha256(raw).hexdigest()==json.loads((run/'grading.json').read_text())['output_sha256']
   if c['id']==505:assert exact(raw.decode());count+=1
for c in json.loads((r/'development.json').read_text())['evals']:
 for arm in ('old_skill','no_skill'):
  base=f"eval-{c['id']}-{c['name']}/{arm}"
  for file in ('outputs/output.md','run.json'):assert (r/'development'/base/file).read_bytes()==(r/'development-2'/base/file).read_bytes()
print(f'Integrity passed; {count} exact-control outputs and 3 checker negative controls passed.')
