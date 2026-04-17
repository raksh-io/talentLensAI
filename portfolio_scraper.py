"""
TalentLens AI — Portfolio Website Scraper
==========================================
Scrapes a candidate's portfolio website to extract:
  - Skills / technologies mentioned
  - Projects (name, description, tech stack)
  - Bio / about section

Uses httpx + BeautifulSoup. No API key required.
Works on most common portfolio structures (React, plain HTML, GitHub Pages, etc.)

Usage:
    from portfolio_scraper import scrape_portfolio

    data = scrape_portfolio("https://janedoe.dev")
    # Returns:
    # {
    #   "url": "https://janedoe.dev",
    #   "bio": "Full-stack developer...",
    #   "skills": ["Python", "React", "Docker"],
    #   "projects": [
    #     {"name": "MyApp", "description": "...", "languages": ["React", "Node.js"]},
    #     ...
    #   ]
    # }
"""
from __future__ import annotations

import logging
import re

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

# Reuse the same skills KB as resume_analyzer (covers 120+ tech skills)
from resume_analyzer import ALL_SKILLS_LOWER


def scrape_portfolio(portfolio_url: str) -> dict:
    """
    Scrape a portfolio website and return structured candidate data.

    Args:
        portfolio_url: Full URL of the portfolio (e.g. https://janedoe.dev)

    Returns:
        {
            "url":      str,
            "bio":      str,
            "skills":   [str, ...],
            "projects": [{"name", "description", "languages"}, ...]
        }

    Raises:
        ValueError:   If the URL is unreachable or returns a non-2xx response.
        RuntimeError: If scraping fails.
    """
    try:
        import httpx
        from bs4 import BeautifulSoup
    except ImportError:
        raise ImportError("Run: pip install httpx beautifulsoup4")

    url = _normalize_url(portfolio_url)
    logger.info(f"Scraping portfolio: {url}")

    try:
        with httpx.Client(headers=HEADERS, timeout=15, follow_redirects=True) as client:
            resp = client.get(url)

        if resp.status_code == 404:
            raise ValueError(f"Portfolio URL not found (404): {url}")
        if resp.status_code >= 400:
            raise ValueError(f"Portfolio returned HTTP {resp.status_code}: {url}")

    except (ValueError, RuntimeError):
        raise
    except Exception as e:
        raise RuntimeError(f"Could not reach portfolio URL '{url}': {e}")

    soup = BeautifulSoup(resp.text, "html.parser")

    # Remove scripts and styles — they pollute text extraction
    for tag in soup(["script", "style", "noscript", "meta", "head"]):
        tag.decompose()

    full_text = soup.get_text(separator=" ", strip=True)

    bio      = _extract_bio(soup, full_text)
    skills   = _extract_skills(full_text)
    projects = _extract_projects(soup, full_text)

    logger.info(
        f"Portfolio scraped: {len(skills)} skills, {len(projects)} projects detected"
    )

    return {
        "url":      url,
        "bio":      bio,
        "skills":   skills,
        "projects": projects,
    }


# ---------------------------------------------------------------------------
# Internal parsers
# ---------------------------------------------------------------------------

def _normalize_url(url: str) -> str:
    """Ensure URL has a scheme."""
    url = url.strip().rstrip("/")
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url


def _extract_bio(soup, full_text: str) -> str:
    """
    Extract a bio / about paragraph.
    Strategy: look for About sections, hero paragraphs, or meta description.
    """
    # 1. Meta description (often has the best summary)
    meta = soup.find("meta", attrs={"name": "description"})
    if meta and meta.get("content", "").strip():
        return meta["content"].strip()

    # 2. About section: h2/h3 with "about" text, then grab the next paragraph
    about_headers = soup.find_all(
        re.compile(r"^h[1-4]$"),
        string=re.compile(r"about|bio|profile|who am i|introduction", re.IGNORECASE),
    )
    for header in about_headers:
        sibling = header.find_next_sibling(["p", "div", "section"])
        if sibling:
            text = sibling.get_text(separator=" ", strip=True)
            if len(text) > 20:
                return text[:400]

    # 3. First long paragraph on the page
    for p in soup.find_all("p"):
        text = p.get_text(strip=True)
        if len(text) > 60:
            return text[:400]

    return ""


def _extract_skills(full_text: str) -> list[str]:
    """
    Extract skills by matching the full page text against the skills knowledge base.
    Same approach as resume_analyzer — whole-word, case-insensitive.
    """
    found: set[str] = set()
    for skill_lower, skill_proper in ALL_SKILLS_LOWER.items():
        pattern = re.compile(r"\b" + re.escape(skill_lower) + r"\b", re.IGNORECASE)
        if pattern.search(full_text):
            found.add(skill_proper)
    return sorted(found)


def _extract_projects(soup, full_text: str) -> list[dict]:
    """
    Extract project entries from the portfolio.

    Strategy (in order of confidence):
    1. Look for structured project cards (common in portfolios):
       - <article>, <div class*="project">, <section class*="project">
    2. Look for headings inside a Projects/Work section
    3. Fallback: extract h3/h4 + next paragraph pairs
    """
    projects: list[dict] = []

    # --- Strategy 1: Explicit project cards ---
    card_selectors = [
        "article",
        '[class*="project"]',
        '[class*="card"]',
        '[class*="work"]',
        '[class*="portfolio"]',
        '[id*="project"]',
    ]
    cards = []
    for sel in card_selectors:
        found = soup.select(sel)
        if found:
            cards = found
            break

    for card in cards[:12]:
        proj = _parse_card(card)
        if proj:
            projects.append(proj)

    # --- Strategy 2: Project section headings ---
    if not projects:
        projects = _extract_from_section_headings(soup)

    # --- Strategy 3: Fallback — h3/h4 + paragraph pairs ---
    if not projects:
        projects = _extract_heading_paragraph_pairs(soup)

    # Deduplicate by name
    seen: set[str] = set()
    unique = []
    for p in projects:
        key = p["name"].lower().strip()
        if key and key not in seen:
            seen.add(key)
            unique.append(p)

    return unique[:10]


def _parse_card(card) -> dict | None:
    """Parse a single project card element."""
    # Name: first heading
    name_tag = card.find(re.compile(r"^h[1-5]$"))
    name = name_tag.get_text(strip=True) if name_tag else ""

    # Description: first paragraph
    desc_tag = card.find("p")
    desc = desc_tag.get_text(strip=True) if desc_tag else ""

    # Technologies: look for tech tags / spans / list items
    tech_text = card.get_text(separator=" ", strip=True)
    languages = _extract_skills_from_text(tech_text)

    if not name or len(name) > 80:
        return None

    return {
        "name":        name,
        "description": desc[:300],
        "languages":   languages[:6],
    }


def _extract_from_section_headings(soup) -> list[dict]:
    """Find a Projects/Work heading and extract sub-headings as project names."""
    projects = []

    section_header = soup.find(
        re.compile(r"^h[1-3]$"),
        string=re.compile(r"project|work|portfolio|case study|built", re.IGNORECASE),
    )
    if not section_header:
        return []

    # Collect siblings until the next major section
    current = section_header.find_next_sibling()
    while current and len(projects) < 10:
        tag_name = current.name if current.name else ""
        # Stop if we hit another major heading
        if tag_name in ("h1", "h2") and projects:
            break

        if tag_name in ("h3", "h4"):
            name = current.get_text(strip=True)
            desc_tag = current.find_next_sibling("p")
            desc = desc_tag.get_text(strip=True) if desc_tag else ""
            tech_text = (name + " " + desc)
            languages = _extract_skills_from_text(tech_text)
            if name and len(name) < 80:
                projects.append({
                    "name":        name,
                    "description": desc[:300],
                    "languages":   languages[:6],
                })
        current = current.find_next_sibling()

    return projects


def _extract_heading_paragraph_pairs(soup) -> list[dict]:
    """Last resort: pair every h3/h4 with its next paragraph."""
    projects = []
    for heading in soup.find_all(["h3", "h4"])[:20]:
        name = heading.get_text(strip=True)
        if not name or len(name) > 80 or len(name) < 3:
            continue
        p = heading.find_next_sibling("p")
        desc = p.get_text(strip=True) if p else ""
        languages = _extract_skills_from_text(name + " " + desc)
        projects.append({
            "name":        name,
            "description": desc[:300],
            "languages":   languages[:6],
        })
    return projects[:8]


def _extract_skills_from_text(text: str) -> list[str]:
    """Extract skill names from a short text snippet."""
    found = []
    for skill_lower, skill_proper in ALL_SKILLS_LOWER.items():
        pattern = re.compile(r"\b" + re.escape(skill_lower) + r"\b", re.IGNORECASE)
        if pattern.search(text):
            found.append(skill_proper)
    return found
