# TalentLens AI 🔍

> AI-powered Talent Intelligence System — Hackathon MVP

Analyze a candidate's **resume + GitHub profile** and generate:
- 📊 **Skill Profile** — technical skills, experience, domains
- 🎯 **Job Match Score** — 0 to 100
- 🔎 **Skill Gap Analysis** — what's missing + how to fix it

---

## Quick Start

### 1. Clone & install
```bash
cd talentlenseAi
pip install -r requirements.txt
```

### 2. Set up environment
```bash
copy .env.example .env
# Edit .env and add your GEMINI_API_KEY and GITHUB_TOKEN
```

### 3. Run the API
```bash
python main.py
```
API docs available at: **http://localhost:8000/docs**

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/jobs` | List available job profiles |
| POST | `/analyze` | Run full AI pipeline |

### POST /analyze (form-data)
| Field | Type | Description |
|-------|------|-------------|
| `resume` | File | Resume (.pdf or .txt) |
| `github_username` | string | Candidate's GitHub username |
| `job_id` | string | e.g. `software_engineer`, `data_scientist`, `devops_engineer` |

---

## Pipeline Architecture

```
Resume (PDF/TXT)  +  GitHub Username  +  Job ID
         ↓
[1] Extract resume text       (pdfplumber)
[2] Fetch GitHub data         (PyGithub)
[3] Load job profile          (JSON)
[4] Gemini AI analysis        (skill extraction + matching)
[5] Compute match score       (weighted formula)
[6] Build gap analysis        (missing skills + resources)
         ↓
        JSON Report
```

---

## Sample Output

```json
{
  "candidate_name": "Jane Doe",
  "job_title": "Software Engineer",
  "match_score": 76.5,
  "match_label": "Good Match",
  "score_breakdown": {
    "skill_match": 85.0,
    "experience": 90.0,
    "domain_overlap": 100.0,
    "github_activity": 42.0
  },
  "matched_skills": ["Python", "REST APIs", "SQL", "Git"],
  "missing_required": ["Data Structures"],
  "skill_gaps": [
    { "skill": "Data Structures", "importance": "critical", "resource": "..." },
    { "skill": "Kubernetes", "importance": "recommended", "resource": "..." }
  ],
  "hiring_recommendation": "Hire",
  "summary": "Strong backend engineer with solid Python and API experience..."
}
```

---

## Job Profiles

Available in `/jobs/`:
- `software_engineer`
- `data_scientist`
- `devops_engineer`

Add your own by dropping a JSON file in `/jobs/` following the same schema.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ Yes | Google AI Studio API key |
| `GITHUB_TOKEN` | ⚠️ Recommended | Increases GitHub API rate limit from 60 to 5000 req/hr |
