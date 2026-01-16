import argparse
import os
import shutil
import zipfile
import re
import yaml

def validate_skill(skill_folder):
    """
    Validates the skill folder structure and SKILL.md content.
    Returns True if valid, False otherwise.
    """
    errors = []
    skill_name = os.path.basename(skill_folder)
    skill_md_path = os.path.join(skill_folder, "SKILL.md")

    # 1. Check for SKILL.md existence
    if not os.path.exists(skill_md_path):
        errors.append(f"Missing required file: {skill_md_path}")
        return False, errors

    with open(skill_md_path, "r") as f:
        content = f.read()

    # 2. Validate YAML frontmatter
    frontmatter_match = re.match(r"^\s*---\s*\n(.*?)\n---\s*\n", content, re.DOTALL)
    if not frontmatter_match:
        errors.append("SKILL.md: Missing or malformed YAML frontmatter.")
        return False, errors

    frontmatter_str = frontmatter_match.group(1)
    try:
        frontmatter = yaml.safe_load(frontmatter_str)
    except yaml.YAMLError as e:
        errors.append(f"SKILL.md: Invalid YAML in frontmatter: {e}")
        return False, errors

    # Required fields in frontmatter
    if "name" not in frontmatter:
        errors.append("SKILL.md: Frontmatter missing required 'name' field.")
    elif frontmatter["name"] != skill_name:
        errors.append(f"SKILL.md: Frontmatter 'name' ('{frontmatter['name']}') does not match skill folder name ('{skill_name}').")

    if "description" not in frontmatter:
        errors.append("SKILL.md: Frontmatter missing required 'description' field.")
    elif not frontmatter["description"].strip():
        errors.append("SKILL.md: 'description' field in frontmatter cannot be empty.")
    elif "TODO" in frontmatter["description"]:
        errors.append("SKILL.md: 'description' field contains 'TODO'. Please provide a complete description.")

    # Check for unexpected fields in frontmatter
    allowed_frontmatter_fields = ["name", "description", "license"]
    for key in frontmatter:
        if key not in allowed_frontmatter_fields:
            errors.append(f"SKILL.md: Unexpected field '{key}' found in frontmatter. Only 'name', 'description', 'license' are allowed.")

    # 3. Check for "TODO" in SKILL.md body (after frontmatter)
    body_content = content[frontmatter_match.end():]
    if "TODO" in body_content:
        errors.append("SKILL.md: Contains 'TODO' placeholders in the body. Please complete the skill documentation.")

    # 4. Check for disallowed auxiliary files
    disallowed_files = ["README.md", "INSTALLATION_GUIDE.md", "QUICK_REFERENCE.md", "CHANGELOG.md"]
    for root, _, files in os.walk(skill_folder):
        for file in files:
            if file in disallowed_files:
                errors.append(f"Disallowed auxiliary file found: {os.path.join(root, file)}. Skills should only contain essential files.")

    if errors:
        return False, errors
    return True, []

def package_skill(skill_folder, output_dir="."):
    """
    Packages a skill folder into a .skill zip file.
    Performs validation before packaging.
    """
    skill_name = os.path.basename(skill_folder)
    output_filename = os.path.join(output_dir, f"{skill_name}.skill")

    print(f"Validating skill '{skill_name}'...")
    is_valid, errors = validate_skill(skill_folder)

    if not is_valid:
        print("Skill validation failed:")
        for error in errors:
            print(f"- {error}")
        print("Packaging aborted.")
        return

    print("Skill validation successful.")
    print(f"Packaging skill '{skill_name}' into '{output_filename}'...")

    os.makedirs(output_dir, exist_ok=True)

    with zipfile.ZipFile(output_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(skill_folder):
            for file in files:
                file_path = os.path.join(root, file)
                # Arcname is the path inside the zip file
                arcname = os.path.relpath(file_path, skill_folder)
                zipf.write(file_path, arcname)
                print(f"  Added: {arcname}")

    print(f"Successfully packaged skill to: {output_filename}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Package a skill folder into a .skill zip file.")
    parser.add_argument("skill_folder", help="Path to the skill folder to package.")
    parser.add_argument("output_dir", nargs="?", default=".",
                        help="Optional: Directory where the .skill file will be created (default: current directory).")
    args = parser.parse_args()

    if not os.path.isdir(args.skill_folder):
        print(f"Error: Skill folder '{args.skill_folder}' not found.")
    else:
        package_skill(args.skill_folder, args.output_dir)
