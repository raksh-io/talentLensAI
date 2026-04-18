# TalentLens AI — Intelligent Career Alignment Suite

TalentLens AI is a premium, privacy-focused talent intelligence platform designed to bridge the gap between candidate resumes and real-world technical competency. Moving beyond simple keyword matching, the platform utilizes advanced NLP to perform **Neural Skill Alignment**, ensuring that recruiters find the right fit and candidates prove their true value.

---

## 🛠 Tech Stack

### Frontend (The Perception Layer)
- **Framework**: [React.js](https://reactjs.org/) with [Vite](https://vitejs.dev/) for ultra-fast development and optimized production builds.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) for a utility-first, highly responsive design system.
- **Animations**: [Framer Motion](https://www.framer.com/motion/) powering all glassmorphism transitions, hero paths, and interactive dashboard elements.
- **Icons**: [Lucide React](https://lucide.dev/) for a clean, consistent iconography.
- **Routing**: [React Router](https://reactrouter.com/) for seamless navigation between dashboards and auth portals.

### Backend (The Intelligence Engine)
- **Runtime**: [Python 3.10+](https://www.python.org/)
- **API Framework**: [FastAPI](https://fastapi.tiangolo.com/) providing high-performance, asynchronous endpoints.
- **NLP Engine**: [spaCy](https://spacy.io/) utilized for named entity recognition (NER) and technical skill extraction from unstructured text.
- **Resume Processing**: [PyPDF2](https://pypdf2.readthedocs.io/) and [pdfplumber](https://github.com/jsvine/pdfplumber) for robust offline PDF text extraction.
- **Concurrency**: Asynchronous pipeline allowing parallel analysis of resumes and web-scraped data (GitHub/Portfolio).

### Infrastructure & Security
- **Identity & DB**: [Supabase](https://supabase.com/) (PostgreSQL + Auth) for secure user management and real-time data synchronization.
- **Safety**: Fully offline resume analysis to ensure candidate privacy, with keys managed via `.env` environments (never committed to version control).

---

## ⚙️ The Intelligence Pipeline

1. **Ingestion**: The user uploads a PDF resume via the `CandidateDashboard`.
2. **Offline Parsing**: The FastAPI backend receives the file and uses a multi-stage parser to extract raw text without sending data to external LLMs.
3. **Skill Extraction**: The `spaCy` NLP model identifies technical tags, projects, and specialized experience.
4. **Contextual Alignment**: The engine compares extracted data against specific Job Descriptions (JDs) using a weighted scoring algorithm.
5. **Neural Verdict**: The dashboard displays a "Neural Alignment Score" and "Career Insights," providing a human-readable explanation of why a candidate fits a role.

---

## 🔌 Core API Endpoints

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/analyze` | `POST` | Processes resumes and returns skill-alignment scores. |
| `/jobs` | `GET/POST` | Manages job listings for recruiters. |
| `/candidates` | `GET` | Retrieves candidate leaderboard and profiles. |
| `/search` | `GET` | Performs real-time search across the candidate matrix. |

---

## 💎 Design Philosophy: "Glass Premium"
TalentLens AI utilizes a custom **Glassmorphism** design language defined in `index.css`. This includes:
- **Translucent UI**: `backdrop-blur` and semi-transparent backgrounds that let the geometric art show through.
- **Teal & Indigo Palettes**: A sophisticated balance of deep navy for professionalism and vibrant teal for "intelligence" and innovation.
- **Dynamic Feedback**: Real-time "AI Scanning" lines and progress bars that visualize the backend computation.

---

## 🚀 Vision
Built by **Team Byte-Core**, TalentLens AI aims to humanize the recruitment process by focusing on **Skill Intelligence, Not Keywords.**
