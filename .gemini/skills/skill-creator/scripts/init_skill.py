import argparse
import os
import shutil
import re

def init_skill(skill_name, output_directory):
    """
    Initializes a new skill directory with a basic SKILL.md template and example resource folders.
    """
    skill_path = os.path.join(output_directory, skill_name)

    if os.path.exists(skill_path):
        print(f"Error: Skill directory '{skill_path}' already exists. Please choose a different name or path.")
        return

    os.makedirs(skill_path)
    print(f"Created skill directory: {skill_path}")

    # Create SKILL.md
    skill_md_content = f"""---
name: {skill_name}
description: TODO: Provide a clear and comprehensive description of what this skill does and when it should be used.
license: Complete terms in LICENSE.txt
---

# {skill_name.replace('-', ' ').title()} Skill

TODO: Provide instructions and guidance for using this skill.

## About This Skill

TODO: Explain the purpose and capabilities of this skill.

## How to Use This Skill

TODO: Detail the steps or common workflows for using this skill.

### Example Usage

TODO: Provide concrete examples of how this skill can be applied.

## Bundled Resources

This skill includes the following resources:

### Scripts (`scripts/`)

- `example_script.py`: TODO: Describe what this example script does.

### References (`references/`)

- `example_reference.md`: TODO: Describe what this example reference document contains.

### Assets (`assets/`)

- `example_asset.txt`: TODO: Describe what this example asset is for.
"""
    with open(os.path.join(skill_path, "SKILL.md"), "w") as f:
        f.write(skill_md_content)
    print(f"Created {skill_name}/SKILL.md")

    # Create example resource directories and files
    scripts_path = os.path.join(skill_path, "scripts")
    os.makedirs(scripts_path)
    with open(os.path.join(scripts_path, "example_script.py"), "w") as f:
        f.write("#!/usr/bin/env python3\n\n# Example Python script\nprint('Hello from example_script.py!')\n")
    print(f"Created {skill_name}/scripts/example_script.py")

    references_path = os.path.join(skill_path, "references")
    os.makedirs(references_path)
    with open(os.path.join(references_path, "example_reference.md"), "w") as f:
        f.write("# Example Reference\n\nThis is an example reference document. You can add detailed documentation, schemas, or other information here.\n")
    print(f"Created {skill_name}/references/example_reference.md")

    assets_path = os.path.join(skill_path, "assets")
    os.makedirs(assets_path)
    with open(os.path.join(assets_path, "example_asset.txt"), "w") as f:
        f.write("This is an example asset file. You can replace it with templates, images, or other files used in output.\n")
    print(f"Created {skill_name}/assets/example_asset.txt")

    print(f"\nSkill '{skill_name}' initialized successfully at '{skill_path}'.")
    print("Remember to customize SKILL.md and replace/remove example files as needed.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Initialize a new skill directory.")
    parser.add_argument("skill_name", help="The name of the skill to create (e.g., 'my-new-skill').")
    parser.add_argument("--path", default=".", help="The output directory where the skill folder will be created.")
    args = parser.parse_args()

    init_skill(args.skill_name, args.path)
