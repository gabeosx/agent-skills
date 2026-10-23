#!/usr/bin/env python3
"""Check exact editorial-task constraints; semantic selection needs a reviewer."""
import argparse
import json
import re
import runpy
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PREVIOUS = runpy.run_path(str(ROOT.parent / 'check_outputs.py'))
CAPS = {201: 230, 202: 140, 203: 240, 204: 220}
RANGES = {205: (180, 250), 208: (250, 350)}
LITERALS = {
    201: ['pip install harbor-queue', 'DATABASE_URL', 'DESTINATION_URL',
          'harbor-queue ingest orders.csv', 'delivery_id'],
    202: ['CACHE_URL'],
    204: ['endpoint', 'destination_url', 'PACKETLINE_TOKEN'],
    207: ['state.json'],
}


def check(case_id, text):
    if case_id in {402, 403, 405, 406}:
        return PREVIOUS['check'](case_id - 400, text)
    results = []
    def add(label, passed, evidence):
        results.append({'text': label, 'passed': bool(passed), 'evidence': evidence})
    words = sum(bool(re.search(r'\w', w)) for w in text.split())
    if case_id in CAPS:
        cap = CAPS[case_id]
        add('Requested maximum length', words <= cap, f'{words} words; maximum {cap}')
    if case_id in RANGES:
        lo, hi = RANGES[case_id]
        add('Requested word range', lo <= words <= hi, f'{words} words; requested {lo}–{hi}')
    if case_id in LITERALS:
        absent = [s for s in LITERALS[case_id] if s not in text]
        add('Required interface strings retained', not absent, f'Missing: {absent}')
    if case_id == 207:
        lines = [s for s in text.splitlines() if s.strip()]
        add('Only comment text returned', bool(lines) and all(s.lstrip().startswith('#') for s in lines),
            'Every nonempty line starts with #; no markdown fence or response wrapper')
    return results


def qualify():
    PREVIOUS['self_test']()
    assert all(x['passed'] for x in check(201, ' '.join(LITERALS[201])))
    assert not all(x['passed'] for x in check(201, 'Install it.'))
    assert all(x['passed'] for x in check(207, '# Avoid partial state.json writes.'))
    assert not all(x['passed'] for x in check(207, 'Here is the comment:\n# state.json'))
    assert not check(205, 'Too short.')[0]['passed']


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('iteration', nargs='?')
    args = p.parse_args()
    qualify()
    if not args.iteration:
        print('Exact checker: positive and deliberately invalid controls passed.')
        return
    workspace = ROOT / args.iteration
    summary = []
    for d in sorted(workspace.glob('eval-*')):
        case_id = json.loads((d / 'eval_metadata.json').read_text())['eval_id']
        for arm in ('with_skill', 'old_skill'):
            output = d / arm / 'outputs/output.md'
            if not output.is_file():
                summary.append({'id': case_id, 'arm': arm, 'missing': True})
                continue
            results = check(case_id, output.read_text())
            data = {'expectations': results, 'passed': sum(x['passed'] for x in results),
                    'total': len(results), 'method': 'Exact/format constraints only; semantic review separate'}
            (d / arm / 'mechanical.json').write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
            summary.append({'id': case_id, 'arm': arm, 'checks': len(results),
                            'failed': [x for x in results if not x['passed']]})
    (workspace / 'mechanical-summary.json').write_text(json.dumps(summary, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == '__main__':
    main()
