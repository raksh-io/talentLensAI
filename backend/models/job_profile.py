"""
Pydantic models for job/role profiles used in matching.
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class JobProfile(BaseModel):
    """
    Defines a target job role with required and nice-to-have skills.
    Used as the matching target in the Matching Layer.
    """

    id: str = Field(..., description="Unique job profile ID, e.g. 'software_engineer'")
    title: str = Field(..., description="Job title, e.g. 'Senior Software Engineer'")
    description: str = Field(default="", description="Short role description")

    # Skill requirements
    required_skills: list[str] = Field(
        default_factory=list,
        description="Must-have technical skills for this role",
    )
    nice_to_have_skills: list[str] = Field(
        default_factory=list,
        description="Preferred skills that boost candidacy but aren't mandatory",
    )
    soft_skills: list[str] = Field(
        default_factory=list,
        description="Expected soft skills for this role",
    )

    # Experience & domain
    min_experience_years: float = Field(
        default=0.0,
        ge=0.0,
        description="Minimum years of experience required",
    )
    preferred_experience_years: float = Field(
        default=0.0,
        ge=0.0,
        description="Preferred years of experience",
    )
    domains: list[str] = Field(
        default_factory=list,
        description="Key domains for this role, e.g. 'Backend', 'ML', 'Cloud'",
    )

    # Scoring weights — allow customization per role
    weights: dict[str, float] = Field(
        default_factory=lambda: {
            "skill_match": 0.45,
            "experience": 0.20,
            "domain_overlap": 0.20,
            "github_activity": 0.15,
        },
        description="Scoring weight distribution (must sum to 1.0)",
    )

    def all_skills(self) -> list[str]:
        """Flatten required + nice-to-have into a single list."""
        return list(set(self.required_skills + self.nice_to_have_skills))
