"""
Pydantic models for the final TalentLens AI report output.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from .skill_profile import SkillProfile
from .job_profile import JobProfile


class GapImportance(str, Enum):
    CRITICAL = "critical"       # Required skill — blocks consideration
    RECOMMENDED = "recommended"  # Nice-to-have — lowers score
    OPTIONAL = "optional"        # Future growth area


class GapItem(BaseModel):
    """Represents a single skill gap between candidate and job requirements."""

    skill: str = Field(..., description="Missing skill name")
    importance: GapImportance = Field(
        default=GapImportance.RECOMMENDED,
        description="How critical is this gap for the role",
    )
    candidate_level: str = Field(
        default="none",
        description="Candidate's current level: 'none', 'basic', 'some'",
    )
    gap_description: str = Field(
        default="",
        description="Brief explanation of why this skill matters and what the gap is",
    )
    learning_resources: list[str] = Field(
        default_factory=list,
        description="Suggested resources to close this gap",
    )
    estimated_learning_time: Optional[str] = Field(
        default=None,
        description="Rough time estimate to reach required proficiency, e.g. '4-6 weeks'",
    )


class ScoreBreakdown(BaseModel):
    """Detailed breakdown of how the match score was calculated."""

    skill_match_score: float = Field(ge=0.0, le=100.0)
    experience_score: float = Field(ge=0.0, le=100.0)
    domain_overlap_score: float = Field(ge=0.0, le=100.0)
    github_activity_score: float = Field(ge=0.0, le=100.0)
    final_score: float = Field(ge=0.0, le=100.0)

    skill_match_weight: float = 0.45
    experience_weight: float = 0.20
    domain_weight: float = 0.20
    github_weight: float = 0.15


class TalentReport(BaseModel):
    """
    The complete, final output of the TalentLens AI pipeline.
    Contains the skill profile, job match score, gap analysis, and recommendations.
    """

    # Metadata
    analysis_id: str = Field(default="", description="Unique ID for this analysis run")
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    pipeline_version: str = Field(default="1.0.0")

    # Input references
    candidate_name: str
    github_username: Optional[str] = None
    job_title: str
    job_id: str

    # Core outputs
    skill_profile: SkillProfile = Field(
        ..., description="Full structured skill profile of the candidate"
    )
    score_breakdown: ScoreBreakdown = Field(
        ..., description="Detailed scoring breakdown"
    )
    match_score: float = Field(
        ge=0.0,
        le=100.0,
        description="Overall job match score from 0 to 100",
    )

    # Matching details
    matched_skills: list[str] = Field(
        default_factory=list,
        description="Skills the candidate has that match job requirements",
    )
    missing_required_skills: list[str] = Field(
        default_factory=list,
        description="Required skills not found in the candidate's profile",
    )
    missing_nice_to_have: list[str] = Field(
        default_factory=list,
        description="Nice-to-have skills the candidate lacks",
    )

    # Gap analysis
    skill_gaps: list[GapItem] = Field(
        default_factory=list,
        description="Detailed gap analysis with learning recommendations",
    )

    # LLM-generated insights
    strengths: list[str] = Field(
        default_factory=list,
        description="Key strengths of this candidate for the role",
    )
    recommendations: list[str] = Field(
        default_factory=list,
        description="Actionable recommendations for the candidate",
    )
    hiring_recommendation: str = Field(
        default="",
        description="One of: 'Strong Hire', 'Hire', 'Maybe', 'No Hire'",
    )
    summary: str = Field(
        default="",
        description="2-3 sentence executive summary of the analysis",
    )

    def score_label(self) -> str:
        """Convert numeric score to a human-readable label."""
        if self.match_score >= 85:
            return "Excellent Match"
        elif self.match_score >= 70:
            return "Good Match"
        elif self.match_score >= 55:
            return "Partial Match"
        elif self.match_score >= 40:
            return "Weak Match"
        else:
            return "Poor Match"
