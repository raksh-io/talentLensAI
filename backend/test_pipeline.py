"""
Full offline pipeline test.
Run: python test_pipeline.py
"""
import sys
import io
import json
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from talent_pipeline import run_pipeline

# --- Sample projects (replaces GitHub API) ---
sample_projects = [
    {
        "name": "OpenTracker",
        "description": "Habit tracking REST API built with Python and FastAPI and PostgreSQL",
        "languages": ["Python", "SQL"],
    },
    {
        "name": "QuickQuery",
        "description": "SQL query builder library for Python developers",
        "languages": ["Python"],
    },
    {
        "name": "E-commerce backend",
        "description": "Node.js microservices for an e-commerce platform with Docker",
        "languages": ["JavaScript", "Docker"],
    },
]

resume_path = Path("sample_resume.txt")
report = run_pipeline(
    file_bytes=resume_path.read_bytes(),
    filename=resume_path.name,
    job_id="software_engineer",
    projects=sample_projects,
)

# Pretty print results
SEP = "=" * 55

print(SEP)
print(f"  TALENTLENS AI REPORT")
print(SEP)
print(f"  Candidate : {report['candidate_name']}")
print(f"  Job Role  : {report['job_title']}")
print(f"  Fit Score : {report['fit_score']} / 100  ({report['score_label']})")
print(SEP)

print("\n[SCORE BREAKDOWN]")
bd = report["score_breakdown"]
print(f"  Skill Match       : {bd['skill_match']}%  (weight: {bd['weights']['skill_match']})")
print(f"  Project Relevance : {bd['project_relevance']}%  (weight: {bd['weights']['project_relevance']})")

print(f"\n[SKILLS DETECTED — {len(report['skills'])}]")
print("  " + ", ".join(report["skills"]))

print(f"\n[MATCHED SKILLS — {len(report['matched_skills'])}]")
print("  " + (", ".join(report["matched_skills"]) or "None"))

print(f"\n[MISSING SKILLS — {len(report['missing_skills'])}]")
print("  " + (", ".join(report["missing_skills"]) or "None"))

print(f"\n[STRENGTHS]")
for s in report.get("strengths", []):
    print(f"  + {s}")

print(f"\n[GAPS]")
for g in report.get("gaps", []):
    print(f"  ! {g}")

print(f"\n[RECOMMENDATION]  {report.get('recommendation', '')}")
print(f"\n[EXPLANATION]")
print(f"  {report['explanation']}")

print(f"\n[EXPERIENCE — {len(report['experience'])} entries]")
for exp in report["experience"]:
    print(f"  >> {exp['role']} @ {exp.get('organization','')} [{exp['duration']}]")

print(f"\n[EDUCATION — {len(report['education'])} entries]")
for edu in report["education"]:
    print(f"  >> {edu['degree']} | {edu['institution']} ({edu['year']})")

print("\n" + SEP)
print("Full JSON:")
print(json.dumps(report, indent=2, ensure_ascii=False))
