"""
Pydantic models for candidate skill profiles.
"""
from __future__ import annotations

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class ProficiencyLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class Skill(BaseModel):
    """Represents a single technical skill extracted from a candidate."""

    name: str = Field(..., description="Skill name, e.g. 'Python', 'React', 'Docker'")
    proficiency: ProficiencyLevel = Field(
        default=ProficiencyLevel.INTERMEDIATE,
        description="Self-assessed or inferred proficiency level",
    )
    proficiency_score: float = Field(
        default=3.0,
        ge=1.0,
        le=5.0,
        description="Numeric proficiency score from 1 (beginner) to 5 (expert)",
    )
    source: str = Field(
        default="resume",
        description="Where this skill was detected: 'resume', 'github', or 'both'",
    )
    confidence: float = Field(
        default=0.8,
        ge=0.0,
        le=1.0,
        description="LLM confidence score that this skill is genuinely possessed",
    )

    @field_validator("name")
    @classmethod
    def normalize_name(cls, v: str) -> str:
        return v.strip()


class SkillProfile(BaseModel):
    """
    Complete skill profile for a candidate, extracted and enriched by the AI pipeline.
    This is the primary structured output of the Skill Understanding Layer.
    """

    candidate_name: str = Field(default="Unknown", description="Candidate full name")
    email: Optional[str] = Field(default=None, description="Candidate email if found")
    github_username: Optional[str] = Field(default=None)

    # Skills
    technical_skills: list[Skill] = Field(
        default_factory=list,
        description="All technical skills with proficiency info",
    )
    soft_skills: list[str] = Field(
        default_factory=list,
        description="Soft skills: communication, leadership, etc.",
    )

    # Experience
    experience_years: float = Field(
        default=0.0,
        ge=0.0,
        description="Total years of professional experience",
    )
    domains: list[str] = Field(
        default_factory=list,
        description="High-level domains: 'Web Development', 'Machine Learning', etc.",
    )

    # Background
    education: list[str] = Field(
        default_factory=list,
        description="Education entries, e.g. 'B.Tech Computer Science, IIT Delhi, 2022'",
    )
    certifications: list[str] = Field(
        default_factory=list,
        description="Professional certifications",
    )

    # GitHub signals
    top_languages: list[str] = Field(
        default_factory=list,
        description="Top programming languages from GitHub repos",
    )
    github_activity_score: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Normalized activity score from GitHub contribution data",
    )
    notable_projects: list[str] = Field(
        default_factory=list,
        description="Notable GitHub project names or descriptions",
    )

    def skill_names(self) -> list[str]:
        """Return a flat list of all technical skill names (lowercase)."""
        return [s.name.lower() for s in self.technical_skills]

    def top_skills(self, n: int = 10) -> list[Skill]:
        """Return top N skills sorted by proficiency score descending."""
        return sorted(
            self.technical_skills, key=lambda s: s.proficiency_score, reverse=True
        )[:n]
