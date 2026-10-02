#!/usr/bin/env python3
"""Exercise retirement validation against disposable Git repositories."""

import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).with_name("validate_release_contract.py")
spec = importlib.util.spec_from_file_location("release_contract", SCRIPT)
contract = importlib.util.module_from_spec(spec)
spec.loader.exec_module(contract)


class ArchiveContractTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="archive-contract-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.skill = self.root / "skills" / "example-skill"
        self.skill.mkdir(parents=True)
        self.git("init", "-q")
        (self.skill / "SKILL.md").write_text(
            '---\nname: example-skill\ndescription: Example\nmetadata:\n  version: "1.3.0"\n---\nExample\n'
        )
        (self.root / "CHANGELOG.md").write_text("## example-skill 1.3.0 - 2026-10-01\n")
        self.git("add", ".")
        self.git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "baseline")
        (self.skill / "SKILL.md").unlink()
        self.data = {
            "name": "example-skill", "status": "archived", "archivedOn": "2026-10-02",
            "metadata": {"version": "2.0.0"}, "historicalInstructions": "SKILL.archived.md",
            "researchReport": "RESEARCH.md", "evidenceRegister": "EVIDENCE.md",
        }
        (self.skill / "SKILL.archived.md").write_text("# Archived instructions\n\nHistorical source.\n")
        (self.skill / "RESEARCH.md").write_text("# Research\n")
        (self.skill / "EVIDENCE.md").write_text("# Evidence\n")
        self.write_manifest()
        (self.root / "CHANGELOG.md").write_text("## example-skill 2.0.0 - 2026-10-02\n")

    def git(self, *args):
        return subprocess.run(["git", *args], cwd=self.root, check=True, capture_output=True, text=True)

    def write_manifest(self):
        (self.skill / "ARCHIVE.json").write_text(json.dumps(self.data))

    def validate(self):
        return subprocess.run([sys.executable, str(SCRIPT)], cwd=self.root, capture_output=True, text=True)

    def assert_rejected(self, message):
        result = self.validate()
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn(message, result.stderr)

    def test_intentional_retirement_passes(self):
        result = self.validate()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_unexplained_entrypoint_removal_fails(self):
        (self.skill / "ARCHIVE.json").unlink()
        self.assert_rejected("no SKILL.md or valid ARCHIVE.json")

    def test_reintroduced_nested_public_entrypoint_fails(self):
        directory = self.skill / "references" / "example"
        directory.mkdir(parents=True)
        (directory / "SKILL.md").write_text("---\nname: example-skill\ndescription: Example\n---\n")
        self.assert_rejected("retains a public SKILL.md")

    def test_missing_research_resource_fails(self):
        (self.skill / "RESEARCH.md").unlink()
        self.assert_rejected("missing or escaping archive resource")

    def test_escaping_resource_fails(self):
        self.data["researchReport"] = "../other/RESEARCH.md"
        self.write_manifest()
        self.assert_rejected("must reference a retained archive file")

    def test_symlink_escape_fails(self):
        (self.skill / "RESEARCH.md").unlink()
        (self.root / "outside.md").write_text("External\n")
        (self.skill / "RESEARCH.md").symlink_to(self.root / "outside.md")
        self.assert_rejected("missing or escaping archive resource")

    def test_distribution_retirement_needs_major_increment(self):
        self.data["metadata"]["version"] = "1.4.0"
        self.write_manifest()
        self.assert_rejected("retirement requires a major version increment")

    def test_archive_date_and_frontmatter_are_validated(self):
        self.data["archivedOn"] = "2026-02-30"
        with self.assertRaisesRegex(ValueError, "ISO calendar date"):
            contract.parse_archive(json.dumps(self.data), "fixture")
        self.data["archivedOn"] = "2026-10-02"
        (self.skill / "SKILL.archived.md").write_text("---\nname: example-skill\n---\n")
        self.assert_rejected("leading archive notice")

    def test_archive_needs_matching_changelog(self):
        (self.root / "CHANGELOG.md").write_text("## example-skill 1.3.0 - 2026-10-01\n")
        self.assert_rejected("lacks a release heading for 2.0.0")


if __name__ == "__main__":
    unittest.main()
