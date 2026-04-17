"""
GitHubExtractor: Fetches and structures GitHub profile data for a candidate.
Uses the PyGithub library with optional token auth for higher rate limits.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)


class GitHubExtractor:
    """
    Extracts signal-rich data from a GitHub user's public profile.

    Data collected:
    - Top repositories (name, description, stars, language, topics)
    - Language distribution across repos
    - Total stars, forks, watchers
    - Account age and activity recency
    - Top languages by byte count
    - README snippets from top repos

    Usage:
        extractor = GitHubExtractor(token="ghp_...")
        data = extractor.extract("torvalds")
    """

    def __init__(self, token: Optional[str] = None):
        self.token = token or os.getenv("GITHUB_TOKEN")

    def extract(
        self,
        username: str,
        max_repos: int = 20,
        include_readmes: bool = True,
    ) -> dict:
        """
        Extract structured GitHub data for a username.

        Args:
            username: GitHub username (e.g. 'torvalds')
            max_repos: Max repos to analyze (sorted by stars desc)
            include_readmes: Whether to fetch README snippets from top repos

        Returns:
            Structured dict with profile, repos, languages, and activity data.
        """
        try:
            from github import Github, GithubException
        except ImportError as e:
            raise ImportError("PyGithub is required. Run: pip install PyGithub") from e

        g = Github(self.token) if self.token else Github()

        try:
            user = g.get_user(username)
        except GithubException as e:
            if e.status == 404:
                raise ValueError(f"GitHub user '{username}' not found.")
            raise RuntimeError(f"GitHub API error: {e.data.get('message', str(e))}")

        logger.info(f"Fetching GitHub data for user: {username}")

        # Basic profile
        profile = {
            "username": user.login,
            "name": user.name or username,
            "bio": user.bio or "",
            "location": user.location or "",
            "public_repos": user.public_repos,
            "followers": user.followers,
            "following": user.following,
            "account_created": user.created_at.isoformat() if user.created_at else None,
            "company": user.company or "",
            "blog": user.blog or "",
        }

        # Repos — sorted by stars
        repos_data = []
        language_bytes: dict[str, int] = {}
        total_stars = 0
        total_forks = 0
        last_push_dates: list[datetime] = []

        repos = sorted(
            user.get_repos(),
            key=lambda r: r.stargazers_count,
            reverse=True,
        )

        for repo in repos[:max_repos]:
            if repo.fork:
                continue  # Skip forked repos for authentic signal

            pushed_at = repo.pushed_at
            if pushed_at and pushed_at.tzinfo:
                last_push_dates.append(pushed_at)

            repo_entry = {
                "name": repo.name,
                "description": repo.description or "",
                "language": repo.language or "Unknown",
                "stars": repo.stargazers_count,
                "forks": repo.forks_count,
                "topics": repo.get_topics(),
                "size_kb": repo.size,
                "pushed_at": pushed_at.isoformat() if pushed_at else None,
                "url": repo.html_url,
            }

            total_stars += repo.stargazers_count
            total_forks += repo.forks_count

            # Aggregate language bytes
            try:
                langs = repo.get_languages()
                for lang, byte_count in langs.items():
                    language_bytes[lang] = language_bytes.get(lang, 0) + byte_count
            except Exception:
                pass

            # README snippet from top 5 repos
            if include_readmes and len(repos_data) < 5:
                readme_snippet = self._get_readme_snippet(repo)
                repo_entry["readme_snippet"] = readme_snippet

            repos_data.append(repo_entry)

        # Top languages by byte count (top 8)
        sorted_langs = sorted(language_bytes.items(), key=lambda x: x[1], reverse=True)
        top_languages = [lang for lang, _ in sorted_langs[:8]]

        # Activity score: recency + frequency
        activity_score = self._compute_activity_score(
            last_push_dates=last_push_dates,
            public_repos=user.public_repos,
            followers=user.followers,
            total_stars=total_stars,
        )

        logger.info(
            f"Extracted {len(repos_data)} repos | {len(top_languages)} languages | "
            f"activity_score={activity_score:.2f}"
        )

        return {
            "profile": profile,
            "repos": repos_data,
            "top_languages": top_languages,
            "language_bytes": dict(sorted_langs[:8]),
            "total_stars": total_stars,
            "total_forks": total_forks,
            "activity_score": activity_score,
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _get_readme_snippet(self, repo, max_chars: int = 500) -> str:
        """Fetch and truncate README content from a repo."""
        try:
            readme = repo.get_readme()
            import base64
            content = base64.b64decode(readme.content).decode("utf-8", errors="ignore")
            # Strip markdown headers/badges, grab first meaningful lines
            lines = [
                ln.strip()
                for ln in content.splitlines()
                if ln.strip() and not ln.strip().startswith(("#", "!", "[", "<!--"))
            ]
            snippet = " ".join(lines)[:max_chars]
            return snippet
        except Exception:
            return ""

    def _compute_activity_score(
        self,
        last_push_dates: list[datetime],
        public_repos: int,
        followers: int,
        total_stars: int,
    ) -> float:
        """
        Compute a normalized [0.0, 1.0] activity score based on:
        - Recency of contributions
        - Number of public repos
        - Followers and stars (proxy for impact)
        """
        if not last_push_dates:
            return 0.0

        now = datetime.now(timezone.utc)

        # Recency: how recently was the last push? (within last 6 months = 1.0)
        most_recent = max(last_push_dates)
        if most_recent.tzinfo is None:
            most_recent = most_recent.replace(tzinfo=timezone.utc)
        days_since = (now - most_recent).days
        recency_score = max(0.0, 1.0 - (days_since / 180.0))

        # Volume: repos (log-scaled, 20+ = 1.0)
        import math
        repo_score = min(1.0, math.log1p(public_repos) / math.log1p(20))

        # Impact: stars (log-scaled, 100+ = 1.0)
        impact_score = min(1.0, math.log1p(total_stars) / math.log1p(100))

        # Weighted composite
        activity = (
            recency_score * 0.5
            + repo_score * 0.3
            + impact_score * 0.2
        )
        return round(activity, 3)
