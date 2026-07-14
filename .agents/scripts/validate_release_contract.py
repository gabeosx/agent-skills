#!/usr/bin/env python3
"""Validate per-skill versions and changelog coverage for repository changes."""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path


SEMVER_RE = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$")
FRONTMATTER_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*\n", re.DOTALL)
NAME_RE = re.compile(r"^name:\s*([^\s]+)\s*$", re.MULTILINE)
VERSION_RE = re.compile(
    r'^metadata:\s*$.*?^\s{2}version:\s*["\']([^"\']+)["\']\s*$',
    re.MULTILINE | re.DOTALL,
)


def git(root: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=root,
        check=check,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )


def parse_skill(text: str, label: str) -> tuple[str, tuple[int, int, int], str]:
    frontmatter = FRONTMATTER_RE.search(text)
    if not frontmatter:
        raise ValueError(f"{label}: missing YAML frontmatter")

    name_match = NAME_RE.search(frontmatter.group(1))
    version_match = VERSION_RE.search(frontmatter.group(1))
    if not name_match:
        raise ValueError(f"{label}: missing name")
    if not version_match or not SEMVER_RE.fullmatch(version_match.group(1)):
        raise ValueError(f"{label}: metadata.version must be a quoted stable SemVer")

    version_text = version_match.group(1)
    version = tuple(int(part) for part in version_text.split("."))
    return name_match.group(1), version, version_text


def changed_paths(root: Path, base_ref: str) -> set[str]:
    git(root, "rev-parse", "--verify", base_ref)
    tracked = git(root, "diff", "--name-only", "--diff-filter=ACDMRTUXB", base_ref, "--")
    untracked = git(root, "ls-files", "--others", "--exclude-standard")
    return {
        line.strip()
        for line in [*tracked.stdout.splitlines(), *untracked.stdout.splitlines()]
        if line.strip()
    }


def text_at_ref(root: Path, ref: str, path: str) -> str | None:
    result = git(root, "show", f"{ref}:{path}", check=False)
    return result.stdout if result.returncode == 0 else None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-ref",
        default="HEAD",
        help="Git ref to compare against (default: HEAD for working-tree validation)",
    )
    args = parser.parse_args()

    root_result = git(Path.cwd(), "rev-parse", "--show-toplevel")
    root = Path(root_result.stdout.strip())
    paths = changed_paths(root, args.base_ref)
    if not paths:
        print(f"No changes detected relative to {args.base_ref}.")
        return 0

    changelog_path = root / "CHANGELOG.md"
    if not changelog_path.is_file():
        print("ERROR: CHANGELOG.md is required.", file=sys.stderr)
        return 1
    changelog = changelog_path.read_text(encoding="utf-8")

    affected_skills = sorted(
        {
            parts[1]
            for path in paths
            if len(parts := Path(path).parts) >= 2 and parts[0] == "skills"
        }
    )
    errors: list[str] = []

    for directory in affected_skills:
        skill_path = Path("skills") / directory / "SKILL.md"
        absolute_skill_path = root / skill_path
        if not absolute_skill_path.is_file():
            errors.append(f"{directory}: changed skill has no SKILL.md")
            continue

        try:
            name, version, version_text = parse_skill(
                absolute_skill_path.read_text(encoding="utf-8"), str(skill_path)
            )
        except ValueError as error:
            errors.append(str(error))
            continue

        old_text = text_at_ref(root, args.base_ref, str(skill_path))
        if old_text is not None:
            try:
                _, old_version, old_version_text = parse_skill(
                    old_text, f"{args.base_ref}:{skill_path}"
                )
            except ValueError:
                old_version = None
                old_version_text = "unversioned"
            if old_version is not None and version <= old_version:
                errors.append(
                    f"{name}: version {version_text} must be greater than "
                    f"{old_version_text} from {args.base_ref}"
                )

        release_heading = re.compile(
            rf"^## {re.escape(name)} {re.escape(version_text)} - \d{{4}}-\d{{2}}-\d{{2}}$",
            re.MULTILINE,
        )
        if not release_heading.search(changelog):
            errors.append(
                f"{name}: CHANGELOG.md lacks a release heading for {version_text}"
            )

    repository_paths = sorted(
        path
        for path in paths
        if not path.startswith("skills/") and path != "CHANGELOG.md"
    )
    if repository_paths:
        unreleased = re.search(
            r"^## Unreleased\s*$\n(.*?)(?=^## |\Z)", changelog, re.MULTILINE | re.DOTALL
        )
        if not unreleased or not re.search(
            r"^### Repository\s*$", unreleased.group(1), re.MULTILINE
        ):
            errors.append(
                "repository-only changes require an Unreleased > Repository changelog entry"
            )

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1

    print(f"Release contract valid relative to {args.base_ref}.")
    if affected_skills:
        print(f"Affected skills: {', '.join(affected_skills)}")
    if repository_paths:
        print(f"Repository-level files covered: {len(repository_paths)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
