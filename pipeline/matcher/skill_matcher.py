"""
SkillMatcher: Matches candidate skills to job requirements using a hybrid approach:
  1. Exact/fuzzy string matching (fast, free)
  2. Semantic similarity via sentence-transformers (handles synonyms)

Returns matched skills, unmatched skills, and similarity scores.
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)

# Similarity threshold — skills with score >= this are considered a match
DEFAULT_MATCH_THRESHOLD = float(os.getenv("MATCH_THRESHOLD", "0.72"))


@dataclass
class MatchResult:
    """Output of SkillMatcher.match()."""

    matched_required: list[str] = field(default_factory=list)
    matched_nice_to_have: list[str] = field(default_factory=list)
    unmatched_required: list[str] = field(default_factory=list)
    unmatched_nice_to_have: list[str] = field(default_factory=list)

    # Similarity scores for each required skill
    required_scores: dict[str, float] = field(default_factory=dict)

    @property
    def required_match_pct(self) -> float:
        """Percentage of required skills matched (0.0–1.0)."""
        total = len(self.matched_required) + len(self.unmatched_required)
        if total == 0:
            return 1.0
        return len(self.matched_required) / total

    @property
    def nice_to_have_match_pct(self) -> float:
        """Percentage of nice-to-have skills matched (0.0–1.0)."""
        total = len(self.matched_nice_to_have) + len(self.unmatched_nice_to_have)
        if total == 0:
            return 1.0
        return len(self.matched_nice_to_have) / total


class SkillMatcher:
    """
    Matches a candidate's SkillProfile against a JobProfile's skill requirements.

    Uses semantic embeddings for robust matching — handles synonyms like:
    - "Node.js" ↔ "Node" ↔ "Express"
    - "ML" ↔ "Machine Learning"
    - "k8s" ↔ "Kubernetes"

    Usage:
        matcher = SkillMatcher()
        result = matcher.match(skill_profile, job_profile)
    """

    def __init__(
        self,
        model_name: str = "all-MiniLM-L6-v2",
        threshold: float = DEFAULT_MATCH_THRESHOLD,
    ):
        self.model_name = model_name
        self.threshold = threshold
        self._model = None  # Lazy load

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def match(self, skill_profile, job_profile) -> MatchResult:
        """
        Match candidate skills against job requirements.

        Args:
            skill_profile: SkillProfile instance
            job_profile: JobProfile instance

        Returns:
            MatchResult with matched/unmatched skills and scores.
        """
        candidate_skills = skill_profile.skill_names()  # lowercase list

        result = MatchResult()

        # Match required skills
        for job_skill in job_profile.required_skills:
            score, matched = self._best_match(job_skill, candidate_skills)
            result.required_scores[job_skill] = score
            if matched:
                result.matched_required.append(job_skill)
            else:
                result.unmatched_required.append(job_skill)

        # Match nice-to-have
        for job_skill in job_profile.nice_to_have_skills:
            _, matched = self._best_match(job_skill, candidate_skills)
            if matched:
                result.matched_nice_to_have.append(job_skill)
            else:
                result.unmatched_nice_to_have.append(job_skill)

        logger.info(
            f"Skill match: {len(result.matched_required)}/{len(job_profile.required_skills)} required, "
            f"{len(result.matched_nice_to_have)}/{len(job_profile.nice_to_have_skills)} nice-to-have"
        )

        return result

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _get_model(self):
        """Lazy-load the sentence-transformers model."""
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
            except ImportError as e:
                raise ImportError(
                    "sentence-transformers is required. "
                    "Run: pip install sentence-transformers"
                ) from e
            logger.info(f"Loading embedding model: {self.model_name}")
            self._model = SentenceTransformer(self.model_name)
        return self._model

    def _best_match(
        self, job_skill: str, candidate_skills: list[str]
    ) -> tuple[float, bool]:
        """
        Find the best matching candidate skill for a job skill.

        Returns:
            (best_score, is_matched) where is_matched is True if score >= threshold.
        """
        if not candidate_skills:
            return 0.0, False

        # Fast path: exact or substring match (case-insensitive)
        js_lower = job_skill.lower()
        for cs in candidate_skills:
            if js_lower == cs or js_lower in cs or cs in js_lower:
                return 1.0, True

        # Semantic match via embeddings
        try:
            import numpy as np

            model = self._get_model()
            job_emb = model.encode([job_skill], convert_to_numpy=True)
            cand_embs = model.encode(candidate_skills, convert_to_numpy=True)

            # Cosine similarity
            job_norm = job_emb / (np.linalg.norm(job_emb, axis=1, keepdims=True) + 1e-8)
            cand_norm = cand_embs / (np.linalg.norm(cand_embs, axis=1, keepdims=True) + 1e-8)
            scores = (job_norm @ cand_norm.T).flatten()
            best_score = float(scores.max())

            return best_score, best_score >= self.threshold

        except Exception as e:
            logger.warning(f"Semantic matching failed for '{job_skill}': {e}. Falling back to 0.")
            return 0.0, False
