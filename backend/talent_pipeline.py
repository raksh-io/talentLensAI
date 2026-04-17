"""
TalentLens AI — Fully Offline Pipeline
========================================
Zero external API dependencies. Runs 100% locally.

Input:
  - Resume file (PDF / DOCX / TXT)
  - Projects list: [{name, description, languages}]
  - Job ID (maps to a job profile JSON in /jobs)

Pipeline stages:
  1. Extract   — resume text + structured skills/exp/edu (resume_analyzer.py)
  2. Load      — job profile from /jobs/*.json
  3. Match     — compare candidate skills vs job requirements (rule-based)
  4. Relevance — score projects against job keywords
  5. Score     — fit_score = skill_match * 70% + project_relevance * 30%
  6. Gaps      — job required skills not found in candidate profile

Output: structured JSON report
"""
from __future__ import annotations

import json
import logging
import re
from pathlib import Path

from resume_analyzer import analyze as analyze_resume

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger("talentlens")

JOBS_DIR = Path(__file__).parent / "jobs"


# ---------------------------------------------------------------------------
# Job Loader
# ---------------------------------------------------------------------------

def load_job(job_id: str) -> dict:
    """Load a job profile JSON from the /jobs directory (or jobs/custom/ for recruiter-created jobs)."""
    path = JOBS_DIR / f"{job_id}.json"
    if not path.exists():
        # Also look in the custom subdirectory
        path = JOBS_DIR / "custom" / f"{job_id}.json"
    if not path.exists():
        available = (
            [f.stem for f in JOBS_DIR.glob("*.json")]
            + [f.stem for f in (JOBS_DIR / "custom").glob("*.json") if (JOBS_DIR / "custom").exists()]
        )
        raise ValueError(f"Job '{job_id}' not found. Available: {available}")
    return json.loads(path.read_text(encoding="utf-8"))


def list_jobs() -> list[dict]:
    """Return all available job profiles (id + title), robustly handling malformed files."""
    jobs = []
    for f in JOBS_DIR.glob("*.json"):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            jobs.append({
                "id": data.get("id", f.stem),
                "title": data.get("title", f.stem)
            })
        except Exception as e:
            logger.warning(f"Skipping malformed job file {f.name}: {e}")
    return jobs


# ---------------------------------------------------------------------------
# Stage 3 — Skill Matching (rule-based)
# ---------------------------------------------------------------------------

def match_skills(
    candidate_skills: list[str],
    job_required: list[str],
    job_nice_to_have: list[str] | None = None,
) -> dict:
    """
    Compare candidate skills against job required skills.

    Matching logic:
      1. Exact match (case-insensitive)
      2. Substring match  — catches "Node" matching "Node.js"
      3. Alias map        — common abbreviations / synonyms

    Gap guarantee: if a strong candidate has no missing required skills,
    up to 2 nice-to-have skills are surfaced as recommended gaps so the
    output is always informative and realistic.

    Returns:
        matched:  skills from job_required found in candidate
        missing:  skills the candidate lacks (required first, then nice-to-have)
        score:    required-skill match percentage 0.0 – 1.0
    """
    # Common aliases: key = job skill (lower), value = equivalent candidate terms
    ALIASES: dict[str, list[str]] = {
        "machine learning":  ["ml", "sklearn", "scikit-learn", "scikit"],
        "deep learning":     ["dl", "neural network", "pytorch", "tensorflow", "keras"],
        "rest apis":         ["rest", "api", "restful", "fastapi", "flask", "django"],
        "ci/cd":             ["github actions", "jenkins", "gitlab ci", "circleci", "travis"],
        "sql":               ["postgresql", "mysql", "sqlite", "mariadb", "postgres"],
        "nosql":             ["mongodb", "couchdb", "dynamodb", "cassandra"],
        "cloud":             ["aws", "gcp", "azure", "ec2", "s3", "lambda"],
        "containers":        ["docker", "kubernetes", "k8s", "podman"],
        "version control":   ["git", "github", "gitlab", "bitbucket"],
        "data analysis":     ["pandas", "numpy", "matplotlib", "seaborn"],
    }

    candidate_lower = {s.lower() for s in candidate_skills}
    matched: list[str] = []
    missing: list[str] = []

    for req_skill in job_required:
        req_lower = req_skill.lower()
        found = False

        # 1. Exact match
        if req_lower in candidate_lower:
            found = True

        # 2. Substring match
        if not found:
            for cand in candidate_lower:
                if req_lower in cand or cand in req_lower:
                    found = True
                    break

        # 3. Alias match
        if not found:
            aliases = ALIASES.get(req_lower, [])
            for alias in aliases:
                if alias in candidate_lower or any(alias in c for c in candidate_lower):
                    found = True
                    break

        if found:
            matched.append(req_skill)
        else:
            missing.append(req_skill)

    total = len(job_required)
    score = len(matched) / total if total > 0 else 1.0

    # Cap missing at 3 items for clean demo output
    missing = missing[:3]

    # If still < 2, pull more from nice-to-have
    if len(missing) < 2 and job_nice_to_have:
        candidate_lower_set = {s.lower() for s in candidate_skills}
        for nice_skill in job_nice_to_have:
            if len(missing) >= 3:
                break
            nl = nice_skill.lower()
            already = any(
                nl in m.lower() or m.lower() in nl
                for m in missing
            )
            if already:
                continue
            found = (
                nl in candidate_lower_set
                or any(nl in c or c in nl for c in candidate_lower_set)
            )
            if not found:
                missing.append(f"{nice_skill} (recommended)")

    return {
        "matched": matched,
        "missing": missing,
        "score":   round(score, 4),
    }


# ---------------------------------------------------------------------------
# Stage 4 — Project Relevance Scoring
# ---------------------------------------------------------------------------

def score_projects(projects: list[dict], job: dict) -> float:
    """
    Score how relevant the candidate's projects are to the job.

    - No projects provided → default score of 0.25 (not penalised to zero,
      since absence of data != absence of projects).
    - Projects provided   → keyword match against job skills + domains.

    Returns: relevance score 0.0 – 1.0
    """
    # --- Default when no projects given: small but non-zero score ---
    if not projects:
        return 0.25

    # Build keyword set from job profile (lowercase)
    keywords: set[str] = set()
    for skill in job.get("required_skills", []) + job.get("nice_to_have_skills", []):
        keywords.add(skill.lower())
        for word in skill.lower().split():
            if len(word) > 2:
                keywords.add(word)
    for domain in job.get("domains", []):
        keywords.add(domain.lower())

    if not keywords:
        return 0.5

    project_scores: list[float] = []

    for project in projects:
        text_parts = [
            project.get("name", ""),
            project.get("description", ""),
            " ".join(project.get("languages", [])),
        ]
        project_text = " ".join(text_parts).lower()

        # Keyword hits — each unique hit adds weight
        hits = sum(1 for kw in keywords if kw in project_text)
        # Divisor: 25% of keywords is considered a strong match
        relevance = min(1.0, hits / max(len(keywords) * 0.25, 1))
        project_scores.append(relevance)

    project_scores.sort(reverse=True)
    if len(project_scores) == 1:
        return round(project_scores[0], 4)

    # Top project: 60%, rest averaged: 40%
    top  = project_scores[0]
    rest = sum(project_scores[1:]) / len(project_scores[1:])
    return round(min(1.0, top * 0.6 + rest * 0.4), 4)


# ---------------------------------------------------------------------------
# Stage 5 — Fit Score
# ---------------------------------------------------------------------------

def compute_fit_score(skill_score: float, project_score: float) -> int:
    """
    Weighted fit score out of 100 — returned as integer.

    Weights:
      Skill match:        70%
      Project relevance:  30%
    """
    raw = (skill_score * 0.70) + (project_score * 0.30)
    return int(round(raw * 100))


# ---------------------------------------------------------------------------
# Stage 6 — Explanation Generator (local, no LLM)
# ---------------------------------------------------------------------------

def generate_explanation(
    candidate_name: str,
    job_title: str,
    fit_score: int,
    matched: list[str],
    missing: list[str],
    projects: list[dict],
    experience: list[dict],
) -> dict:
    """
    Generate structured, demo-friendly output.
    Explanation format:
      "Candidate shows strong skills in X and Y.
       However, lacks Z and A, which are important for this role."
    """
    # --- Recommendation (updated thresholds) ---
    if fit_score >= 70:
        recommendation = "Strong Hire"
        rec_note = "Ready to contribute from day one."
    elif fit_score >= 40:
        recommendation = "Consider"
        rec_note = "Shows potential — a technical interview is advised."
    else:
        recommendation = "No Hire"
        rec_note = "Does not meet the minimum requirements for this role."

    # --- Strengths ---
    strengths: list[str] = []
    if matched:
        strengths.append(
            f"Demonstrates strong proficiency in {', '.join(matched[:5])}"
            + (f" and {len(matched) - 5} more" if len(matched) > 5 else "")
            + "."
        )
    if projects:
        p_names = [p.get("name", "unnamed") for p in projects[:2]]
        strengths.append(f"Has hands-on project experience: {', '.join(p_names)}.")
    if experience:
        roles = [e["role"] for e in experience if e.get("role")][:2]
        if roles:
            strengths.append(
                f"Professional background: {', '.join(roles)}."
            )

    # --- Gaps ---
    clean_required  = [m for m in missing if "(recommended)" not in m]
    clean_optional  = [m.replace(" (recommended)", "") for m in missing if "(recommended)" in m]
    gaps: list[str] = []
    if clean_required:
        gaps.append(
            f"Missing required skill{'s' if len(clean_required) > 1 else ''}: "
            f"{', '.join(clean_required)}."
        )
    if clean_optional:
        gaps.append(
            f"Recommended to add: {', '.join(clean_optional)}."
        )

    # --- Natural one-sentence explanation ---
    strong_skills = matched[:3] if matched else []
    gap_skills    = (clean_required + clean_optional)[:2]

    if strong_skills and gap_skills:
        explanation = (
            f"{candidate_name} shows strong skills in {', '.join(strong_skills)}. "
            f"However, lacks {', '.join(gap_skills)}, "
            f"which are important for this role."
        )
    elif strong_skills:
        explanation = (
            f"{candidate_name} shows strong skills in {', '.join(strong_skills)} "
            f"and is a solid fit for the {job_title} role."
        )
    else:
        explanation = (
            f"{candidate_name} does not sufficiently match the requirements "
            f"for the {job_title} role."
        )

    return {
        "summary":        explanation,
        "strengths":      strengths,
        "gaps":           gaps,
        "recommendation": recommendation,
    }


# ---------------------------------------------------------------------------
# MAIN ENTRY POINT
# ---------------------------------------------------------------------------

def run_pipeline(
    file_bytes: bytes,
    filename: str,
    job_id: str,
    projects: list[dict] | None = None,
    github_url: str | None = None,
    portfolio_url: str | None = None,
) -> dict:
    """
    Run the full offline TalentLens AI pipeline.

    Args:
        file_bytes:  Raw bytes of the resume file (PDF / DOCX / TXT)
        filename:    Original filename (determines format)
        job_id:      Job profile ID, e.g. 'software_engineer'
        projects:    Optional manual projects list:
                     [{"name": str, "description": str, "languages": [str]}, ...]
        github_url:   Optional GitHub profile URL (e.g. https://github.com/username)
                      If provided, repos are scraped and merged with manual projects.
        portfolio_url: Optional portfolio website URL (e.g. https://janedoe.dev)
                      If provided, skills and projects are extracted from the page.

    Returns:
        Structured talent report dict (JSON-serializable).
    """
    projects = list(projects or [])
    github_username = None
    github_top_languages: list[str] = []
    portfolio_skills: list[str] = []
    extra_skills: list[str] = []  # skills found from portfolio, not in resume

    # --- Parallel Scraping (GitHub + Portfolio) ---
    import concurrent.futures

    scraped_gh_projects = []
    scraped_port_projects = []

    def _safe_scrape_github(url):
        try:
            from github_scraper import scrape_github
            return scrape_github(url)
        except Exception as e:
            logger.warning(f"GitHub scraping failed: {e}")
            return None

    def _safe_scrape_portfolio(url):
        try:
            from portfolio_scraper import scrape_portfolio
            return scrape_portfolio(url)
        except Exception as e:
            logger.warning(f"Portfolio scraping failed: {e}")
            return None

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        f_gh = executor.submit(_safe_scrape_github, github_url) if github_url else None
        f_port = executor.submit(_safe_scrape_portfolio, portfolio_url) if portfolio_url else None
        f_resume = executor.submit(analyze_resume, file_bytes, filename)

        # --- Process GitHub data ---
        if f_gh:
            gh_data = f_gh.result()
            if gh_data:
                github_username      = gh_data.get("username", "")
                github_top_languages = gh_data.get("top_languages", [])
                scraped_gh_projects  = gh_data.get("projects", [])
                
                # Merge GitHub projects
                existing_names = {p["name"].lower() for p in projects}
                for repo in scraped_gh_projects:
                    if repo["name"].lower() not in existing_names:
                        projects.append(repo)
                        existing_names.add(repo["name"].lower())

                logger.info(f"GitHub: @{github_username} | {len(scraped_gh_projects)} repos scraped")

        # --- Process Portfolio data ---
        if f_port:
            port_data = f_port.result()
            if port_data:
                portfolio_skills = port_data.get("skills", [])
                scraped_port_projects = port_data.get("projects", [])
                
                # Merge portfolio projects
                existing_names = {p["name"].lower() for p in projects}
                for proj in scraped_port_projects:
                    if proj["name"].lower() not in existing_names:
                        projects.append(proj)
                        existing_names.add(proj["name"].lower())

                logger.info(f"Portfolio: {len(portfolio_skills)} skills, {len(scraped_port_projects)} projects extracted")

        logger.info("Stage 1: Analyzing resume (in parallel)...")
        resume_data = f_resume.result()

    candidate_skills = resume_data.get("skills", [])

    # Merge portfolio skills into candidate skills (deduplicated)
    if portfolio_skills:
        existing_lower = {s.lower() for s in candidate_skills}
        for ps in portfolio_skills:
            if ps.lower() not in existing_lower:
                candidate_skills.append(ps)
                existing_lower.add(ps.lower())
        extra_skills = [
            ps for ps in portfolio_skills
            if ps not in resume_data.get("skills", [])
        ]

    experience = resume_data.get("experience", [])
    education  = resume_data.get("education", [])

    # Candidate name: try first line of resume (basic heuristic)
    candidate_name = _infer_name(resume_data.get("raw_text", ""))

    logger.info(f"  Found {len(candidate_skills)} skills, "
                f"{len(experience)} exp entries, {len(education)} education entries")

    # --- Stage 2: Load Job Profile ---
    logger.info(f"Stage 2: Loading job profile: {job_id}")
    job = load_job(job_id)

    # --- Stage 3: Skill Matching ---
    logger.info("Stage 3: Matching skills...")
    skill_result = match_skills(
        candidate_skills,
        job.get("required_skills", []),
        job.get("nice_to_have_skills", []),
    )

    # --- Stage 4: Project Relevance ---
    logger.info("Stage 4: Scoring project relevance...")
    project_relevance = score_projects(projects, job)

    # --- Stage 5: Fit Score ---
    fit_score = compute_fit_score(skill_result["score"], project_relevance)
    score_label = (
        "Good Fit"     if fit_score >= 70 else
        "Moderate Fit" if fit_score >= 40 else
        "Poor Fit"
    )

    # --- Stage 6: Explanation ---
    # Clean experience: keep only role, company, duration (drop raw description)
    clean_experience = [
        {
            "role":         exp.get("role", ""),
            "organization": exp.get("company", ""),
            "duration":     exp.get("duration", ""),
        }
        for exp in experience
        if exp.get("role") or exp.get("company")
    ]

    explanation = generate_explanation(
        candidate_name=candidate_name,
        job_title=job["title"],
        fit_score=fit_score,
        matched=skill_result["matched"],
        missing=skill_result["missing"],
        projects=projects,
        experience=clean_experience,
    )

    logger.info(f"Pipeline complete. Fit score: {fit_score} ({score_label})")

    # Top 10 skills — matched skills first, then others alphabetically
    matched_set = {s.lower() for s in skill_result["matched"]}
    top_skills  = skill_result["matched"][:10]
    remaining   = [s for s in candidate_skills if s.lower() not in matched_set]
    top_skills += remaining[: max(0, 10 - len(top_skills))]

    return {
        # Candidate info
        "candidate_name":    candidate_name,
        "github_username":   github_username,
        "portfolio_url":     portfolio_url or None,
        "job_title":         job["title"],
        "job_id":            job_id,

        # Skill profile — top 10, matched first
        "skills":            top_skills,
        "portfolio_skills":  extra_skills,
        "experience":        clean_experience,
        "education":         education,
        "projects":          projects,
        "top_languages":     github_top_languages or [],

        # Scoring
        "fit_score":         fit_score,
        "score_label":       score_label,
        "score_breakdown":  {
            "skill_match":       round(skill_result["score"] * 100, 1),
            "project_relevance": round(project_relevance * 100, 1),
            "weights":           {"skill_match": "70%", "project_relevance": "30%"},
        },

        # Match details
        "matched_skills":    skill_result["matched"],
        "missing_skills":    skill_result["missing"],

        # Human-readable output
        "explanation":       explanation["summary"],
        "strengths":         explanation["strengths"],
        "gaps":              explanation["gaps"],
        "recommendation":    explanation["recommendation"],
    }


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _infer_name(text: str) -> str:
    """
    Best-effort: extract candidate name from first non-empty line of résumé.
    Falls back to 'Candidate' if the line looks like a section header or email.
    """
    try:
        if not text:
            return "Candidate"
        for line in text.splitlines():
            line = line.strip()
            if not line:
                continue
            # Skip obvious non-name lines
            if re.search(r"[@|/\\]|resume|cv|curriculum", line, re.IGNORECASE):
                continue
            if len(line.split()) > 5:
                continue  # Too many words — probably not a name
            if len(line) < 3:
                continue
            return line
    except Exception:
        pass
    return "Candidate"
