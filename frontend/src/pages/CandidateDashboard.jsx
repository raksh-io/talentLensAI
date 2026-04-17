import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProfileCard } from '@/components/ui/profile-card'

/* ── Topnav ── */
function Navbar({ user, onLogout }) {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3.5"
      style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.5)' }}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base text-white shadow-sm"
          style={{ background: '#2563eb' }}>🔍</div>
        <div className="flex flex-col sm:flex-row items-baseline sm:items-center gap-1 sm:gap-2">
          <span className="font-bold text-slate-900 text-md tracking-tight">TalentLens AI</span>
          <span className="hidden sm:inline text-slate-400 text-xs">·</span>
          <span className="hidden sm:inline text-slate-500 text-xs italic">We don't match resumes — we match skills.</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
            style={{ background: '#eff6ff' }}>👤</div>
          <span className="text-slate-600 text-sm font-medium">{user?.name || user?.email?.split('@')[0]}</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold badge-default">Candidate</span>
        </div>
        <button onClick={onLogout}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-all bg-white shadow-sm">
          Sign Out
        </button>
      </div>
    </nav>
  )
}

/* ── Score Ring ── */
function ScoreRing({ score, color }) {
  const r = 54; const circ = 2 * Math.PI * r
  const [offset, setOffset] = useState(circ)
  useEffect(() => {
    const t = setTimeout(() => setOffset(circ - (score / 100) * circ), 150)
    return () => clearTimeout(t)
  }, [score])

  return (
    <div className="relative w-32 h-32">
      <svg viewBox="0 0 120 120" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round"
          style={{ strokeDasharray: circ, strokeDashoffset: offset, transition: 'stroke-dashoffset 1s ease 0.2s' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-slate-900 leading-none">{score}</span>
        <span className="text-xs text-slate-500">/ 100</span>
      </div>
    </div>
  )
}

/* ── Skill Badge ── */
function Badge({ text, variant = 'default' }) {
  return <span className={`badge badge-${variant}`}>{text}</span>
}

/* ── Loading steps ── */
const STEPS = [
  { id: 'ls1', label: 'Processing...' },
  { id: 'ls2', label: 'Processing...' },
  { id: 'ls3', label: 'Processing...' },
  { id: 'ls4', label: 'Processing...' },
  { id: 'ls5', label: 'Processing...' },
]

export default function CandidateDashboard() {
  const navigate = useNavigate()
  const user = (() => { try { return JSON.parse(localStorage.getItem('tl_user') || '{}') } catch { return {} } })()

  // Form state
  const [file, setFile] = useState(null)
  const [jobs, setJobs] = useState([])
  const [jobId, setJobId] = useState('')
  const [github, setGithub] = useState('')
  const [portfolio, setPortfolio] = useState('')
  const [projects, setProjects] = useState('')
  const [dragOver, setDragOver] = useState(false)

  // UI state
  const [loading, setLoading] = useState(false)
  const [activeStep, setActiveStep] = useState(-1)
  const [error, setError] = useState('')
  const [results, setResults] = useState(null)

  const resultsRef = useRef(null)
  const fileInputRef = useRef(null)
  const stepTimer = useRef(null)

  function logout() { localStorage.removeItem('tl_user'); navigate('/signin', { replace: true }) }

  // Load jobs on mount
  useEffect(() => {
    fetch('/jobs').then(r => r.json()).then(d => setJobs(d.jobs || [])).catch(() => {})
  }, [])

  // Scroll to results
  useEffect(() => {
    if (results) {
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }
  }, [results])

  const visibleSteps = STEPS.filter((s, i) => {
    if (i === 1 && !github.trim()) return false
    if (i === 2 && !portfolio.trim()) return false
    return true
  })

  function handleClear() {
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setJobId('')
    setGithub('')
    setPortfolio('')
    setProjects('')
    setResults(null)
    setError('')
    setActiveStep(-1)
  }

  function startSteps(hasGithub, hasPortfolio) {
    const visible = STEPS.filter((s, i) => {
      if (i === 1 && !hasGithub) return false
      if (i === 2 && !hasPortfolio) return false
      return true
    })
    let i = 0
    function next() {
      setActiveStep(i < visible.length ? i : -1)
      if (i < visible.length) { i++; stepTimer.current = setTimeout(next, 1700) }
    }
    next()
  }
  function stopSteps() { clearTimeout(stepTimer.current); setActiveStep(-1) }

  function handleFileDrop(e) {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer?.files[0]
    if (f) setFile(f)
  }

  function formatProjectsToArray(input) {
    const raw = input.trim()
    if (!raw) return []
    
    // 1. Try JSON
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : [parsed]
    } catch (e) {
      // 2. Fallback to Plain Text
      // Split by lines or double newlines
      const lines = raw.split(/\n+/).filter(l => l.trim())
      return lines.map((l, i) => {
        const trimmed = l.trim()
        if (trimmed.includes(':')) {
          const [name, ...descParts] = trimmed.split(':')
          return {
            name: name.trim(),
            description: descParts.join(':').trim(),
            languages: []
          }
        }
        return {
          name: `Project ${i + 1}`,
          description: trimmed,
          languages: []
        }
      })
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setResults(null)
    if (!file) { setError('Please upload a resume file.'); return }
    if (!jobId) { setError('Please select a job role.'); return }
    
    const projectsList = formatProjectsToArray(projects)

    const fd = new FormData()
    fd.append('resume', file); fd.append('job_id', jobId)
    if (github.trim()) fd.append('github_url', github.trim())
    if (portfolio.trim()) fd.append('portfolio_url', portfolio.trim())
    fd.append('projects', JSON.stringify(projectsList))

    setLoading(true)
    startSteps(!!github.trim(), !!portfolio.trim())

    try {
      const res = await fetch('/analyze', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || `Server error ${res.status}`); return }
      setResults(data)
    } catch {
      setError('Cannot reach server. Make sure the backend is running on port 8000.')
    } finally {
      setLoading(false); stopSteps()
    }
  }

  const score = results?.fit_score || 0
  const scoreColor = score >= 70 ? '#4ade80' : score >= 40 ? '#fbbf24' : '#f87171'
  const scoreLabel = score >= 70 ? 'Strong Fit' : score >= 40 ? 'Moderate Fit' : 'Weak Fit'
  const scoreBg = score >= 70 ? 'rgba(74,222,128,0.1)' : score >= 40 ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)'
  const scoreBorder = score >= 70 ? 'rgba(74,222,128,0.25)' : score >= 40 ? 'rgba(251,191,36,0.25)' : 'rgba(248,113,113,0.25)'

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} onLogout={logout} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Page header */}
        <div className="mb-8 animate-fade-up">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Candidate Analysis</h1>
          <p className="text-slate-600 text-sm">Upload your resume to get an AI-powered skill fit score.</p>
        </div>

        {/* ── INPUT FORM ── */}
        {/* ── INPUT FORM ── */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="saas-card overflow-hidden animate-fade-up delay-100 input-focus-card">
            <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm shadow-sm">📑</div>
                <h3 className="font-bold text-slate-800 text-sm">Resume Data</h3>
              </div>
            </div>
            <div className="p-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Upload Candidate Resume</label>
              <div 
                className={`dropzone p-8 text-center ${dragOver ? 'drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={(e) => setFile(e.target.files[0])} />
                <div className="text-3xl mb-3">{file ? '📎' : '📄'}</div>
                <p className="text-sm font-semibold text-slate-700">{file ? file.name : 'Drop resume here or click'}</p>
                <p className="text-xs text-slate-400 mt-1">PDF, DOCX, or TXT</p>
              </div>
            </div>
          </div>

          <div className="saas-card overflow-hidden animate-fade-up delay-200 input-focus-card">
            <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center text-sm shadow-sm">💼</div>
                <h3 className="font-bold text-slate-800 text-sm">Job Matching</h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Job Role</label>
                <select className="input-field" value={jobId} onChange={e => setJobId(e.target.value)}>
                  <option value="">Select a role...</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.custom ? '✨ ' : ''}{j.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">GitHub URL</label>
                <input type="text" className="input-field" value={github} onChange={e => setGithub(e.target.value)} autoComplete="off" spellCheck="false" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Portfolio URL</label>
                <input type="text" className="input-field" value={portfolio} onChange={e => setPortfolio(e.target.value)} autoComplete="off" spellCheck="false" />
              </div>
            </div>
          </div>

          <div className="saas-card overflow-hidden animate-fade-up delay-300 input-focus-card">
            <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-sm shadow-sm">📂</div>
                <h3 className="font-bold text-slate-800 text-sm">Project Details</h3>
              </div>
            </div>
            <div className="p-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Projects (Natural Language)</label>
              <textarea className="input-field min-h-[148px] font-mono text-sm leading-relaxed" 
                value={projects} onChange={e => setProjects(e.target.value)} 
                autoComplete="off" spellCheck="false" />
            </div>
          </div>

          <div className="md:col-span-3 flex flex-col sm:flex-row gap-4 animate-fade-up delay-400">
            <button type="submit" disabled={loading}
              className="flex-1 px-8 py-4 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-50 hover:bg-blue-700 flex items-center justify-center gap-2 shadow-md shadow-blue-500/10 btn-glint"
              style={{ background: '#2563eb' }}>
              {loading ? <><span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin-slow" />Analyzing…</> : <>⚡ Analyze Candidate Fit</>}
            </button>
            <button type="button" onClick={handleClear} disabled={loading}
              className="px-8 py-4 rounded-xl text-slate-700 hover:text-slate-900 font-bold text-sm transition-all disabled:opacity-60 hover:bg-slate-100 flex items-center justify-center gap-2 border border-slate-200 bg-white shadow-sm">
              🗑️ Clear
            </button>
          </div>
        </form>

        {error && (
          <div className="mb-8 px-4 py-3 rounded-xl text-sm animate-fade-in flex items-start gap-2"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
            <span>⚠️</span> {error}
          </div>
        )}

        {/* ── LOADER ── */}
        {loading && (
          <div className="saas-card p-6 mb-8 animate-fade-in">
            <div className="flex flex-col items-center gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl px-4">
                {visibleSteps.map((s, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${activeStep === i ? 'bg-blue-50/50 border-blue-200' : 'bg-transparent border-transparent opacity-40'}`}>
                    {activeStep === i ? (
                      <div className="w-5 h-5 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin-slow" />
                    ) : i < activeStep ? (
                      <div className="w-5 h-5 flex items-center justify-center text-blue-500 font-bold">✓</div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-slate-200" />
                    )}
                    <div className="flex flex-col flex-1">
                      <span className={`text-xs font-bold ${activeStep === i ? 'text-blue-700' : 'text-slate-400'}`}>
                        {s.label}
                      </span>
                      {activeStep === i && (
                        <div className="h-1.5 w-full bg-blue-100 rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-blue-500 animate-[shimmer_1.5s_infinite]" style={{ width: '100%' }} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Skeletons for result preview */}
              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse opacity-20">
                <div className="h-32 skeleton"></div>
                <div className="h-32 skeleton"></div>
                <div className="h-32 skeleton"></div>
              </div>
            </div>
          </div>
        )}
        {/* ── RESULTS ── */}
        {results && (
          <div ref={resultsRef} className="space-y-5 animate-fade-up">

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12 animate-fade-up">
            {/* Profile Result Card */}
            <div className="lg:col-span-1">
              <ProfileCard 
                name={results.candidate_name || user?.name || 'Candidate'}
                title={results.job_title || jobId || 'Profile Match'}
                fitScore={results.fit_score}
                skillsCount={results.matched_skills?.length || 0}
                yearsExp={(results.experience || []).filter(x => x.role).length}
                projectsCount={results.projects?.length || 0}
                githubUrl={github}
                portfolioUrl={portfolio}
              />
            </div>
            
            {/* Breakdown cards */}
            <div className="lg:col-span-3 grid grid-cols-1 gap-6">
              <div className="saas-card p-6 animate-fade-up delay-100">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  AI Analysis Explanation
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-5 p-4 rounded-xl bg-white border border-slate-100 shadow-sm">{results.explanation}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-up delay-200">
                <div className="saas-card p-6 border-l-4 border-l-emerald-500">
                  <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-4">Matched Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {results.matched_skills.map(s => <Badge key={s} text={s} variant="match" />)}
                  </div>
                </div>
                <div className="saas-card p-6 border-l-4 border-l-rose-500">
                  <h3 className="text-xs font-black text-rose-500 uppercase tracking-widest mb-4">Missing Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {results.missing_skills.map(s => <Badge key={s} text={s} variant="missing" />)}
                  </div>
                </div>
              </div>
            </div>
          </div>

            {/* Skills grid */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="saas-card p-5 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">🛠 Top Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {(results.skills || []).length === 0
                    ? <span className="text-slate-400 text-xs italic">None detected</span>
                    : (results.skills || []).map((s, i) => <Badge key={i} text={s} variant="default" />)}
                </div>
              </div>
              <div className="saas-card p-5 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">✅ Matched</p>
                <div className="flex flex-wrap gap-1.5">
                  {(results.matched_skills || []).length === 0
                    ? <span className="text-slate-400 text-xs italic">None</span>
                    : (results.matched_skills || []).map((s, i) => <Badge key={i} text={s} variant="match" />)}
                </div>
              </div>
              <div className="saas-card p-5 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">❌ Missing</p>
                <div className="flex flex-wrap gap-1.5">
                  {(results.missing_skills || []).length === 0
                    ? <span className="text-slate-400 text-xs italic">None</span>
                    : (results.missing_skills || []).map((s, i) => <Badge key={i} text={s} variant="missing" />)}
                </div>
              </div>
            </div>

            {/* Experience & Education */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="saas-card p-5 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">💼 Experience</p>
                {(results.experience || []).filter(x => x.role).length === 0
                  ? <p className="text-slate-500 text-xs italic">No entries found</p>
                  : (results.experience || []).filter(x => x.role).map((x, i) => (
                    <div key={i} className="py-2.5 border-b last:border-0 border-slate-100">
                      <p className="text-slate-900 text-sm font-semibold">{x.role}</p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {x.organization}{x.duration ? ` · ${x.duration}` : ''}
                      </p>
                    </div>
                  ))}
              </div>
              <div className="saas-card p-5 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">🎓 Education</p>
                {(results.education || []).filter(x => x.degree || x.institution).length === 0
                  ? <p className="text-slate-500 text-xs italic">No entries found</p>
                  : (results.education || []).filter(x => x.degree || x.institution).map((x, i) => (
                    <div key={i} className="py-2.5 border-b last:border-0 border-slate-100">
                      <p className="text-slate-900 text-sm font-semibold">{x.degree}{x.field ? ` · ${x.field}` : ''}</p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {x.institution}{x.year ? ` · ${x.year}` : ''}
                      </p>
                    </div>
                  ))}
              </div>
            </div>

            {/* Projects */}
            {(results.projects || []).length > 0 && (
              <div className="saas-card p-5 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  🗂 Projects
                  {results.github_username && <span className="ml-2 font-normal text-blue-600">from GitHub @{results.github_username}</span>}
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(results.projects || []).slice(0, 9).map((p, i) => (
                    <div key={i} className="p-4 rounded-xl transition-all hover:shadow-md bg-white border border-slate-200">
                      <p className="text-slate-900 text-sm font-bold mb-1">{p.name}</p>
                      <p className="text-slate-600 text-xs mb-2 leading-relaxed line-clamp-2">{p.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {(p.languages || []).map((l, li) => (
                          <span key={li} className="badge badge-default text-xs bg-slate-100">{l}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
