import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { ProfileCard } from '@/components/ui/profile-card'
import { CpuArchitecture } from '@/components/ui/cpu-architecture'
import { RevealCard, IdentityCardBody } from '@/components/ui/reveal-card'
import { motion } from 'framer-motion'
import { 
  Brain, 
  Star, 
  AlertCircle, 
  Wrench, 
  Briefcase, 
  GraduationCap, 
  FolderSearch, 
  Sparkles,
  Users,
  Zap,
  Target,
  Cpu,
  Globe
} from 'lucide-react'

/* ── Topnav ── */
function Navbar({ user, onLogout }) {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-xl border-b border-slate-100 bg-white/70">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <span className="font-black text-slate-900 text-lg tracking-tight leading-none">TalentLens AI</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Candidate Intelligence</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-black">
            {user?.name?.[0] || user?.email?.[0]?.toUpperCase()}
          </div>
          <span className="text-slate-600 text-xs font-black uppercase tracking-widest">{user?.name || user?.email?.split('@')[0]}</span>
        </div>
        <button onClick={onLogout}
          className="px-5 py-2.5 rounded-xl text-xs font-black text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-all bg-white shadow-sm uppercase tracking-widest">
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
        <circle cx="60" cy="60" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round"
          style={{ strokeDasharray: circ, strokeDashoffset: offset, transition: 'stroke-dashoffset 1s ease 0.2s' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-slate-900 leading-none">{score}</span>
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Match</span>
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
  { id: 'ls1', label: 'Extracting Resume Data' },
  { id: 'ls2', label: 'Analyzing GitHub' },
  { id: 'ls3', label: 'Analyzing Portfolio' },
  { id: 'ls4', label: 'Matching Skills' },
  { id: 'ls5', label: 'Generating Fit Score' },
]

export default function CandidateDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser({
          name: session.user.user_metadata?.full_name,
          email: session.user.email,
          role: session.user.user_metadata?.role
        })
      }
    })
  }, [])

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

  async function logout() { 
    await supabase.auth.signOut()
    localStorage.removeItem('tl_user')
    navigate('/signin', { replace: true }) 
  }

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
      if (i < visible.length) { i++; stepTimer.current = setTimeout(next, 800) }
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
    <div className="relative min-h-screen bg-slate-50">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-50 rounded-full blur-[120px] -z-10 opacity-60" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-50 rounded-full blur-[100px] -z-10 opacity-40" />
      
      <Navbar user={user} onLogout={logout} />

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Page header */}
        <div className="mb-12 animate-fade-up">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] mb-4"
          >
            <div className="w-6 h-px bg-blue-600" /> Professional Dashboard
          </motion.div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-2">Self Alignment Analysis</h1>
          <p className="text-slate-500 text-lg font-medium">Verify your skills against market requirements in seconds.</p>
        </div>

        {/* ── INPUT FORM ── */}
        {/* ── INPUT FORM ── */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Resume Upload Card */}
          <div className="saas-card overflow-hidden animate-fade-up bg-white">
            <div className="flex items-center gap-3 px-8 py-6 border-b border-slate-50">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">Candidate Data</h3>
            </div>
            <div className="p-8">
              <div 
                className={`group relative border-2 border-dashed rounded-[1.5rem] p-10 text-center transition-all duration-300 hover:border-blue-400 hover:bg-blue-50/30 ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-100'}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={(e) => setFile(e.target.files[0])} />
                <div className="w-16 h-16 rounded-2xl bg-slate-50 group-hover:bg-white flex items-center justify-center mx-auto mb-4 transition-colors shadow-sm">
                  {file ? <Zap className="w-8 h-8 text-blue-600" /> : <Users className="w-8 h-8 text-slate-300" />}
                </div>
                <p className="text-sm font-black text-slate-800 mb-1">{file ? file.name : 'Upload Resume'}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{file ? `${(file.size/1024).toFixed(1)} KB` : 'PDF, DOCX, or TXT'}</p>
              </div>
            </div>
          </div>

          {/* Socials & Meta Card */}
          <div className="saas-card overflow-hidden animate-fade-up delay-100 bg-white">
            <div className="flex items-center gap-3 px-8 py-6 border-b border-slate-50">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shadow-sm">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">Presence</h3>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Social Repositories</label>
                <div className="space-y-3">
                   <div className="relative group">
                    <input type="text" placeholder="GitHub Profile URL" className="input-field pl-11" value={github} onChange={e => setGithub(e.target.value)} />
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <div className="relative group">
                    <input type="text" placeholder="Portfolio Website" className="input-field pl-11" value={portfolio} onChange={e => setPortfolio(e.target.value)} />
                    <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Target Alignment</label>
                <select className="input-field" value={jobId} onChange={e => setJobId(e.target.value)}>
                   <option value="">Select Target Role</option>
                   {jobs.map(j => <option key={j.id} value={j.id}>{j.custom ? '✨ ' : ''}{j.title}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Experience Card */}
          <div className="saas-card overflow-hidden animate-fade-up delay-200 bg-white">
            <div className="flex items-center gap-3 px-8 py-6 border-b border-slate-50">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">Project Narrative</h3>
            </div>
            <div className="p-8">
              <textarea 
                placeholder="Describe your flagship projects or paste relevant work samples here for deeper NLP extraction..." 
                className="input-field min-h-[164px] font-medium text-sm leading-relaxed resize-none" 
                value={projects} onChange={e => setProjects(e.target.value)} 
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="lg:col-span-3 flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm animate-fade-up delay-300">
             <div className="flex items-center gap-3 pl-4">
                <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center">
                   <Target className="w-3 h-3 text-blue-600" />
                </div>
                <span className="text-sm font-bold text-slate-400 italic">Ready for high-precision neural matching?</span>
             </div>
             <div className="flex gap-4">
                <button type="button" onClick={handleClear} disabled={loading}
                  className="px-8 py-3.5 rounded-2xl text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50">
                  Reset
                </button>
                <button type="submit" disabled={loading}
                  className="px-10 py-3.5 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 hover:bg-blue-700 shadow-lg shadow-blue-500/20 btn-glint">
                  {loading ? 'Analyzing Neural Paths...' : '⚡ Initiate Deep Scan'}
                </button>
             </div>
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
          <div className="saas-card p-8 mb-8 animate-fade-in bg-white/50 backdrop-blur-xl border-white/60">
            <div className="flex flex-col items-center gap-8">
              {/* CPU Architecture Visual */}
              <div className="w-full max-w-2xl h-64 opacity-100 mt-4">
                <CpuArchitecture text="AI MATCH" />
              </div>
              
            </div>
          </div>
        )}
        {/* ── RESULTS ── */}
        {results && (
          <div ref={resultsRef} className="space-y-5 animate-fade-up">

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12 animate-fade-up">
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
              
              {/* SECTION 1: Strategic Overview */}
              <div className="lg:col-span-3 space-y-8">
                {/* AI Analysis Container */}
                <RevealCard
                  accent="#3b82f6"
                  base={
                    <IdentityCardBody title="AI Analysis" subtitle="Neural Evaluation" icon={<Brain />}>
                      <div className="mt-4 flex items-center gap-4">
                        <div className="text-5xl font-black text-[#2dd4bf]">{results.fit_score}%</div>
                        <div className="flex-grow h-3 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-[#2dd4bf] transition-all duration-1000" style={{ width: `${results.fit_score}%` }} />
                        </div>
                      </div>
                      <p className="mt-6 text-lg text-slate-400 leading-relaxed mb-6">{results.explanation.slice(0, 200)}...</p>
                      <div className="mt-6 flex justify-center">
                        <div className="relative w-40 h-24 overflow-hidden">
                          <svg viewBox="0 0 100 50" className="w-full h-full">
                            <path d="M 10 45 A 40 40 0 0 1 90 45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" strokeLinecap="round" />
                            <path d="M 10 45 A 40 40 0 0 1 90 45" fill="none" stroke="url(#speed-grad)" strokeWidth="10" strokeLinecap="round" strokeDasharray="125.6" strokeDashoffset={125.6 * (1 - results.fit_score / 100)} className="transition-all duration-1000 ease-out" />
                            <defs>
                              <linearGradient id="speed-grad" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#2dd4bf" /><stop offset="100%" stopColor="#3b82f6" />
                              </linearGradient>
                            </defs>
                            <line x1="50" y1="45" x2="50" y2="15" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" style={{ transformOrigin: '50px 45px', transform: `rotate(${(results.fit_score / 100) * 180 - 90}deg)`, transition: 'transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
                            <circle cx="50" cy="45" r="4" fill="#94a3b8" />
                          </svg>
                        </div>
                      </div>
                    </IdentityCardBody>
                  }
                  overlay={
                    <IdentityCardBody title="Deep Analysis" subtitle="Neural Fit Verdict" icon={<Brain />} scheme="accented">
                      <div className="mt-6 flex items-center gap-6 mb-8">
                        <div className="text-7xl font-black text-white">{results.fit_score}%</div>
                        <div className="flex-grow h-4 bg-white/20 rounded-full overflow-hidden">
                          <div className="h-full bg-white transition-all duration-1000" style={{ width: `${results.fit_score}%` }} />
                        </div>
                      </div>
                      <p className="text-lg text-blue-50 leading-relaxed mb-8">{results.explanation}</p>
                      <div className="flex justify-center opacity-80">
                        <div className="relative w-48 h-28 overflow-hidden">
                          <svg viewBox="0 0 100 50" className="w-full h-full">
                            <path d="M 10 45 A 40 40 0 0 1 90 45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" strokeLinecap="round" />
                            <path d="M 10 45 A 40 40 0 0 1 90 45" fill="none" stroke="white" strokeWidth="10" strokeLinecap="round" strokeDasharray="125.6" strokeDashoffset={125.6 * (1 - results.fit_score / 100)} className="transition-all duration-1000 ease-out" />
                            <line x1="50" y1="45" x2="50" y2="10" stroke="white" strokeWidth="3" strokeLinecap="round" style={{ transformOrigin: '50px 45px', transform: `rotate(${(results.fit_score / 100) * 180 - 90}deg)`, transition: 'transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
                            <circle cx="50" cy="45" r="5" fill="white" />
                          </svg>
                        </div>
                      </div>
                    </IdentityCardBody>
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* SECTION 2: Matched Skills */}
              <RevealCard
                accent="#10b981"
                base={
                  <IdentityCardBody title="Matched Skills" subtitle="Role Alignment" icon={<Star />}>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {results.matched_skills?.map(s => <Badge key={s} text={s} variant="match" />)}
                    </div>
                  </IdentityCardBody>
                }
                overlay={
                  <IdentityCardBody title="Matched Skills" subtitle="Strong Proficiency" icon={<Star />} scheme="accented">
                    <div className="flex flex-wrap gap-2 mt-4">
                      {results.matched_skills?.map(s => (
                        <span key={s} className="px-2 py-1 bg-white/20 rounded-md text-xs font-bold text-white uppercase">{s}</span>
                      ))}
                    </div>
                  </IdentityCardBody>
                }
              />

              {/* SECTION 3: Missing Skills */}
              <RevealCard
                accent="#ef4444"
                base={
                  <IdentityCardBody title="Missing Skills" subtitle="Skill Deficit" icon={<AlertCircle />}>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {results.missing_skills?.map(s => <Badge key={s} text={s} variant="missing" />)}
                    </div>
                  </IdentityCardBody>
                }
                overlay={
                  <IdentityCardBody title="Missing Skills" subtitle="Upskilling Required" icon={<AlertCircle />} scheme="accented">
                    <div className="flex flex-wrap gap-2 mt-4">
                      {results.missing_skills?.map(s => (
                        <span key={s} className="px-2 py-1 bg-white/20 rounded-md text-xs font-bold text-white uppercase">{s}</span>
                      ))}
                    </div>
                  </IdentityCardBody>
                }
              />
            </div>

            <div className="space-y-8">
              {/* SECTION 4: Experience */}
              <RevealCard
                accent="#4f46e5"
                base={
                  <IdentityCardBody title="💼 Experience" subtitle="Professional Path" icon={<Briefcase />}>
                    <div className="mt-4 space-y-3">
                      {results.experience?.filter(x => x.role).map((x, i) => (
                        <div key={i} className="py-3 border-b border-white/5 last:border-0">
                          <p className="text-lg font-bold text-white leading-tight">{x.role}</p>
                          <p className="text-xs text-slate-400 mt-1">{x.organization} {x.duration ? `· ${x.duration}` : ''}</p>
                        </div>
                      ))}
                    </div>
                  </IdentityCardBody>
                }
                overlay={
                  <IdentityCardBody title="💼 Experience" subtitle="Work History" icon={<Briefcase />} scheme="accented">
                    <div className="mt-4 space-y-3">
                      {results.experience?.filter(x => x.role).map((x, i) => (
                        <div key={i} className="border-l-2 border-white/20 pl-4 py-1">
                        <p className="text-sm font-black uppercase tracking-wider">{x.role}</p>
                        <p className="text-xs text-blue-100/70">{x.organization} {x.duration ? `· ${x.duration}` : ''}</p>
                      </div>
                      ))}
                    </div>
                  </IdentityCardBody>
                }
              />

              {/* SECTION 5: Education */}
              <RevealCard
                accent="#8b5cf6"
                base={
                  <IdentityCardBody title="🎓 Education" subtitle="Academic Background" icon={<GraduationCap />}>
                    <div className="mt-4 space-y-3">
                      {results.education?.filter(x => x.degree || x.institution).map((x, i) => (
                        <div key={i} className="py-2 border-b border-slate-50 last:border-0">
                          <p className="text-xs font-bold text-white leading-tight">{x.degree}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{x.institution} {x.year ? `· ${x.year}` : ''}</p>
                        </div>
                      ))}
                    </div>
                  </IdentityCardBody>
                }
                overlay={
                  <IdentityCardBody title="🎓 Education" subtitle="Qualifications" icon={<GraduationCap />} scheme="accented">
                    <div className="mt-4 space-y-3">
                      {results.education?.filter(x => x.degree || x.institution).map((x, i) => (
                        <div key={i} className="border-l-2 border-white/20 pl-3">
                          <p className="text-xs font-black uppercase tracking-wider">{x.degree}</p>
                          <p className="text-[10px] text-purple-100/70">{x.institution} {x.year ? `· ${x.year}` : ''}</p>
                        </div>
                      ))}
                    </div>
                  </IdentityCardBody>
                }
              />

              {/* SECTION 6: Detailed Inventory */}
              <RevealCard
                accent="#64748b"
                base={
                  <IdentityCardBody title="🛠 All Detected Skills" subtitle="Tech Stack Inventory" icon={<Wrench />}>
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {(results.skills || []).map((s, i) => <Badge key={i} text={s} variant="default" />)}
                    </div>
                  </IdentityCardBody>
                }
                overlay={
                  <IdentityCardBody title="Full Inventory" subtitle="Extracted Keywords" icon={<Wrench />} scheme="accented">
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {(results.skills || []).map((s, i) => (
                        <span key={i} className="px-2 py-1 bg-white/20 rounded-md text-[10px] font-black uppercase text-white">{s}</span>
                      ))}
                    </div>
                  </IdentityCardBody>
                }
              />

              {/* SECTION 7: Projects */}
              {results.projects?.length > 0 && (
                <RevealCard
                  accent="#0f172a"
                  base={
                    <IdentityCardBody title="🗂 Projects" subtitle="GitHub & Portfolio" icon={<FolderSearch />}>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                        {results.projects.map((p, i) => (
                          <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                            <p className="text-[10px] text-slate-500 line-clamp-2 mt-1">{p.description}</p>
                          </div>
                        ))}
                      </div>
                    </IdentityCardBody>
                  }
                  overlay={
                    <IdentityCardBody title="Tech Repositories" subtitle="Hands-on Evidence" icon={<FolderSearch />} scheme="accented">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                        {results.projects.map((p, i) => (
                          <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10">
                            <p className="text-xs font-black text-white truncate">{p.name}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {p.languages?.slice(0, 3).map(l => (
                                <span key={l} className="text-[8px] bg-white/20 px-1 rounded uppercase font-bold">{l}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </IdentityCardBody>
                  }
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
