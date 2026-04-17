"""
TalentLens AI — Offline Resume Analyzer
=========================================
Extracts structured information from a PDF or DOCX resume
using rule-based NLP techniques. No external APIs required.

Input:  PDF or DOCX resume file
Output: {
    "skills": [...],
    "experience": [...],
    "education": [...]
}

Libraries used:
  - pdfplumber  : PDF text extraction
  - python-docx : DOCX text extraction
  - spaCy       : NLP (NER for names/orgs, sentence splitting)
                  Falls back gracefully if model not installed.
  - re / string : Rule-based keyword & section parsing
"""
from __future__ import annotations

import io
import json
import logging
import re
from pathlib import Path
from typing import Union

logger = logging.getLogger(__name__)
_SKILLS_REGEX = None

# ---------------------------------------------------------------------------
# SKILLS KNOWLEDGE BASE
# A curated, categorised keyword list for rule-based matching.
# ---------------------------------------------------------------------------

SKILLS_KB: dict[str, list[str]] = {
    "Programming Languages": [
        "Python", "JavaScript", "TypeScript", "Java", "C", "C++", "C#", "Go",
        "Rust", "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R", "MATLAB",
        "Perl", "Shell", "Bash", "PowerShell", "Dart", "Elixir", "Haskell",
        "Lua", "Julia", "Groovy", "Assembly",
    ],
    "Web & Frontend": [
        "React", "Angular", "Vue", "Next.js", "Nuxt", "Svelte", "HTML", "CSS",
        "SASS", "SCSS", "Tailwind", "Bootstrap", "jQuery", "Redux", "GraphQL",
        "REST", "REST APIs", "WebSockets", "Webpack", "Vite",
    ],
    "Backend & Frameworks": [
        "Node.js", "Express", "FastAPI", "Django", "Flask", "Spring", "Spring Boot",
        "Laravel", "Rails", "ASP.NET", "Gin", "Echo", "NestJS", "Fastify",
        "Hapi", "Koa", "Tornado",
    ],
    "Databases": [
        "SQL", "PostgreSQL", "MySQL", "SQLite", "MongoDB", "Redis", "Cassandra",
        "DynamoDB", "Elasticsearch", "Neo4j", "MariaDB", "Oracle", "Firebase",
        "Supabase", "CouchDB", "InfluxDB",
    ],
    "Cloud & DevOps": [
        "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform", "Ansible",
        "Jenkins", "GitHub Actions", "CI/CD", "Helm", "Prometheus", "Grafana",
        "Nginx", "Apache", "Linux", "Unix", "Vagrant", "Pulumi",
    ],
    "Data Science & ML": [
        "Machine Learning", "Deep Learning", "NLP", "Computer Vision",
        "TensorFlow", "PyTorch", "Keras", "scikit-learn", "pandas", "NumPy",
        "Matplotlib", "Seaborn", "Spark", "Hadoop", "Hive", "MLflow",
        "Hugging Face", "OpenCV", "NLTK", "spaCy", "XGBoost", "LightGBM",
        "BERT", "GPT", "LLM", "Reinforcement Learning",
    ],
    "Tools & Practices": [
        "Git", "GitHub", "GitLab", "Bitbucket", "Jira", "Confluence", "Agile",
        "Scrum", "Kanban", "TDD", "BDD", "Unit Testing", "Integration Testing",
        "Jest", "Pytest", "Mocha", "Selenium", "Cypress", "Postman",
        "VS Code", "IntelliJ", "Figma", "Notion",
    ],
    "Mobile": [
        "React Native", "Flutter", "Android", "iOS", "Swift", "Kotlin",
        "Xamarin", "Ionic",
    ],
}

# Flat set for fast O(1) lookup (lowercase)
ALL_SKILLS_LOWER: dict[str, str] = {
    skill.lower(): skill for skills in SKILLS_KB.values() for skill in skills
}

# ---------------------------------------------------------------------------
# Section header keywords
# ---------------------------------------------------------------------------

SECTION_PATTERNS = {
    "experience": re.compile(
        r"^\s*(work\s+experience|professional\s+experience|experience|employment"
        r"|work\s+history|career\s+history|positions?\s+held)\s*$",
        re.IGNORECASE,
    ),
    "education": re.compile(
        r"^\s*(education|educational\s+background|academic\s+background"
        r"|qualifications?|degrees?)\s*$",
        re.IGNORECASE,
    ),
    "skills": re.compile(
        r"^\s*(skills?|technical\s+skills?|core\s+competencies|competencies"
        r"|technologies|tech\s+stack|expertise)\s*$",
        re.IGNORECASE,
    ),
    "summary": re.compile(
        r"^\s*(summary|profile|objective|about\s+me|professional\s+summary"
        r"|career\s+objective)\s*$",
        re.IGNORECASE,
    ),
    "projects": re.compile(
        r"^\s*(projects?|personal\s+projects?|side\s+projects?|open\s+source)\s*$",
        re.IGNORECASE,
    ),
    "certifications": re.compile(
        r"^\s*(certifications?|certificates?|licenses?|credentials?)\s*$",
        re.IGNORECASE,
    ),
}

# Date pattern: matches "Jan 2020 – Present", "2019-2022", "Mar 2018 - Jun 2021", etc.
DATE_RANGE_RE = re.compile(
    r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?\d{4}"
    r"\s*[-–—to]+\s*"
    r"(?:((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?\d{4}|Present|Current|Now)",
    re.IGNORECASE,
)

DEGREE_RE = re.compile(
    r"\b(B\.?Tech|B\.?E\.?|B\.?Sc\.?|B\.?A\.?|M\.?Tech|M\.?Sc\.?|M\.?A\.?|MBA"
    r"|Ph\.?D\.?|Bachelor|Master|Doctor|Associate|Diploma|HND|BCA|MCA)\b",
    re.IGNORECASE,
)

YEAR_RE = re.compile(r"\b(19[5-9]\d|20[0-3]\d)\b")


# ===========================================================================
# TEXT EXTRACTION
# ===========================================================================

def extract_text(file_bytes: bytes, filename: str) -> str:
    """
    Extract plain text from a PDF or DOCX file.

    Args:
        file_bytes: Raw bytes of the file.
        filename:   Original filename (determines format).

    Returns:
        Extracted plain text string.
    """
    suffix = Path(filename).suffix.lower()

    if suffix == ".pdf":
        return _extract_pdf(file_bytes)
    elif suffix in (".docx", ".doc"):
        return _extract_docx(file_bytes)
    elif suffix in (".txt", ".md"):
        return file_bytes.decode("utf-8", errors="ignore")
    else:
        raise ValueError(f"Unsupported format: {suffix}. Use .pdf, .docx, or .txt")


def _extract_pdf(data: bytes) -> str:
    try:
        import pdfplumber
    except ImportError:
        raise ImportError("Run: pip install pdfplumber")

    pages: list[str] = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages.append(text)

    if not pages:
        raise ValueError("No text found in PDF. It may be image-based.")
    return "\n\n".join(pages)


def _extract_docx(data: bytes) -> str:
    try:
        from docx import Document
    except ImportError:
        raise ImportError("Run: pip install python-docx")

    doc = Document(io.BytesIO(data))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs)


# ===========================================================================
# SECTION PARSER — splits raw text into named sections
# ===========================================================================

def _split_into_sections(text: str) -> dict[str, str]:
    """
    Detect section headers and split the resume text into labelled chunks.
    Returns dict: { "experience": "...", "education": "...", ... }
    """
    lines = text.splitlines()
    sections: dict[str, list[str]] = {"header": []}
    current = "header"

    for line in lines:
        stripped = line.strip()
        matched = False
        for section_name, pattern in SECTION_PATTERNS.items():
            if pattern.match(stripped):
                current = section_name
                sections.setdefault(current, [])
                matched = True
                break
        if not matched:
            sections.setdefault(current, []).append(line)

    return {k: "\n".join(v) for k, v in sections.items()}


# ===========================================================================
# SKILL EXTRACTION — rule-based keyword matching
# ===========================================================================

def extract_skills(text: str) -> list[str]:
    """
    Extract skills using:
    1. Keyword lookup against the skills knowledge base.
    2. spaCy NER (ORG/PRODUCT entities) as supplemental signal — optional.

    Returns a deduplicated, sorted list of skills found.
    """
    found: set[str] = set()

    # Rule 1: keyword match (whole-word, case-insensitive) against SKILLS_KB
    # OPTIMIZED: Use a single combined regex for O(M) search instead of O(N*M)
    global _SKILLS_REGEX
    if _SKILLS_REGEX is None:
        # Sort by length descending to ensure "C++" matches before "C"
        sorted_keys = sorted(ALL_SKILLS_LOWER.keys(), key=len, reverse=True)
        pattern_str = r"\b(" + "|".join(re.escape(k) for k in sorted_keys) + r")\b"
        _SKILLS_REGEX = re.compile(pattern_str, re.IGNORECASE)

    for match in _SKILLS_REGEX.finditer(text):
        skill_lower = match.group(0).lower()
        if skill_lower in ALL_SKILLS_LOWER:
            found.add(ALL_SKILLS_LOWER[skill_lower])

    # Rule 2: spaCy NER — picks up tech names the keyword list might miss
    try:
        import spacy
        nlp = _get_spacy_model()
        if nlp:
            doc = nlp(text[:50000])  # Limit to avoid memory issues
            for ent in doc.ents:
                if ent.label_ in ("ORG", "PRODUCT"):
                    candidate = ent.text.strip()
                    cl = candidate.lower()
                    if cl in ALL_SKILLS_LOWER:
                        found.add(ALL_SKILLS_LOWER[cl])
    except Exception:
        pass  # spaCy is optional

    return sorted(found)


_spacy_model = None

def _get_spacy_model():
    """Lazy-load the spaCy model, returns None if not available."""
    global _spacy_model
    if _spacy_model is not None:
        return _spacy_model
    try:
        import spacy
        _spacy_model = spacy.load("en_core_web_sm")
        return _spacy_model
    except Exception:
        logger.warning("spaCy model 'en_core_web_sm' not found. Using keyword-only extraction.")
        return None


# ===========================================================================
# EXPERIENCE EXTRACTION — rule-based date + block detection
# ===========================================================================

def extract_experience(text: str, sections: dict[str, str]) -> list[dict]:
    """
    Extract work experience entries.

    Strategy:
    - Look in the 'experience' section first.
    - Find blocks that contain a date range (strong signal of a job entry).
    - Extract: company/role (nearby text), date range, description bullets.
    """
    section_text = sections.get("experience", "") or text
    return _parse_experience_blocks(section_text)


def _parse_experience_blocks(text: str) -> list[dict]:
    """
    Split experience text into entry blocks wherever a date range appears.
    Each block is parsed for role, company, dates, and description.
    """
    entries: list[dict] = []

    # Split on date ranges — each match anchors a new job entry
    parts = DATE_RANGE_RE.split(text)

    # Re-attach date ranges: DATE_RANGE_RE has 3 groups, so split gives chunks interleaved
    # Reconstruct: (block_text, date_string) pairs
    i = 0
    blocks: list[tuple[str, str]] = []
    # Collect all match positions to reconstruct
    for match in DATE_RANGE_RE.finditer(text):
        full_date = match.group(0)
        before = text[i:match.start()].strip()
        blocks.append((before, full_date))
        i = match.end()
    # Remaining text after last date
    if i < len(text):
        trailing = text[i:].strip()
        if blocks:
            # Attach trailing text to the last block as description
            last_before, last_date = blocks[-1]
            blocks[-1] = (last_before, last_date)
            if trailing:
                blocks.append((trailing, ""))

    # Parse each block
    for before_text, date_str in blocks:
        if not before_text and not date_str:
            continue

        lines = [ln.strip() for ln in before_text.splitlines() if ln.strip()]
        if not lines:
            continue

        # Heuristic: last non-empty line before the date is the role/company line
        role_line = lines[-1] if lines else ""
        description_lines = lines[:-1] if len(lines) > 1 else []

        # Try to split role_line into role | company (common separators: "at", "—", "|", ",")
        role, company = _split_role_company(role_line)

        # Strip any remaining open-parenthesis fragments from company/role
        company = re.sub(r"\s*\(.*", "", company).strip().rstrip("-–—|, ")
        role    = re.sub(r"^[\-\•\*]\s*", "", role).strip()

        entry = {
            "role": role,
            "company": company,
            "duration": date_str.strip(),
            "description": _clean_bullets(description_lines),
        }
        # Only add if there's at least a role or date
        if entry["role"] or entry["duration"]:
            entries.append(entry)

    # Fallback: if nothing parsed but section has content, return raw lines
    if not entries and text.strip():
        entries = _fallback_experience(text)

    return entries


def _split_role_company(line: str) -> tuple[str, str]:
    """Split 'Software Engineer at TechCorp' → ('Software Engineer', 'TechCorp')."""
    # Remove anything in parentheses (e.g. date ranges embedded in the line)
    line = re.sub(r"\(.*?\)", "", line).strip()
    # Remove trailing punctuation
    line = line.rstrip("-–—|, ")

    for sep in [" at ", " — ", " | ", " – ", " - "]:
        if sep in line:
            parts = line.split(sep, 1)
            return parts[0].strip(), parts[1].strip().rstrip("-–—|, ")

    # Comma split only if both parts look non-trivial
    if ", " in line:
        parts = line.split(", ", 1)
        if len(parts[0]) > 3 and len(parts[1]) > 3:
            return parts[0].strip(), parts[1].strip()

    return line.strip(), ""


def _clean_bullets(lines: list[str]) -> list[str]:
    """Strip bullet characters from description lines. Skip junk lines."""
    cleaned = []
    for ln in lines:
        ln = re.sub(r"^[\•\-\*\>\·\◦\–]\s*", "", ln).strip()
        # Skip lines that are just punctuation or very short noise
        if ln and len(ln) > 2 and not re.fullmatch(r"[\W_]+", ln):
            cleaned.append(ln)
    return cleaned


def _fallback_experience(text: str) -> list[dict]:
    """Last resort: return each paragraph as a raw experience entry."""
    paras = [p.strip() for p in text.split("\n\n") if p.strip()]
    return [{"role": "", "company": "", "duration": "", "description": [p]} for p in paras[:5]]


# ===========================================================================
# EDUCATION EXTRACTION — degree + institution detection
# ===========================================================================

def extract_education(text: str, sections: dict[str, str]) -> list[dict]:
    """
    Extract education entries.

    Strategy:
    - Look in the 'education' section.
    - Find lines containing degree keywords or year patterns.
    - Group nearby lines as a single education entry.
    """
    section_text = sections.get("education", "") or text
    return _parse_education_blocks(section_text)


def _parse_education_blocks(text: str) -> list[dict]:
    entries: list[dict] = []
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]

    i = 0
    while i < len(lines):
        line = lines[i]

        # Anchor: line contains a degree keyword or a 4-digit year
        if DEGREE_RE.search(line) or YEAR_RE.search(line):
            entry_lines = [line]

            # Grab up to 3 surrounding lines as context
            for j in range(i + 1, min(i + 4, len(lines))):
                next_line = lines[j]
                # Stop if we hit another education anchor in a new block
                if (DEGREE_RE.search(next_line) or YEAR_RE.search(next_line)) and j != i + 1:
                    break
                entry_lines.append(next_line)
                i = j

            entry = _parse_single_education(entry_lines)
            if entry:
                entries.append(entry)

        i += 1

    # Dedup by degree+institution
    seen = set()
    deduped = []
    for e in entries:
        key = (e.get("degree", ""), e.get("institution", ""))
        if key not in seen and any(key):
            seen.add(key)
            deduped.append(e)

    return deduped


def _parse_single_education(lines: list[str]) -> dict | None:
    """Parse a small block of lines into one education entry."""
    full = " | ".join(lines)

    degree_match = DEGREE_RE.search(full)
    degree = degree_match.group(0) if degree_match else ""

    # Year: pick last year found (graduation year)
    years = YEAR_RE.findall(full)
    year = years[-1] if years else ""

    # Institution heuristic: longest line that isn't just the degree line
    institution = ""
    for ln in lines:
        if not DEGREE_RE.search(ln) and len(ln) > len(institution):
            institution = ln

    # Field of study: text close to the degree keyword (after the degree word)
    field = ""
    if degree_match:
        after = full[degree_match.end():].strip().lstrip(".,–-in ").split("|")[0].strip()
        # Only keep if it looks like a subject (no stray year/institution)
        if after and not YEAR_RE.search(after) and len(after) < 60:
            field = after

    if not degree and not institution:
        return None

    return {
        "degree": degree,
        "field": field,
        "institution": institution.strip(),
        "year": year,
    }


# ===========================================================================
# MAIN ENTRY POINT
# ===========================================================================

def analyze(file_bytes: bytes, filename: str) -> dict:
    """
    Full offline resume analysis pipeline.

    Args:
        file_bytes: Raw bytes of the resume (PDF or DOCX).
        filename:   Original filename.

    Returns:
        {
            "skills": ["Python", "React", ...],
            "experience": [{"role": ..., "company": ..., "duration": ..., "description": [...]}, ...],
            "education": [{"degree": ..., "field": ..., "institution": ..., "year": ...}, ...]
        }
    """
    logger.info(f"Analyzing resume: {filename}")

    # Step 1: Extract raw text
    raw_text = extract_text(file_bytes, filename)
    logger.info(f"Extracted {len(raw_text)} characters")

    # Step 2: Split into sections
    sections = _split_into_sections(raw_text)
    logger.info(f"Detected sections: {list(sections.keys())}")

    # Step 3: Extract each component
    skills     = extract_skills(raw_text)
    experience = extract_experience(raw_text, sections)
    education  = extract_education(raw_text, sections)

    logger.info(f"Found: {len(skills)} skills, {len(experience)} exp entries, {len(education)} education entries")

    return {
        "skills":     skills,
        "experience": experience,
        "education":  education,
        "raw_text":   raw_text,
    }


# ===========================================================================
# CLI — run directly: python resume_analyzer.py path/to/resume.pdf
# ===========================================================================

if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

    if len(sys.argv) < 2:
        print("Usage: python resume_analyzer.py <path/to/resume.pdf|docx|txt>")
        sys.exit(1)

    path = Path(sys.argv[1])
    if not path.exists():
        print(f"File not found: {path}")
        sys.exit(1)

    result = analyze(path.read_bytes(), path.name)
    print(json.dumps(result, indent=2))
