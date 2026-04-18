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

import os
import json
import uuid
import re
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from postgrest import SyncPostgrestClient

from talent_pipeline import run_pipeline, list_jobs
from resume_analyzer import analyze as analyze_resume_offline

# ---------------------------------------------------------------------------
# Load Environment & Initialize Supabase
# ---------------------------------------------------------------------------
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("WARNING: SUPABASE_URL or SUPABASE_KEY not set. Persistence will fail.")

# Initialize Postgrest client
if SUPABASE_KEY == "YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE":
    print("CRITICAL: SUPABASE_KEY is still the placeholder. Database operations WILL fail.")
    supabase_db = None
else:
    supabase_db = SyncPostgrestClient(f"{SUPABASE_URL}/rest/v1", headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    })

from contextlib import asynccontextmanager

# ---------------------------------------------------------------------------
# Background Model Pre-warming (Lifespan)
# ---------------------------------------------------------------------------
import threading

def prewarm_models():
    """Load heavy models in a separate thread so startup is fast but first-call is ready."""
    try:
        from resume_analyzer import _get_spacy_model
        from pipeline.matcher.skill_matcher import SkillMatcher
        _get_spacy_model()
        matcher = SkillMatcher()
        matcher._get_model()
    except Exception:
        pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start pre-warming in background
    threading.Thread(target=prewarm_models, daemon=True).start()
    yield
    # Shutdown logic (if any) can go here
    pass

app = FastAPI(
    title="TalentLens AI",
    description="AI-powered Talent Intelligence System — fully offline core with Supabase persistence.",
    version="2.1.0",
    lifespan=lifespan
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

frontend_pages_dir = Path(__file__).parent.parent / "frontend" / "pages"

@app.get("/", tags=["UI"], include_in_schema=False)
def serve_index():
    return FileResponse(str(frontend_pages_dir / "login.html"))

@app.get("/login", tags=["UI"], include_in_schema=False)
def serve_login():
    return FileResponse(str(frontend_pages_dir / "login.html"))

@app.get("/candidate", tags=["UI"], include_in_schema=False)
def serve_candidate():
    return FileResponse(str(frontend_pages_dir / "candidate.html"))

@app.get("/recruiter", tags=["UI"], include_in_schema=False)
def serve_recruiter():
    return FileResponse(str(frontend_pages_dir / "recruiter.html"))


@app.get("/health", tags=["Health"])
def health():
    return {
        "status": "ok",
        "persistence": "supabase" if SUPABASE_URL else "none",
        "mode": "hybrid offline-analysis / online-persistence"
    }


@app.get("/jobs", tags=["Jobs"])
def get_jobs():
    """List all available job profiles (built-in + Supabase custom)."""
    base_jobs = list_jobs()
    
    custom_jobs = []
    try:
        response = supabase_db.table("jobs").select("*").execute()
        custom_jobs = response.data if response.data else []
    except Exception as e:
        print(f"Error fetching custom jobs from Supabase: {e}")
        
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
        
        # ── Auto-save to Supabase ──
        candidate_data = {
            "candidate_name":   report.get("candidate_name", "Unknown"),
            "job_id":           job_id.strip(),
            "job_title":        report.get("job_title", ""),
            "fit_score":        report.get("fit_score", 0),
            "score_label":      report.get("score_label", "Neutral"),
            "matched_skills":    report.get("matched_skills", []),
            "missing_skills":    report.get("missing_skills", []),
            "explanation":       report.get("explanation", ""),
            "recommendation":    report.get("recommendation", "Consider"),
            "analyzed_at":       datetime.utcnow().isoformat() + "Z",
        }
        
        try:
            if supabase_db:
                supabase_db.table("candidates").insert(candidate_data).execute()
            else:
                print("Skipping auto-save: Supabase client not initialized.")
        except Exception as e:
            print(f"ERROR: Failed to auto-save candidate to Supabase. Table: candidates, Error: {e}")

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
    """Return ranked candidate leaderboard from Supabase."""
    try:
        query = supabase_db.table("candidates").select("*")
        if job_id:
            query = query.eq("job_id", job_id)
        
        # Sort
        order_col = "fit_score" if sort_by == "fit_score" else "analyzed_at"
        query = query.order(order_col, desc=True)
        
        response = query.execute()
        candidates = response.data if response.data else []
        
        return {
            "total": len(candidates),
            "candidates": candidates,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@app.post("/recruiter/candidates", tags=["Recruiter"])
async def create_recruiter_candidate(
    name: str = Form(...),
    job_id: str = Form(...),
    fit_score: int = Form(default=0),
    recommendation: str = Form(default="Consider"),
    job_title: Optional[str] = Form(default=None),
    score_label: Optional[str] = Form(default="Neutral"),
):
    """Manually add a candidate to the board via Supabase."""
    candidate = {
        "candidate_name":   name,
        "job_id":           job_id,
        "job_title":        job_title or job_id,
        "fit_score":        fit_score,
        "score_label":      score_label,
        "recommendation":   recommendation,
        "matched_skills":   [],
        "missing_skills":   [],
        "analyzed_at":      datetime.utcnow().isoformat() + "Z",
    }
    
    try:
        if not supabase_db:
             raise Exception("Supabase client not initialized. Check your .env file.")
        response = supabase_db.table("candidates").insert(candidate).execute()
        return {"message": "Candidate added.", "candidate": response.data[0] if response.data else candidate}
    except Exception as e:
        print(f"Database insertion error: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@app.put("/recruiter/candidates/{candidate_id}", tags=["Recruiter"])
async def update_recruiter_candidate(
    candidate_id: str,
    name: str = Form(...),
    fit_score: int = Form(...),
    recommendation: str = Form(...),
    job_title: Optional[str] = Form(default=None),
):
    """Update an existing candidate's details in Supabase."""
    update_data = {
        "candidate_name": name,
        "fit_score": fit_score,
        "recommendation": recommendation
    }
    if job_title:
        update_data["job_title"] = job_title

    try:
        response = supabase_db.table("candidates").update(update_data).eq("id", candidate_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Candidate not found.")
        return {"message": "Candidate updated.", "candidate": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@app.delete("/recruiter/candidates", tags=["Recruiter"])
def clear_recruiter_candidates():
    """Clear the entire recruiter candidate board in Supabase."""
    try:
        # Note: In production, you might want to wrap this or use a restricted policy.
        # This deletes all rows.
        supabase_db.table("candidates").delete().neq("candidate_name", "___").execute()
        return {"message": "Candidate board cleared."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@app.delete("/recruiter/candidates/{candidate_id}", tags=["Recruiter"])
def delete_recruiter_candidate(candidate_id: str):
    """Remove a single candidate from the board by ID in Supabase."""
    try:
        response = supabase_db.table("candidates").delete().eq("id", candidate_id).execute()
        if not response.data:
             raise HTTPException(status_code=404, detail="Candidate not found.")
        return {"message": "Candidate removed."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


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
    """Create a custom job posting in Supabase."""
    try:
        req_skills = json.loads(required_skills)
        nth_skills = json.loads(nice_to_have_skills)
        domains_list = json.loads(domains)
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON field: {e}")

    profile = {
        "title":                title.strip(),
        "description":          description.strip(),
        "required_skills":      req_skills,
        "nice_to_have_skills":  nth_skills,
        "min_experience_years": min_experience_years,
        "domains":              domains_list,
        "custom":               True
    }

    try:
        response = supabase_db.table("jobs").insert(profile).execute()
        return {"message": "Job created.", "job": response.data[0] if response.data else profile}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


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
    """Update an existing custom job profile in Supabase."""
    try:
        req_skills = json.loads(required_skills)
        nth_skills = json.loads(nice_to_have_skills)
        domains_list = json.loads(domains)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {e}")

    profile = {
        "title":                title.strip(),
        "description":          description.strip(),
        "required_skills":      req_skills,
        "nice_to_have_skills":  nth_skills,
        "min_experience_years": min_experience_years,
        "domains":              domains_list,
    }

    try:
        response = supabase_db.table("jobs").update(profile).eq("id", job_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Job not found.")
        return {"message": "Job updated.", "job": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@app.delete("/recruiter/jobs/{job_id}", tags=["Recruiter"])
def delete_recruiter_job(job_id: str):
    """Delete a custom job profile from Supabase."""
    try:
        response = supabase_db.table("jobs").delete().eq("id", job_id).execute()
        if not response.data:
             raise HTTPException(status_code=404, detail="Job not found.")
        return {"message": "Job deleted.", "job_id": job_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


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
