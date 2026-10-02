#!/usr/bin/env python3
"""Validate per-skill versions and changelog coverage for repository changes."""

from __future__ import annotations

import argparse
import datetime
import json
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


def parse_archive(text: str, label: str) -> tuple[str, tuple[int, int, int], str]:
    """Read retirement metadata without creating a discoverable skill entrypoint."""
    try:
        data = json.loads(text)
    except json.JSONDecodeError as error:
        raise ValueError(f"{label}: invalid archive JSON") from error
    if not isinstance(data, dict) or data.get("status") != "archived":
        raise ValueError(f"{label}: archive status must be archived")
    name = data.get("name")
    if not isinstance(name, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name):
        raise ValueError(f"{label}: invalid archived skill name")
    metadata = data.get("metadata")
    version_text = metadata.get("version") if isinstance(metadata, dict) else None
    if not isinstance(version_text, str) or not SEMVER_RE.fullmatch(version_text):
        raise ValueError(f"{label}: metadata.version must be a stable SemVer string")
    try:
        archived_on = data["archivedOn"]
        if not isinstance(archived_on, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", archived_on):
            raise ValueError("Invalid date")
        datetime.date.fromisoformat(archived_on)
    except (KeyError, TypeError, ValueError) as error:
        raise ValueError(f"{label}: archivedOn must be an ISO calendar date") from error
    for field in ("historicalInstructions", "researchReport", "evidenceRegister"):
        value = data.get(field)
        if (
            not isinstance(value, str)
            or not value
            or Path(value).is_absolute()
            or ".." in Path(value).parts
            or Path(value).name == "SKILL.md"
        ):
            raise ValueError(f"{label}: {field} must reference a retained archive file")
    return name, tuple(int(part) for part in version_text.split(".")), version_text


def validate_archive_files(root: Path, directory: str, data: dict) -> None:
    archive_root = root / "skills" / directory
    if data["name"] != directory:
        raise ValueError(f"{directory}: archive name must match its directory")
    for field in ("historicalInstructions", "researchReport", "evidenceRegister"):
        path = archive_root / data[field]
        if not path.is_file() or not path.resolve().is_relative_to(archive_root.resolve()):
            raise ValueError(f"{directory}: missing or escaping archive resource {data[field]}")
    instructions = (archive_root / data["historicalInstructions"]).read_text(encoding="utf-8")
    if instructions.startswith("---") or "archived" not in instructions[:600].lower():
        raise ValueError(f"{directory}: historical instructions need a leading archive notice")
    public_files = git(root, "ls-files", "--cached", "--others", "--exclude-standard", "--", f"skills/{directory}")
    for file in public_files.stdout.splitlines():
        if Path(file).name == "SKILL.md" and (root / file).is_file():
            raise ValueError(f"{directory}: archived skill retains a public SKILL.md at {file}")


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
        archive_path = Path("skills") / directory / "ARCHIVE.json"
        absolute_archive_path = root / archive_path
        archived = absolute_archive_path.is_file()

        try:
            if archived:
                archive_text = absolute_archive_path.read_text(encoding="utf-8")
                name, version, version_text = parse_archive(archive_text, str(archive_path))
                validate_archive_files(root, directory, json.loads(archive_text))
            elif absolute_skill_path.is_file():
                name, version, version_text = parse_skill(
                    absolute_skill_path.read_text(encoding="utf-8"), str(skill_path)
                )
            else:
                raise ValueError(f"{directory}: changed skill has no SKILL.md or valid ARCHIVE.json")
        except (ValueError, OSError) as error:
            errors.append(str(error))
            continue

        old_archive = text_at_ref(root, args.base_ref, str(archive_path))
        old_text = old_archive if old_archive is not None else text_at_ref(root, args.base_ref, str(skill_path))
        if old_text is not None:
            try:
                parse_old = parse_archive if old_archive is not None else parse_skill
                old_path = archive_path if old_archive is not None else skill_path
                _, old_version, old_version_text = parse_old(old_text, f"{args.base_ref}:{old_path}")
            except ValueError:
                old_version = None
                old_version_text = "unversioned"
            if old_version is not None and version <= old_version:
                errors.append(
                    f"{name}: version {version_text} must be greater than "
                    f"{old_version_text} from {args.base_ref}"
                )
            if archived and old_archive is None and old_version is not None and version[0] <= old_version[0]:
                errors.append(f"{name}: distribution retirement requires a major version increment")

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
