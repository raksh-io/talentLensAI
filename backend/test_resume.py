"""
Quick test script for resume_analyzer.py
Run: python test_resume.py
"""
import sys
import io
import json
from pathlib import Path

# Fix Windows terminal encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from resume_analyzer import analyze

# Test with the included sample resume
resume_path = Path("sample_resume.txt")
result = analyze(resume_path.read_bytes(), resume_path.name)

print("=" * 50)
print(f"SKILLS ({len(result['skills'])} found):")
for s in result["skills"]:
    print(f"  [+] {s}")

print(f"\nEXPERIENCE ({len(result['experience'])} entries):")
for exp in result["experience"]:
    print(f"  >> {exp['role']} @ {exp['company']} [{exp['duration']}]")
    for desc in exp.get("description", [])[:2]:
        print(f"     - {desc}")

print(f"\nEDUCATION ({len(result['education'])} entries):")
for edu in result["education"]:
    print(f"  >> {edu['degree']} | {edu['institution']} ({edu['year']})")

print("\n" + "=" * 50)
print("Full JSON output:")
print(json.dumps(result, indent=2, ensure_ascii=False))
