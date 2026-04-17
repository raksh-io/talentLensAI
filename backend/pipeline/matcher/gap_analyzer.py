"""
GapAnalyzer: Compares matched skills against job requirements
and produces a structured gap analysis list.
Simple rule-based logic — no ML needed.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class GapItem:
    skill: str
    importance: str          # "critical" | "recommended"
    suggestion: str          # one-line learning tip


class GapAnalyzer:
    """
    Identifies missing skills and classifies their importance.

    Usage:
        analyzer = GapAnalyzer()
        gaps = analyzer.analyze(
            missing_required=["Kubernetes", "Terraform"],
            missing_nice_to_have=["Prometheus"],
        )
    """

    # Quick resource map — covers the most common tech skills
    RESOURCES: dict[str, str] = {
        "kubernetes":    "kubernetes.io/docs/tutorials",
        "terraform":     "developer.hashicorp.com/terraform/tutorials",
        "aws":           "aws.amazon.com/getting-started",
        "docker":        "docs.docker.com/get-started",
        "python":        "docs.python.org/3/tutorial",
        "sql":           "sqlzoo.net",
        "machine learning": "fast.ai",
        "pytorch":       "pytorch.org/tutorials",
        "tensorflow":    "tensorflow.org/tutorials",
        "react":         "react.dev/learn",
        "typescript":    "typescriptlang.org/docs",
        "git":           "git-scm.com/book/en/v2",
        "linux":         "linuxcommand.org",
        "ci/cd":         "docs.github.com/en/actions",
        "ansible":       "docs.ansible.com",
        "prometheus":    "prometheus.io/docs/introduction/overview",
        "redis":         "redis.io/docs/getting-started",
        "spark":         "spark.apache.org/docs/latest",
        "mlflow":        "mlflow.org/docs/latest/index.html",
    }

    def analyze(
        self,
        missing_required: list[str],
        missing_nice_to_have: list[str],
    ) -> list[GapItem]:
        gaps: list[GapItem] = []

        for skill in missing_required:
            gaps.append(GapItem(
                skill=skill,
                importance="critical",
                suggestion=self._resource(skill),
            ))

        for skill in missing_nice_to_have:
            gaps.append(GapItem(
                skill=skill,
                importance="recommended",
                suggestion=self._resource(skill),
            ))

        return gaps

    def _resource(self, skill: str) -> str:
        key = skill.lower()
        for k, v in self.RESOURCES.items():
            if k in key or key in k:
                return f"Learn at: {v}"
        return f"Search: '{skill} tutorial' on YouTube or Coursera"
