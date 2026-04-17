"""
JobLoader: Loads job profiles from JSON files in the /jobs directory.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path

from models.job_profile import JobProfile

logger = logging.getLogger(__name__)

JOBS_DIR = Path(__file__).resolve().parent.parent.parent / "jobs"


class JobLoader:
    """
    Loads and caches job profiles from the /jobs directory.

    Usage:
        loader = JobLoader()
        job = loader.get("software_engineer")
        all_jobs = loader.list_jobs()
    """

    def __init__(self, jobs_dir: Path = JOBS_DIR):
        self.jobs_dir = jobs_dir
        self._cache: dict[str, JobProfile] = {}
        self._loaded = False

    def _load_all(self):
        if self._loaded:
            return
        if not self.jobs_dir.exists():
            logger.warning(f"Jobs directory not found: {self.jobs_dir}")
            self._loaded = True
            return

        for json_file in self.jobs_dir.glob("*.json"):
            try:
                data = json.loads(json_file.read_text(encoding="utf-8"))
                job = JobProfile(**data)
                self._cache[job.id] = job
                logger.info(f"Loaded job profile: {job.id} ({job.title})")
            except Exception as e:
                logger.error(f"Failed to load job profile {json_file.name}: {e}")

        self._loaded = True

    def get(self, job_id: str) -> JobProfile:
        """
        Get a job profile by ID.

        Raises:
            KeyError: If the job profile is not found.
        """
        self._load_all()
        if job_id not in self._cache:
            available = list(self._cache.keys())
            raise KeyError(
                f"Job profile '{job_id}' not found. Available: {available}"
            )
        return self._cache[job_id]

    def list_jobs(self) -> list[dict]:
        """Return a list of all available job profiles (id + title)."""
        self._load_all()
        return [
            {"id": j.id, "title": j.title, "description": j.description}
            for j in self._cache.values()
        ]

    def all(self) -> list[JobProfile]:
        """Return all loaded JobProfile instances."""
        self._load_all()
        return list(self._cache.values())
