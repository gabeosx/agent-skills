#!/usr/bin/env python3
"""Check the documented prototype color-role pairs in the selected skill asset."""
import argparse
from pathlib import Path
import re

SKILL = Path(__file__).resolve().parents[2] / "skills" / "ux-designer"
VARIABLE = re.compile(r"^\s*(--[\w-]+):\s*(#[\da-fA-F]{6}|var\(--[\w-]+\))\s*;", re.MULTILINE)
TEXT_SURFACES = ("bg-canvas", "bg-surface", "bg-subtle")
PAIRS = [
    (fg, bg, 4.5)
    for fg in ("text-primary", "text-secondary", "text-tertiary", "danger", "success", "warning")
    for bg in TEXT_SURFACES
] + [
    ("on-primary", "primary", 4.5), ("on-primary", "primary-hover", 4.5),
    ("danger", "danger-bg", 4.5), ("success", "success-bg", 4.5),
    ("warning", "warning-bg", 4.5),
] + [(fg, bg, 3) for fg in ("border-control", "focus") for bg in TEXT_SURFACES]


def luminance(value):
    channels = [int(value[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    linear = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in channels]
    return sum(a * b for a, b in zip(linear, (0.2126, 0.7152, 0.0722)))


def ratio(first, second):
    dark, light = sorted((luminance(first), luminance(second)))
    return (light + 0.05) / (dark + 0.05)


def check(path):
    tokens = dict(VARIABLE.findall(path.read_text()))

    def resolve(key):
        token = tokens[key]
        while token.startswith("var("):
            token = tokens[token[4:-1]]
        return token

    failures = []
    for fg, bg, minimum in PAIRS:
        try:
            contrast = ratio(resolve(f"--color-{fg}"), resolve(f"--color-{bg}"))
        except KeyError as error:
            failures.append(f"{fg} on {bg}: missing {error}")
            continue
        if contrast < minimum:
            failures.append(f"{fg} on {bg}: {contrast:.2f}:1 < {minimum}:1")
    if failures:
        raise SystemExit("\n".join(failures))
    print(f"Passed {len(PAIRS)} declared color pairs")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("css", type=Path, nargs="?", default=SKILL / "assets/design-system-core.css")
    check(parser.parse_args().css)
