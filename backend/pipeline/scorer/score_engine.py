"""
ScoreEngine: Computes a 0-100 match score from pipeline components.

Formula (weights configurable per job profile):
  score = skill_match  * 0.45
        + experience   * 0.20
        + domain       * 0.20
        + github       * 0.15
"""
from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass
class ScoreBreakdown:
    skill_match: float      # 0-100
    experience: float       # 0-100
    domain_overlap: float   # 0-100
    github_activity: float  # 0-100
    final: float            # 0-100


class ScoreEngine:
    """
    Weighted scoring engine.

    Usage:
        engine = ScoreEngine()
        breakdown = engine.score(
            matched_required=3, total_required=5,
            matched_nice=2,     total_nice=4,
            candidate_years=2,  required_years=1,
            candidate_domains=["Backend"], job_domains=["Backend", "Cloud"],
            github_activity_score=0.7,
            weights={"skill_match": 0.45, "experience": 0.20,
                     "domain_overlap": 0.20, "github_activity": 0.15},
        )
    """

    def score(
        self,
        matched_required: int,
        total_required: int,
        matched_nice: int,
        total_nice: int,
        candidate_years: float,
        required_years: float,
        candidate_domains: list[str],
        job_domains: list[str],
        github_activity_score: float,
        weights: dict[str, float] | None = None,
    ) -> ScoreBreakdown:

        w = weights or {
            "skill_match": 0.45,
            "experience": 0.20,
            "domain_overlap": 0.20,
            "github_activity": 0.15,
        }

        # 1. Skill match score (required = full weight, nice-to-have = 30% bonus)
        req_pct  = matched_required / max(total_required, 1)
        nice_pct = matched_nice / max(total_nice, 1) if total_nice else 1.0
        skill_score = (req_pct * 0.7 + nice_pct * 0.3) * 100

        # 2. Experience score (sigmoid-ish: meeting requirement = 85, exceeding = 100)
        if required_years <= 0:
            exp_score = 100.0
        else:
            ratio = candidate_years / required_years
            exp_score = min(100.0, 85.0 * ratio + 15.0 * math.tanh(ratio - 1))

        # 3. Domain overlap
        if not job_domains:
            domain_score = 100.0
        else:
            cand_set = {d.lower() for d in candidate_domains}
            job_set  = {d.lower() for d in job_domains}
            overlap  = len(cand_set & job_set) / len(job_set)
            domain_score = overlap * 100

        # 4. GitHub activity (already 0-1)
        github_score = github_activity_score * 100

        # Weighted final
        final = (
            skill_score   * w.get("skill_match", 0.45)
            + exp_score   * w.get("experience", 0.20)
            + domain_score * w.get("domain_overlap", 0.20)
            + github_score * w.get("github_activity", 0.15)
        )
        final = round(min(100.0, max(0.0, final)), 1)

        return ScoreBreakdown(
            skill_match=round(skill_score, 1),
            experience=round(exp_score, 1),
            domain_overlap=round(domain_score, 1),
            github_activity=round(github_score, 1),
            final=final,
        )
