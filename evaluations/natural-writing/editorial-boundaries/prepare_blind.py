#!/usr/bin/env python3
"""Copy completed synthetic outputs to anonymized packets for a fresh reviewer."""
import argparse
import json
import random
from pathlib import Path


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('iteration')
    p.add_argument('--tasks', default='development.json')
    p.add_argument('--seed', type=int, required=True)
    args = p.parse_args()
    root = Path(__file__).resolve().parent
    cases = json.loads((root / args.tasks).read_text())['evals']
    mapping_path = root / f'blind-mapping-{args.iteration}.json'
    if mapping_path.exists():
        raise SystemExit('Mapping already exists; preserve existing review packets.')
    # Check complete paired coverage before creating any packets.
    for c in cases:
        for arm in ('with_skill', 'old_skill'):
            out = root / args.iteration / f"eval-{c['id']}-{c['name']}" / arm / 'outputs/output.md'
            if not out.is_file() or not out.read_text().strip():
                raise SystemExit(f'Missing or empty output: {out}')
    rng = random.Random(args.seed)
    mapping = {}
    for c in cases:
        packet = root / 'blind' / args.iteration / f"case-{c['id']}"
        packet.mkdir(parents=True, exist_ok=True)
        (packet / 'task.json').write_text(json.dumps(c, indent=2, ensure_ascii=False) + '\n')
        arms = ['with_skill', 'old_skill']; rng.shuffle(arms)
        mapping[str(c['id'])] = dict(zip('AB', arms))
        for label, arm in zip('AB', arms):
            source = root / args.iteration / f"eval-{c['id']}-{c['name']}" / arm / 'outputs/output.md'
            (packet / f'{label}.md').write_bytes(source.read_bytes())
    mapping_path.write_text(json.dumps(mapping, indent=2) + '\n')
    (root / 'blind' / args.iteration / 'packet-metadata.json').write_text(
        json.dumps({'seed': args.seed, 'tasks': args.tasks, 'pairs': len(cases)}, indent=2) + '\n')
    print(f'{len(cases)} blinded pairs prepared for {args.iteration}.')


if __name__ == '__main__':
    main()
