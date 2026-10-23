#!/usr/bin/env python3
"""Unblind saved reviews and make a viewer-compatible summary; no model calls."""
import argparse
import hashlib
import json
import statistics
from pathlib import Path


def stats(values):
    return {'mean': statistics.mean(values),
            'stddev': statistics.stdev(values) if len(values) > 1 else 0,
            'min': min(values), 'max': max(values)}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('iteration')
    args = p.parse_args()
    root = Path(__file__).resolve().parent
    workspace = root / args.iteration
    review = json.loads((root / 'blind' / args.iteration / 'review.json').read_text())
    mapping = json.loads((root / f'blind-mapping-{args.iteration}.json').read_text())
    summary = {arm: {'cases': 0, 'passed': 0, 'total': 0, 'critical_failures': [],
                     'case_means': [], 'wins': 0, 'losses': 0, 'ties': 0}
               for arm in ('with_skill', 'without_skill')}
    runs = []
    for c in review['cases']:
        case_id = str(c['id'])
        directory = next(workspace.glob(f'eval-{case_id}-*'))
        for label in 'AB':
            arm = mapping[case_id][label]
            result = c[label]
            out = directory / arm / 'outputs/output.md'
            packet = root / 'blind' / args.iteration / f'case-{case_id}' / f'{label}.md'
            assert out.read_bytes() == packet.read_bytes(), 'Reviewed output changed'
            expectations = result['expectations']
            passed = sum(x['passed'] for x in expectations)
            total = len(expectations)
            grade = {'expectations': expectations,
                     'summary': {'passed': passed, 'failed': total-passed,
                                 'total': total, 'pass_rate': passed/total},
                     'scores': result['scores'], 'critical_failures': result['critical_failures'],
                     'review_method': 'Independent single blind agent review; not human feedback',
                     'review_source': f'blind/{args.iteration}/review.json',
                     'output_sha256': hashlib.sha256(out.read_bytes()).hexdigest()}
            (directory / arm / 'grading.json').write_text(json.dumps(grade, indent=2, ensure_ascii=False) + '\n')
            s = summary[arm]
            s['cases'] += 1; s['passed'] += passed; s['total'] += total
            s['critical_failures'] += [{'case_id': int(case_id), 'finding': x} for x in result['critical_failures']]
            scores = [x for x in result['scores'].values() if isinstance(x, (int, float))]
            s['case_means'].append(statistics.mean(scores))
            if c['winner'].lower() == 'tie': s['ties'] += 1
            elif c['winner'] == label: s['wins'] += 1
            else: s['losses'] += 1
            runs.append({'eval_id': int(case_id), 'configuration': arm, 'run_number': 1,
                         'result': grade['summary'], 'expectations': expectations,
                         'notes': [c['reasoning']]})
    for s in summary.values():
        s['mean_score'] = statistics.mean(s['case_means'])
    (workspace / 'summary.json').write_text(json.dumps(summary, indent=2, ensure_ascii=False) + '\n')
    benchmark = {'metadata': {'skill_name': 'natural-writing', 'executor_model': 'session model; exact build unavailable',
                              'analyzer_model': 'independent session subagent; exact build unavailable',
                              'runs_per_configuration': 1, 'evals_run': [c['id'] for c in review['cases']]},
                 'runs': sorted(runs, key=lambda x: (x['eval_id'], x['configuration'] != 'with_skill')),
                 'run_summary': {arm: {'pass_rate': stats([r['result']['pass_rate'] for r in runs if r['configuration'] == arm])}
                                 for arm in ('with_skill', 'without_skill')},
                 'notes': ['Assertion pass rate measures task constraints, not naturalness.',
                           'Unknown time, tokens and session charge are omitted, not zero.',
                           'Single samples with strong host writing guidance in both arms; no statistical superiority claim.',
                           'Editorial scores and paired preferences are in summary.json and the blind review.']}
    delta = (benchmark['run_summary']['with_skill']['pass_rate']['mean'] -
             benchmark['run_summary']['without_skill']['pass_rate']['mean'])
    benchmark['run_summary']['delta'] = {'pass_rate': f'{delta:+.2f}'}
    (workspace / 'benchmark.json').write_text(json.dumps(benchmark, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
