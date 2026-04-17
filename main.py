"""
TalentLens AI — FastAPI Server (Fully Offline)
================================================
No external API keys required.

Endpoints:
  GET  /                → health check
  GET  /jobs            → list available job profiles
  POST /resume-analyze  → offline resume analysis (skills, experience, education)
  POST /analyze         → full offline pipeline (fit score + gap analysis)
"""
from __future__ import annotations

import json
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware


from talent_pipeline import run_pipeline, list_jobs
from resume_analyzer import analyze as analyze_resume_offline

app = FastAPI(
    title="TalentLens AI",
    description=(
        "AI-powered Talent Intelligence System — fully offline.\n\n"
        "Analyzes resume + projects to produce: skill profile, fit score (0–100), "
        "skill gap analysis. No external API keys required."
    ),
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/", tags=["Health"])
def health():
    return {
        "status": "ok",
        "service": "TalentLens AI",
        "version": "2.0.0",
        "mode": "fully offline — no API keys required",
    }


@app.get("/jobs", tags=["Jobs"])
def get_jobs():
    """List all available job profiles to match against."""
    return {"jobs": list_jobs()}


@app.post("/resume-analyze", tags=["Resume Analysis"])
async def resume_analyze(
    resume: UploadFile = File(..., description="Resume file (.pdf, .docx, or .txt)"),
):
    """
    **Offline** resume analysis — extracts skills, experience, and education.

    No API key needed. Uses rule-based NLP + spaCy locally.

    Returns:
    ```json
    {
      "skills": ["Python", "React", ...],
      "experience": [{"role": ..., "company": ..., "duration": ..., "description": [...]}],
      "education": [{"degree": ..., "institution": ..., "year": ...}]
    }
    ```
    """
    filename = resume.filename or "resume.pdf"
    _validate_resume_file(filename)

    try:
        file_bytes = await resume.read()
        return analyze_resume_offline(file_bytes, filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {e}")


@app.post("/analyze", tags=["Full Pipeline"])
async def analyze(
    resume: UploadFile = File(
        ...,
        description="Resume file (.pdf, .docx, or .txt)",
    ),
    job_id: str = Form(
        ...,
        description="Job profile ID. Use GET /jobs to see options. E.g. 'software_engineer'",
    ),
    github_url: Optional[str] = Form(
        default=None,
        description=(
            "GitHub profile URL (optional). E.g. https://github.com/username\n"
            "If provided, repos are automatically scraped and used for project matching."
        ),
    ),
    portfolio_url: Optional[str] = Form(
        default=None,
        description=(
            "Portfolio website URL (optional). E.g. https://janedoe.dev\n"
            "If provided, skills and projects are extracted from the page."
        ),
    ),
    projects: Optional[str] = Form(
        default="[]",
        description="""
Optional manual projects (JSON array). Used alongside GitHub data if both are provided.
Example:
[
  {
    "name": "MyApp",
    "description": "A REST API built with FastAPI and PostgreSQL",
    "languages": ["Python", "SQL"]
  }
]
        """,
    ),
):
    """
    **Full offline pipeline** — resume + GitHub URL + job role → fit score + gap analysis.

    **Inputs:**
    - `resume` — PDF, DOCX, or TXT file
    - `job_id` — role to match against (use GET /jobs for options)
    - `github_url` *(optional)* — public GitHub profile URL, e.g. `https://github.com/username`
    - `projects` *(optional)* — manual project list as JSON array

    **No API key required.** GitHub data is scraped from the public profile page.

    **Returns:**
    ```json
    {
      "candidate_name": "Jane Doe",
      "github_username": "janedoe",
      "job_title": "Software Engineer",
      "skills": [...],
      "fit_score": 78,
      "score_label": "Good Fit",
      "matched_skills": [...],
      "missing_skills": [...],
      "explanation": "...",
      "recommendation": "Strong Hire"
    }
    ```
    """
    filename = resume.filename or "resume.pdf"
    _validate_resume_file(filename)

    # Parse projects JSON
    try:
        projects_list: list[dict] = json.loads(projects or "[]")
        if not isinstance(projects_list, list):
            raise ValueError("projects must be a JSON array")
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid projects JSON: {e}",
        )

    try:
        file_bytes = await resume.read()
        report = run_pipeline(
            file_bytes=file_bytes,
            filename=filename,
            job_id=job_id.strip(),
            projects=projects_list,
            github_url=github_url.strip() if github_url else None,
            portfolio_url=portfolio_url.strip() if portfolio_url else None,
        )
        return report

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline error: {e}")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _validate_resume_file(filename: str):
    if not filename.lower().endswith((".pdf", ".docx", ".txt", ".md")):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Upload a .pdf, .docx, or .txt resume.",
        )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
