"""
TalentLens AI — FastAPI Server (Fully Offline)
================================================
No external API keys required.

Endpoints:
  GET  /                    → serve frontend UI
  GET  /health              → health check
  GET  /jobs                → list available job profiles
  POST /resume-analyze      → offline resume analysis
  POST /analyze             → full offline pipeline (candidate)
  ── Recruiter ──
  GET  /recruiter/candidates  → ranked candidate leaderboard
  DELETE /recruiter/candidates → clear the board
  POST /recruiter/create-job  → create a custom job posting
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse


from talent_pipeline import run_pipeline, list_jobs
from resume_analyzer import analyze as analyze_resume_offline

# ---------------------------------------------------------------------------
# In-memory recruiter store (per server session)
# ---------------------------------------------------------------------------
_candidate_store: list[dict] = []   # holds all analyzed candidate reports

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
# Background Model Pre-warming
# ---------------------------------------------------------------------------
import threading

def prewarm_models():
    """Load heavy models in a separate thread so startup is fast but first-call is ready."""
    try:
        from resume_analyzer import _get_spacy_model
        from pipeline.matcher.skill_matcher import SkillMatcher
        
        # 1. Load spaCy
        _get_spacy_model()
        
        # 2. Load Sentence Transformer
        matcher = SkillMatcher()
        matcher._get_model()
    except Exception as e:
        pass

@app.on_event("startup")
def startup_event():
    # Start pre-warming in background
    threading.Thread(target=prewarm_models, daemon=True).start()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

frontend_pages_dir = Path(__file__).parent.parent / "frontend" / "pages"

@app.get("/", tags=["UI"], include_in_schema=False)
def serve_index():
    # Redirect root to login page
    return FileResponse(str(frontend_pages_dir / "login.html"))

@app.get("/login", tags=["UI"], include_in_schema=False)
def serve_login():
    """Serve the login / sign-up page."""
    return FileResponse(str(frontend_pages_dir / "login.html"))

@app.get("/candidate", tags=["UI"], include_in_schema=False)
def serve_candidate():
    """Serve the candidate analysis page."""
    return FileResponse(str(frontend_pages_dir / "candidate.html"))

@app.get("/recruiter", tags=["UI"], include_in_schema=False)
def serve_recruiter():
    """Serve the recruiter dashboard page."""
    return FileResponse(str(frontend_pages_dir / "recruiter.html"))



@app.get("/health", tags=["Health"])
def health():
    return {
        "status": "ok",
        "service": "TalentLens AI",
        "version": "2.0.0",
        "mode": "fully offline — no API keys required",
    }


@app.get("/jobs", tags=["Jobs"])
def get_jobs():
    """List all available job profiles to match against (built-in + custom)."""
    base_jobs = list_jobs()
    # Merge custom job profiles created via /recruiter/create-job
    custom_dir = Path(__file__).parent / "jobs" / "custom"
    custom_jobs = []
    if custom_dir.exists():
        for f in custom_dir.glob("*.json"):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                custom_jobs.append({
                    "id": data["id"], 
                    "title": data["title"], 
                    "description": data.get("description", ""),
                    "required_skills": data.get("required_skills", []),
                    "nice_to_have_skills": data.get("nice_to_have_skills", []),
                    "min_experience_years": data.get("min_experience_years", 0),
                    "domains": data.get("domains", []),
                    "custom": True
                })
            except Exception:
                pass
    return {"jobs": base_jobs + custom_jobs}


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
        # ── Auto-save to recruiter store ──
        _candidate_store.append({
            **report,
            "_id":          str(uuid.uuid4()),
            "_analyzed_at": datetime.utcnow().isoformat() + "Z",
        })
        return report

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline error: {e}")


# ---------------------------------------------------------------------------
# Recruiter Routes
# ---------------------------------------------------------------------------

@app.get("/recruiter/candidates", tags=["Recruiter"])
def get_recruiter_candidates(
    job_id: Optional[str] = None,
    sort_by: str = "fit_score",
):
    """
    Return ranked candidate leaderboard.

    - `job_id` (optional): filter to a specific role
    - `sort_by`: 'fit_score' (default) | 'analyzed_at'
    """
    candidates = list(_candidate_store)
    if job_id:
        candidates = [c for c in candidates if c.get("job_id") == job_id]

    # Sort
    if sort_by == "analyzed_at":
        candidates = sorted(candidates, key=lambda c: c.get("_analyzed_at", ""), reverse=True)
    else:
        candidates = sorted(candidates, key=lambda c: c.get("fit_score", 0), reverse=True)

    return {
        "total": len(candidates),
        "candidates": candidates,
    }


@app.post("/recruiter/candidates", tags=["Recruiter"])
async def create_recruiter_candidate(
    name: str = Form(...),
    job_id: str = Form(...),
    fit_score: int = Form(default=0),
    recommendation: str = Form(default="Consider"),
    job_title: Optional[str] = Form(default=None),
):
    """Manually add a candidate to the board."""
    candidate = {
        "_id":              str(uuid.uuid4()),
        "candidate_name":   name,
        "job_id":           job_id,
        "job_title":        job_title or job_id,
        "fit_score":        fit_score,
        "recommendation":   recommendation,
        "skills":           [],
        "matched_skills":    [],
        "missing_skills":    [],
        "score_breakdown":  {"skill_match": 0, "project_relevance": 0},
        "_analyzed_at":     datetime.utcnow().isoformat() + "Z",
        "manual":           True
    }
    _candidate_store.append(candidate)
    return {"message": "Candidate added.", "candidate": candidate}


@app.put("/recruiter/candidates/{candidate_id}", tags=["Recruiter"])
async def update_recruiter_candidate(
    candidate_id: str,
    name: str = Form(...),
    fit_score: int = Form(...),
    recommendation: str = Form(...),
    job_title: Optional[str] = Form(default=None),
):
    """Update an existing candidate's details."""
    for c in _candidate_store:
        if c.get("_id") == candidate_id:
            c["candidate_name"] = name
            c["fit_score"] = fit_score
            c["recommendation"] = recommendation
            if job_title:
                c["job_title"] = job_title
            return {"message": "Candidate updated.", "candidate": c}
    raise HTTPException(status_code=404, detail="Candidate not found.")


@app.delete("/recruiter/candidates", tags=["Recruiter"])
def clear_recruiter_candidates():
    """Clear the entire recruiter candidate board."""
    _candidate_store.clear()
    return {"message": "Candidate board cleared.", "total": 0}


@app.delete("/recruiter/candidates/{candidate_id}", tags=["Recruiter"])
def delete_recruiter_candidate(candidate_id: str):
    """Remove a single candidate from the board by ID."""
    global _candidate_store
    before = len(_candidate_store)
    _candidate_store = [c for c in _candidate_store if c.get("_id") != candidate_id]
    if len(_candidate_store) == before:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    return {"message": "Candidate removed.", "total": len(_candidate_store)}


@app.post("/recruiter/create-job", tags=["Recruiter"])
async def create_recruiter_job(
    title: str = Form(..., description="Job title, e.g. 'Frontend Engineer'"),
    description: str = Form(default="", description="Role description"),
    required_skills: str = Form(
        ...,
        description='Required skills as JSON array, e.g. ["React", "TypeScript"]',
    ),
    nice_to_have_skills: str = Form(
        default="[]",
        description='Nice-to-have skills as JSON array',
    ),
    min_experience_years: float = Form(default=0.0, description="Minimum years of experience"),
    domains: str = Form(
        default="[]",
        description='Job domains as JSON array, e.g. ["Frontend", "Web"]',
    ),
):
    """
    Create a custom job posting that appears in /jobs and can be used in /analyze.

    The job profile is saved under jobs/custom/<id>.json.
    """
    try:
        req_skills = json.loads(required_skills)
        nth_skills = json.loads(nice_to_have_skills)
        domains_list = json.loads(domains)
        if not isinstance(req_skills, list):
            raise ValueError("required_skills must be a JSON array")
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON field: {e}")

    # Generate ID from title
    job_id = re.sub(r"[^a-z0-9]+", "_", title.strip().lower()).strip("_")
    job_id = f"custom_{job_id}"

    profile = {
        "id":                   job_id,
        "title":                title.strip(),
        "description":          description.strip(),
        "required_skills":      req_skills,
        "nice_to_have_skills":  nth_skills,
        "soft_skills":          [],
        "min_experience_years": min_experience_years,
        "domains":              domains_list,
    }

    custom_dir = Path(__file__).parent / "jobs" / "custom"
    custom_dir.mkdir(parents=True, exist_ok=True)
    (custom_dir / f"{job_id}.json").write_text(
        json.dumps(profile, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    return {"message": "Job created.", "job_id": job_id, "job": profile}


@app.put("/recruiter/jobs/{job_id}", tags=["Recruiter"])
async def update_recruiter_job(
    job_id: str,
    title: str = Form(..., description="Job title"),
    description: str = Form(default="", description="Role description"),
    required_skills: str = Form(..., description='JSON array of skills'),
    nice_to_have_skills: str = Form(default="[]"),
    min_experience_years: float = Form(default=0.0),
    domains: str = Form(default="[]"),
):
    """Update an existing custom job profile."""
    custom_file = Path(__file__).parent / "jobs" / "custom" / f"{job_id}.json"
    if not custom_file.exists():
        raise HTTPException(status_code=404, detail="Custom job not found.")

    try:
        req_skills = json.loads(required_skills)
        nth_skills = json.loads(nice_to_have_skills)
        domains_list = json.loads(domains)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {e}")

    profile = {
        "id":                   job_id,
        "title":                title.strip(),
        "description":          description.strip(),
        "required_skills":      req_skills,
        "nice_to_have_skills":  nth_skills,
        "min_experience_years": min_experience_years,
        "domains":              domains_list,
    }

    custom_file.write_text(json.dumps(profile, indent=2, ensure_ascii=False), encoding="utf-8")
    return {"message": "Job updated.", "job": profile}


@app.delete("/recruiter/jobs/{job_id}", tags=["Recruiter"])
def delete_recruiter_job(job_id: str):
    """Delete a custom job profile."""
    custom_file = Path(__file__).parent / "jobs" / "custom" / f"{job_id}.json"
    if not custom_file.exists():
        raise HTTPException(status_code=404, detail="Custom job not found.")
    
    custom_file.unlink()
    return {"message": "Job deleted.", "job_id": job_id}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
import re  # needed for job_id slug generation above

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
