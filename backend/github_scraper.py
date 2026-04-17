"""
TalentLens AI — GitHub Profile Scraper
=========================================
Scrapes a public GitHub profile page to extract:
  - Username, bio
  - Pinned repositories (name, description, language)
  - Additional public repositories
  - Top languages used

No API key required. Uses httpx + BeautifulSoup to parse public HTML.

Usage:
    from github_scraper import scrape_github

    data = scrape_github("https://github.com/torvalds")
    # Returns:
    # {
    #   "username": "torvalds",
    #   "bio": "...",
    #   "projects": [
    #     {"name": "linux", "description": "...", "languages": ["C"]},
    #     ...
    #   ],
    #   "top_languages": ["C", "Python", "Shell"]
    # }
"""
from __future__ import annotations

import logging
import re
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


def parse_username(github_url: str) -> str:
    """
    Extract GitHub username from a URL.

    Supports:
      - https://github.com/username
      - github.com/username
      - username (plain)
    """
    url = github_url.strip().rstrip("/")

    # If it looks like just a username (no slashes, no dots)
    if "/" not in url and "." not in url:
        return url

    # Add scheme if missing so urlparse works
    if not url.startswith("http"):
        url = "https://" + url

    parsed = urlparse(url)
    path_parts = [p for p in parsed.path.split("/") if p]

    if not path_parts:
        raise ValueError(f"Could not extract username from URL: {github_url}")

    return path_parts[0]


def scrape_github(github_url: str, max_repos: int = 12) -> dict:
    """
    Scrape a public GitHub profile and return structured project data.

    Args:
        github_url:  GitHub profile URL or plain username
        max_repos:   Max number of repos to extract

    Returns:
        {
            "username":      str,
            "bio":           str,
            "projects":      [{"name", "description", "languages"}, ...],
            "top_languages": [str, ...]
        }

    Raises:
        ValueError: If the profile is not found or URL is invalid.
        RuntimeError: If scraping fails due to network/parse errors.
    """
    try:
        import httpx
        from bs4 import BeautifulSoup
    except ImportError:
        raise ImportError("Run: pip install httpx beautifulsoup4")

    username = parse_username(github_url)
    profile_url = f"https://github.com/{username}"

    logger.info(f"Scraping GitHub profile: {profile_url}")

    try:
        with httpx.Client(headers=HEADERS, timeout=15, follow_redirects=True) as client:
            # --- Scrape profile page (pinned repos + bio) ---
            resp = client.get(profile_url)
            if resp.status_code == 404:
                raise ValueError(f"GitHub user '{username}' not found.")
            if resp.status_code != 200:
                raise RuntimeError(f"GitHub returned HTTP {resp.status_code}")

            soup = BeautifulSoup(resp.text, "html.parser")
            bio = _extract_bio(soup)
            pinned = _extract_pinned_repos(soup)

            # --- Scrape repositories tab for more repos ---
            repos_resp = client.get(
                f"{profile_url}?tab=repositories",
                params={"sort": "stargazers"},
            )
            repos_soup = BeautifulSoup(repos_resp.text, "html.parser")
            tab_repos = _extract_tab_repos(repos_soup, max_repos)

    except (ValueError, RuntimeError):
        raise
    except Exception as e:
        raise RuntimeError(f"Failed to scrape GitHub profile: {e}")

    # Merge pinned + tab repos (deduplicated by name)
    projects: list[dict] = []
    seen: set[str] = set()

    for repo in pinned + tab_repos:
        key = repo["name"].lower()
        if key not in seen and repo["name"]:
            seen.add(key)
            projects.append(repo)
        if len(projects) >= max_repos:
            break

    # Aggregate top languages across all projects
    lang_count: dict[str, int] = {}
    for p in projects:
        for lang in p.get("languages", []):
            lang_count[lang] = lang_count.get(lang, 0) + 1

    top_languages = sorted(lang_count, key=lang_count.get, reverse=True)[:6]

    logger.info(
        f"Scraped {len(projects)} repos | "
        f"top languages: {top_languages}"
    )

    return {
        "username":      username,
        "bio":           bio,
        "projects":      projects,
        "top_languages": top_languages,
    }


# ---------------------------------------------------------------------------
# Internal parsers
# ---------------------------------------------------------------------------

def _extract_bio(soup) -> str:
    """Extract user bio from profile page."""
    # GitHub renders bio in a <div class="p-note ...">
    bio_tag = (
        soup.find("div", class_="p-note")
        or soup.find("div", {"data-bio-text": True})
        or soup.find("div", class_=re.compile(r"user-profile-bio"))
    )
    if bio_tag:
        return bio_tag.get_text(strip=True)
    return ""


def _extract_pinned_repos(soup) -> list[dict]:
    """Extract pinned repositories from the profile page."""
    projects = []

    # Pinned repos are inside <div class="js-pinned-items-reorder-container">
    # Individual pinned items: <li class="js-pinned-item-list-item">
    pinned_items = soup.select("li.js-pinned-item-list-item")

    # Fallback: look for pinned-item-list-item--reorder
    if not pinned_items:
        pinned_items = soup.select("div.pinned-item-list-item-content")

    for item in pinned_items:
        name = _text(item.select_one("span.repo, a[data-hovercard-type='repository']"))
        desc = _text(item.select_one("p.pinned-item-desc, p.mb-0"))
        lang = _text(item.select_one("span[itemprop='programmingLanguage']"))

        if not name:
            # Try anchor tag text
            a = item.select_one("a[href*='/']")
            name = _text(a).split("/")[-1] if a else ""

        if name:
            projects.append({
                "name":        name,
                "description": desc,
                "languages":   [lang] if lang else [],
            })

    return projects


def _extract_tab_repos(soup, max_repos: int) -> list[dict]:
    """Extract repository list from the ?tab=repositories page."""
    projects = []

    # Each repo is in an <li id="user-repositories-list"> item
    repo_items = soup.select("li[itemprop='owns']") or soup.select("div#user-repositories-list li")

    for item in repo_items:
        if len(projects) >= max_repos:
            break

        # Name
        name_tag = item.select_one("a[itemprop='name codeRepository']")
        if not name_tag:
            name_tag = item.select_one("h3 a")
        name = _text(name_tag).strip("/").split("/")[-1] if name_tag else ""

        # Description
        desc_tag = item.select_one("p[itemprop='description'], p.mb-1")
        desc = _text(desc_tag)

        # Language
        lang_tag = item.select_one("span[itemprop='programmingLanguage']")
        lang = _text(lang_tag)

        if name:
            projects.append({
                "name":        name,
                "description": desc,
                "languages":   [lang] if lang else [],
            })

    return projects


def _text(tag) -> str:
    """Safe text extraction from a BeautifulSoup tag."""
    if tag is None:
        return ""
    return tag.get_text(separator=" ", strip=True)
