#!/usr/bin/env python3
"""Exact constraints for reserved cases; no authorship or relevance score."""
import argparse
import json
import re
import runpy
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RANGES = {301: (250, 350), 302: (1, 170), 303: (220, 320),
          304: (450, 600), 305: (300, 420), 306: (300, 420)}
TITLE = 'Evening handover for the community tool library'


def check(case_id, text):
    words = sum(bool(re.search(r'\w', w)) for w in text.split())
    lo, hi = RANGES[case_id]
    result = [{'text': 'Requested word range or maximum', 'passed': lo <= words <= hi,
               'evidence': f'{words} words; requested {lo}–{hi}'}]
    if case_id == 304:
        result.append({'text': 'Requested procedure title', 'passed': TITLE in text,
                       'evidence': 'Exact requested title string check'})
    return result


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--run', action='store_true')
    args = p.parse_args()
    runpy.run_path(str(ROOT / 'check_outputs.py'))['qualify']()
    assert check(301, 'word ' * 250)[0]['passed']
    assert not check(301, 'word ' * 249)[0]['passed']
    assert not check(304, 'word ' * 500)[1]['passed']
    if not args.run:
        print('Confirmation checker positive and negative controls passed.')
        return
    summary = []
    for directory in sorted((ROOT / 'confirmation').glob('eval-*')):
        case_id = json.loads((directory / 'eval_metadata.json').read_text())['eval_id']
        for arm in ('with_skill', 'old_skill'):
            output = directory / arm / 'outputs/output.md'
            if not output.is_file():
                summary.append({'id': case_id, 'arm': arm, 'missing': True})
                continue
            results = check(case_id, output.read_text())
            data = {'expectations': results, 'passed': sum(x['passed'] for x in results),
                    'total': len(results), 'method': 'Exact/length checks; semantic and relevance review separate'}
            (directory / arm / 'mechanical.json').write_text(json.dumps(data, indent=2) + '\n')
            summary.append({'id': case_id, 'arm': arm, 'checks': len(results),
                            'failed': [x for x in results if not x['passed']]})
    (ROOT / 'confirmation/mechanical-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    print(json.dumps(summary))


if __name__ == '__main__':
    main()
