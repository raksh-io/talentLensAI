"""
SkillAnalyzer: Uses Google Gemini to extract a structured SkillProfile
from raw resume text and GitHub data.

This is the core of the Skill Understanding Layer — it converts unstructured
candidate data into a validated Pydantic SkillProfile.
"""
from __future__ import annotations

import json
import logging
import os
import re
from typing import Optional

from models.skill_profile import Skill, SkillProfile, ProficiencyLevel

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Prompt Templates
# ---------------------------------------------------------------------------

SKILL_EXTRACTION_PROMPT = """You are TalentLens AI, an expert technical recruiter and skill analyst.
Your task is to analyze a candidate's resume and GitHub activity data, then produce a structured skill profile.

## Resume Text:
{resume_text}

## GitHub Data:
{github_summary}

---

Analyze the above and return a JSON object that exactly matches this schema:
{{
  "candidate_name": "string — full name from resume or 'Unknown'",
  "email": "string or null",
  "technical_skills": [
    {{
      "name": "skill name (e.g. Python, React, Docker)",
      "proficiency": "beginner|intermediate|advanced|expert",
      "proficiency_score": 1.0-5.0,
      "source": "resume|github|both",
      "confidence": 0.0-1.0
    }}
  ],
  "soft_skills": ["string", ...],
  "experience_years": float,
  "domains": ["Web Development", "Machine Learning", "DevOps", etc.],
  "education": ["degree, institution, year", ...],
  "certifications": ["cert name", ...],
  "top_languages": ["Python", "JavaScript", ...],
  "github_activity_score": 0.0-1.0,
  "notable_projects": ["project name or description", ...]
}}

Guidelines:
- Infer proficiency from context: years of experience, project complexity, certifications.
- If a skill appears in both resume AND GitHub with evidence, set source="both" and boost confidence.
- Normalize skill names: use industry-standard capitalizations (e.g. "TypeScript" not "typescript").
- Do NOT invent skills not evidenced in the data. Set confidence accordingly.
- experience_years: estimate total professional experience from dates in the resume.
- Return ONLY valid JSON. No markdown, no explanations, no code blocks.
"""


class SkillAnalyzer:
    """
    Extracts and structures a SkillProfile from resume text + GitHub data
    using Google Gemini's LLM.

    Usage:
        analyzer = SkillAnalyzer()
        profile = analyzer.analyze(
            resume_text="...",
            github_data={...}  # from GitHubExtractor
        )
    """

    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-1.5-flash"):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model_name = model

        if not self.api_key:
            raise ValueError(
                "GEMINI_API_KEY is not set. Add it to .env or pass it directly."
            )

        self._client = None  # Lazy initialization

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def analyze(
        self,
        resume_text: str,
        github_data: Optional[dict] = None,
    ) -> SkillProfile:
        """
        Analyze candidate data and return a validated SkillProfile.

        Args:
            resume_text: Raw extracted text from the resume.
            github_data: Structured dict from GitHubExtractor (optional).

        Returns:
            Validated SkillProfile instance.
        """
        github_summary = self._format_github_summary(github_data)
        prompt = SKILL_EXTRACTION_PROMPT.format(
            resume_text=resume_text[:6000],  # Stay within context limits
            github_summary=github_summary[:2000],
        )

        logger.info("Sending prompt to Gemini for skill extraction...")
        raw_response = self._call_gemini(prompt)
        logger.info("Gemini response received. Parsing JSON...")

        profile = self._parse_and_validate(raw_response, github_data)

        # Merge GitHub activity score directly from extractor (authoritative)
        if github_data and "activity_score" in github_data:
            profile.github_activity_score = github_data["activity_score"]

        logger.info(
            f"SkillProfile built: {len(profile.technical_skills)} skills, "
            f"{profile.experience_years} yrs exp, domains={profile.domains}"
        )
        return profile

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _get_client(self):
        """Lazy-load the Gemini client."""
        if self._client is None:
            try:
                import google.generativeai as genai
            except ImportError as e:
                raise ImportError(
                    "google-generativeai is required. Run: pip install google-generativeai"
                ) from e
            genai.configure(api_key=self.api_key)
            self._client = genai.GenerativeModel(self.model_name)
        return self._client

    def _call_gemini(self, prompt: str) -> str:
        """Send prompt to Gemini and return response text."""
        client = self._get_client()
        response = client.generate_content(
            prompt,
            generation_config={
                "temperature": 0.1,       # Low temp for deterministic JSON
                "max_output_tokens": 2048,
            },
        )
        return response.text

    def _parse_and_validate(
        self, raw: str, github_data: Optional[dict]
    ) -> SkillProfile:
        """Parse LLM JSON output and validate into a SkillProfile."""
        # Strip markdown code fences if present
        clean = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()

        try:
            data = json.loads(clean)
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse failed. Raw response:\n{raw[:500]}")
            raise RuntimeError(f"Gemini returned invalid JSON: {e}") from e

        # Normalize proficiency levels safely
        for skill_data in data.get("technical_skills", []):
            prof = skill_data.get("proficiency", "intermediate")
            if prof not in ProficiencyLevel.__members__.values():
                skill_data["proficiency"] = "intermediate"

        # Merge top_languages from GitHub extractor (more authoritative)
        if github_data and github_data.get("top_languages"):
            data["top_languages"] = github_data["top_languages"]

        # Merge github_username if available
        if github_data and github_data.get("profile", {}).get("username"):
            data["github_username"] = github_data["profile"]["username"]

        try:
            return SkillProfile(**data)
        except Exception as e:
            logger.error(f"Pydantic validation failed: {e}")
            raise RuntimeError(f"SkillProfile validation error: {e}") from e

    @staticmethod
    def _format_github_summary(github_data: Optional[dict]) -> str:
        """Format GitHub data into a compact text summary for the prompt."""
        if not github_data:
            return "No GitHub data provided."

        profile = github_data.get("profile", {})
        repos = github_data.get("repos", [])
        top_langs = github_data.get("top_languages", [])

        lines = [
            f"GitHub Username: {profile.get('username', 'N/A')}",
            f"Bio: {profile.get('bio', 'N/A')}",
            f"Public Repos: {profile.get('public_repos', 0)}",
            f"Followers: {profile.get('followers', 0)}",
            f"Top Languages: {', '.join(top_langs) or 'None'}",
            f"Total Stars: {github_data.get('total_stars', 0)}",
            "",
            "== Top Repositories ==",
        ]

        for repo in repos[:10]:
            topics = ", ".join(repo.get("topics", []))
            lines.append(
                f"- {repo['name']} ({repo.get('language', '?')}) | "
                f"⭐{repo['stars']} | Topics: {topics or 'none'} | "
                f"{repo.get('description', '')[:100]}"
            )
            if repo.get("readme_snippet"):
                lines.append(f"  README: {repo['readme_snippet'][:200]}")

        return "\n".join(lines)
