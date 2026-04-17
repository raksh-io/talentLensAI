import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

/* ── Topnav ── */
function Navbar({ user, onLogout }) {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3.5 backdrop-blur-3xl"
      style={{ background: 'rgba(30, 27, 75, 0.4)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base text-white shadow-lg shadow-indigo-500/20"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #14b8a6)' }}>🔍</div>
        <div>
          <span className="font-black text-white text-lg tracking-tight">TalentLens AI</span>
          <span className="hidden sm:inline text-indigo-300 text-sm ml-2 font-black uppercase tracking-widest opacity-70">Recruiter</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm border border-indigo-400/30"
            style={{ background: 'rgba(20, 184, 166, 0.1)' }}>👤</div>
          <span className="text-white text-base font-black">{user?.name || user?.email?.split('@')[0]}</span>
        </div>
        <button onClick={onLogout}
          className="px-4 py-2 rounded-xl text-sm font-black text-indigo-100 hover:text-white border border-indigo-400/20 hover:border-teal-400/40 transition-all bg-indigo-900/40 backdrop-blur-md shadow-sm">
          Sign Out
        </button>
      </div>
    </nav>
  )
}

/* ── Avatar Helper ── */
function UserAvatar({ name, size = "w-10 h-10", className = "" }) {
  const initials = (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const hues = [200, 240, 280, 320, 360, 40, 80, 120, 160]
  const hue = hues[initials.charCodeAt(0) % hues.length]
  return (
    <div className={`rounded-2xl ${size} flex items-center justify-center font-black text-white shadow-lg ${className}`}
      style={{ background: `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${hue + 40}, 80%, 60%))` }}>
      {initials}
    </div>
  )
}

function MiniScoreRing({ score }) {
  const r = 16; const circ = 2 * Math.PI * r
  const color = score >= 70 ? '#4ade80' : score >= 40 ? '#fbbf24' : '#f87171'
  const [off, setOff] = useState(circ)
  useEffect(() => { setTimeout(() => setOff(circ - (score / 100) * circ), 300) }, [score])
  return (
    <div className="relative w-12 h-12">
      <svg viewBox="0 0 36 36" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="18" cy="18" r={r} fill="none" stroke="#e5e7eb" strokeWidth="3.5" />
        <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3.5"
          strokeLinecap="round"
          style={{ strokeDasharray: circ, strokeDashoffset: off, transition: 'stroke-dashoffset 0.8s ease 0.3s' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  )
}
function recBg(r) {
  if (r === 'Strong Hire') return 'rgba(34,197,94,0.1)'
  if (r === 'Reject') return 'rgba(239,68,68,0.1)'
  return 'rgba(245,158,11,0.1)'
}
function recColor(r) {
  if (r === 'Strong Hire') return '#22c55e'
  if (r === 'Reject') return '#ef4444'
  return '#f59e0b'
}

/* ── Candidate Detail Modal ── */
function CandidateModal({ candidate: c, onClose, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(c?.candidate_name || '')
  const [score, setScore] = useState(c?.fit_score || 0)
  const [rec, setRec] = useState(c?.recommendation || 'Consider')
  const [title, setTitle] = useState(c?.job_title || '')

  const scoreColor = score >= 70 ? '#4ade80' : score >= 40 ? '#fbbf24' : '#f87171'
  const scoreBg = score >= 70 ? 'rgba(74,222,128,0.1)' : score >= 40 ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)'

  useEffect(() => {
    const handler = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (!c) return null

  async function handleSave() {
    const fd = new FormData()
    fd.append('name', name)
    fd.append('fit_score', score)
    fd.append('recommendation', rec)
    fd.append('job_title', title)

    try {
      const res = await fetch(`/recruiter/candidates/${c._id}`, { method: 'PUT', body: fd })
      if (!res.ok) throw new Error('Update failed')
      const data = await res.json()
      onUpdate(data.candidate)
      setIsEditing(false)
    } catch (err) { alert('Failed to update candidate.') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 py-8 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl saas-card-recruiter animate-fade-up relative my-auto shadow-2xl border-teal-400/10">
        <div className="absolute top-6 right-6 flex gap-3">
          {!isEditing && (
            <button onClick={() => setIsEditing(true)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-indigo-300 hover:text-teal-400 border border-indigo-400/20 hover:border-teal-400/40 transition-all text-base bg-indigo-900/40 backdrop-blur-md shadow-sm">
              ✏️
            </button>
          )}
          <button onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-indigo-300 hover:text-white border border-indigo-400/20 hover:border-indigo-400/40 transition-all text-base bg-indigo-900/40 backdrop-blur-md shadow-sm">
            ✕
          </button>
        </div>
        <div className="p-6">
          {isEditing ? (
            <div className="space-y-6 pt-4">
              <h2 className="text-slate-900 font-black text-2xl mb-6">Edit Candidate</h2>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Name</label>
                <input className="input-field text-base py-3" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Role Title</label>
                <input className="input-field text-base py-3" value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Fit Score (0-100)</label>
                  <input className="input-field text-base py-3" type="number" min="0" max="100" value={score} onChange={e => setScore(parseInt(e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Recommendation</label>
                  <select className="input-field text-base py-3" value={rec} onChange={e => setRec(e.target.value)}>
                    <option value="Strong Hire">Strong Hire</option>
                    <option value="Consider">Consider</option>
                    <option value="Reject">Reject</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={handleSave} className="flex-1 bg-teal-600 text-white font-black py-4 rounded-2xl transition-all hover:bg-teal-500 shadow-lg shadow-teal-500/20">Save Changes</button>
                <button onClick={() => setIsEditing(false)} className="px-8 py-4 border border-indigo-400/20 text-indigo-200 font-bold rounded-2xl hover:bg-indigo-900/40">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              {/* Header Spotlight */}
              <div className="flex items-center gap-6 mb-8 pt-4">
                <UserAvatar name={c.candidate_name} size="w-24 h-24" className="text-3xl shadow-2xl" />
                <div>
                  <h2 className="text-white font-black text-5xl mb-2 leading-tight tracking-tighter">
                    {c.candidate_name || 'Candidate'}
                  </h2>
                  <div className="flex items-center gap-3">
                    <p className="text-teal-400 font-black text-xl tracking-tight uppercase opacity-80">{c.job_title || c.job_id}</p>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/30" />
                    <p className="text-indigo-300 font-bold text-base opacity-60">Ready for New Chapter</p>
                  </div>
                </div>
              </div>

              {/* Alignment Section */}
              <div className="flex items-center gap-5 p-5 saas-card-recruiter mb-8 border-teal-400/10">
                <div className="relative w-22 h-22 flex-shrink-0">
                  {(() => {
                    const r = 34; const circ = 2 * Math.PI * r
                    return (
                      <svg viewBox="0 0 75 75" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="37.5" cy="37.5" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                        <circle cx="37.5" cy="37.5" r={r} fill="none" stroke={scoreColor} strokeWidth="6"
                          strokeLinecap="round"
                          style={{ strokeDasharray: circ, strokeDashoffset: circ - (score / 100) * circ, transition: 'stroke-dashoffset 1s' }} />
                      </svg>
                    )
                  })()}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black" style={{ color: scoreColor }}>{score}</span>
                    <span className="text-[10px] text-white/40 uppercase font-black">Score</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest bg-indigo-950 text-teal-400 border border-teal-400/20">
                      {score >= 70 ? 'Exceptional Alignment' : score >= 40 ? 'Promising Fit' : 'Requires Growth'}
                    </span>
                  </div>
                  <p className="text-indigo-100 text-sm opacity-80 leading-relaxed">
                    Our intuitive analysis suggests a <span className="text-white font-black">{c.recommendation === 'Strong Hire' ? 'Perfect Match' : c.recommendation || 'Balanced Fit'}</span> for your team's current energy and technical needs.
                  </p>
                </div>
              </div>

          {/* Talent Superpowers */}
          <div className="mb-6 p-5 saas-card-recruiter border-human-amber/20 bg-amber-500/5 glow-amber">
            <h3 className="text-human-amber font-black text-xs uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <span>🌟</span> Talent Superpowers
            </h3>
            <div className="flex flex-wrap gap-2">
              {(c.skills || []).slice(0, 4).map((s, i) => (
                <span key={i} className="superpower-badge text-[10px]">{s}</span>
              ))}
              <span className="superpower-badge text-[10px]">Adaptability</span>
              <span className="superpower-badge text-[10px]">Team Harmony</span>
            </div>
          </div>

          {/* Explanation -> The Story So Far */}
          {c.explanation && (
            <div className="mb-8">
              <h3 className="text-indigo-300 font-black text-xs uppercase tracking-[0.2em] mb-3 opacity-60">The Story So Far</h3>
              <p className="text-white/90 text-lg leading-relaxed font-medium italic border-l-4 border-teal-500/40 pl-6 py-2">
                "{c.explanation}"
              </p>
            </div>
          )}

          {/* Potential for Growth Layout */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {[
              { label: '🎯 Expert Focus', items: c.matched_skills, color: 'text-teal-400', bg: 'bg-teal-400/10', border: 'border-teal-400/20' },
              { label: '🌱 Growth Zones', items: c.missing_skills, color: 'text-human-rose', bg: 'bg-rose-400/10', border: 'border-rose-400/20' },
            ].map(({ label, items, color, bg, border }) => (
              <div key={label} className={`p-5 rounded-2xl ${bg} border ${border}`}>
                <p className={`text-[10px] font-black ${color} uppercase tracking-[0.2em] mb-4`}>{label}</p>
                <div className="flex flex-wrap gap-2">
                  {(items || []).length === 0
                    ? <span className="text-white/20 text-xs italic">None noted</span>
                    : (items || []).map((s, i) => (
                      <span key={i} className={`px-3 py-1 rounded-lg bg-white/5 ${color} text-[10px] font-black border border-current opacity-80 uppercase tracking-wider`}>
                        {s}
                      </span>
                    ))}
                </div>
              </div>
            ))}
          </div>

          {/* Career Journey Timeline */}
          <div className="space-y-6">
            {[
              { label: '📂 Career Journey', rows: (c.experience || []).filter(x => x.role), icon: '💼', render: x => ({ title: x.role, sub: x.organization, detail: x.duration }) },
              { label: '📜 Knowledge Base', rows: (c.education || []).filter(x => x.degree || x.institution), icon: '🎓', render: x => ({ title: x.degree, sub: x.institution, detail: x.year }) },
            ].map(({ label, rows, icon, render }) => (
              <div key={label} className="saas-card-recruiter p-6">
                <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-3 opacity-60">
                  <span>{icon}</span> {label}
                </p>
                {rows.length === 0
                  ? <p className="text-white/20 text-xs italic">No entries listed</p>
                  : (
                    <div className="space-y-6 relative ml-3 border-l-2 border-indigo-400/10 pl-8">
                      {rows.map((x, i) => {
                        const { title, sub, detail } = render(x)
                        return (
                          <div key={i} className="relative group">
                            <div className="absolute -left-[41px] top-1.5 w-4 h-4 rounded-full bg-indigo-950 border-2 border-indigo-400/40 group-hover:border-teal-400 transition-colors" />
                            <p className="text-white text-lg font-black leading-tight mb-1">{title}</p>
                            <p className="text-indigo-200 text-base font-bold opacity-70">
                              {sub} {detail && <span className="ml-2 px-2 py-0.5 bg-indigo-400/10 rounded-md text-[10px] uppercase font-black">{detail}</span>}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )}
              </div>
            ))}
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Chip Input ── */
function ChipInput({ label, placeholder, chips, onChange }) {
  const [val, setVal] = useState('')
  function add(v) {
    const t = v.trim().replace(/,$/, '')
    if (t && !chips.includes(t)) onChange([...chips, t])
    setVal('')
  }
  return (
    <div>
      <label className="block text-xs font-black text-indigo-300 uppercase tracking-[0.2em] mb-3 opacity-70">{label}</label>
      <div className="input-field min-h-[52px] flex flex-wrap gap-2 cursor-text items-center bg-indigo-900/40 border-indigo-400/20 shadow-inner"
        onClick={e => e.currentTarget.querySelector('input')?.focus()}
        style={{ padding: '0.6rem 1rem' }}>
        {chips.map((c, i) => (
          <span key={i} className="px-3 py-1 bg-teal-500 text-white rounded-lg text-xs font-black flex items-center gap-2 shadow-lg shadow-teal-500/20">
            {c}
            <button type="button" onClick={() => onChange(chips.filter((_, j) => j !== i))}
              className="opacity-70 hover:opacity-100 leading-none text-base">×</button>
          </span>
        ))}
        <input value={val} onChange={e => setVal(e.target.value)} placeholder={chips.length === 0 ? placeholder : ''}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(val) }
            if (e.key === 'Backspace' && !val && chips.length) onChange(chips.slice(0, -1))
          }}
          onBlur={() => val.trim() && add(val)}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-white text-base placeholder:text-indigo-300/40" autoComplete="off" spellCheck="false" />
      </div>
    </div>
  )
}

/* ── Main Component ── */
export default function RecruiterDashboard() {
  const navigate = useNavigate()
  const user = (() => { try { return JSON.parse(localStorage.getItem('tl_user') || '{}') } catch { return {} } })()

  // Leaderboard state
  const [candidates, setCandidates] = useState([])
  const [jobs, setJobs] = useState([])
  const [filterJob, setFilterJob] = useState('')
  const [sortBy, setSortBy] = useState('fit_score')
  const [loadingBoard, setLoadingBoard] = useState(false)
  const [boardError, setBoardError] = useState('')
  const [selected, setSelected] = useState(null) // modal candidate

  // Create/Edit job state
  const [accordionOpen, setAccordionOpen] = useState(false)
  const [editingJobId, setEditingJobId] = useState(null)
  const [jTitle, setJTitle] = useState('')
  const [jDesc, setJDesc] = useState('')
  const [jExp, setJExp] = useState(0)
  const [reqSkills, setReqSkills] = useState([])
  const [nthSkills, setNthSkills] = useState([])
  const [domains, setDomains] = useState([])
  const [jobLoading, setJobLoading] = useState(false)
  const [jobError, setJobError] = useState('')
  const [jobSuccess, setJobSuccess] = useState('')

  function logout() { localStorage.removeItem('tl_user'); navigate('/signin', { replace: true }) }

  async function loadCandidates() {
    setLoadingBoard(true); setBoardError('')
    let url = `/recruiter/candidates?sort_by=${sortBy}`
    if (filterJob) url += `&job_id=${encodeURIComponent(filterJob)}`
    try {
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) { setBoardError(data.detail || 'Server error'); return }
      setCandidates(data.candidates || [])
    } catch { setBoardError('Cannot reach server.') }
    finally { setLoadingBoard(false) }
  }

  async function loadJobs() {
    try { const res = await fetch('/jobs'); const d = await res.json(); setJobs(d.jobs || []) } catch {}
  }

  // Theme Toggler
  useEffect(() => {
    document.body.classList.add('theme-recruiter');
    return () => document.body.classList.remove('theme-recruiter');
  }, []);

  useEffect(() => { loadCandidates(); loadJobs() }, [])
  useEffect(() => { loadCandidates() }, [filterJob, sortBy])

  async function deleteCandidate(id) {
    if (!confirm('Remove this candidate?')) return
    
    // Optimistic UI update
    const previous = [...candidates]
    setCandidates(prev => prev.filter(c => c._id !== id))
    
    try {
      const res = await fetch(`/recruiter/candidates/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
    } catch { 
      setCandidates(previous) // Revert on failure
      setBoardError('Cannot delete candidate.') 
    }
  }
 
  async function deleteJob(id) {
    if (!confirm('Permanently delete this job posting? Candidates linked to this job will remain, but the profile will be gone.')) return
    try {
      const res = await fetch(`/recruiter/jobs/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      loadJobs()
    } catch { setJobError('Failed to delete job.') }
  }

  function startEditJob(job) {
    setEditingJobId(job.id)
    setJTitle(job.title)
    setJDesc(job.description || '')
    setJExp(job.min_experience_years || 0)
    setReqSkills(job.required_skills || [])
    setNthSkills(job.nice_to_have_skills || [])
    setDomains(job.domains || [])
    setAccordionOpen(true)
    window.scrollTo({ top: 100, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingJobId(null)
    setJTitle(''); setJDesc(''); setJExp(0); setReqSkills([]); setNthSkills([]); setDomains([])
    setAccordionOpen(false)
  }

  async function clearBoard() {
    if (!confirm('Clear ALL candidates? This cannot be undone.')) return
    
    const previous = [...candidates]
    setCandidates([])
    
    try { 
      const res = await fetch('/recruiter/candidates', { method: 'DELETE' }) 
      if (!res.ok) throw new Error('Clear failed')
    }
    catch { 
      setCandidates(previous) // Revert on failure
      setBoardError('Cannot reach server or clear failed.') 
    }
  }

  async function saveJob(e) {
    e.preventDefault()
    setJobError(''); setJobSuccess('')
    if (!jTitle.trim()) { setJobError('Job title is required.'); return }
    if (reqSkills.length === 0) { setJobError('Add at least one required skill.'); return }
    setJobLoading(true)
    const fd = new FormData()
    fd.append('title', jTitle.trim())
    fd.append('description', jDesc.trim())
    fd.append('required_skills', JSON.stringify(reqSkills))
    fd.append('nice_to_have_skills', JSON.stringify(nthSkills))
    fd.append('domains', JSON.stringify(domains))
    fd.append('min_experience_years', jExp)
    
    const url = editingJobId ? `/recruiter/jobs/${editingJobId}` : '/recruiter/create-job'
    const method = editingJobId ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, { method, body: fd })
      const data = await res.json()
      if (!res.ok) { setJobError(data.detail || 'Server error'); return }
      setJobSuccess(`✅ Job "${data.job.title}" ${editingJobId ? 'updated' : 'created'}!`)
      if (!editingJobId) {
        setJTitle(''); setJDesc(''); setJExp(0); setReqSkills([]); setNthSkills([]); setDomains([])
      }
      loadJobs()
    } catch { setJobError('Cannot reach server.') }
    finally { setJobLoading(false) }
  }

  // Stats
  const total = candidates.length
  const strongHire = candidates.filter(c => c.recommendation === 'Strong Hire').length
  const avg = total ? Math.round(candidates.reduce((s, c) => s + (c.fit_score || 0), 0) / total) : null

  return (
    <div className="min-h-screen transition-colors duration-500">
      <Navbar user={user} onLogout={logout} />

      {selected && (
        <CandidateModal 
          candidate={selected} 
          onClose={() => setSelected(null)} 
          onUpdate={(newC) => {
            setCandidates(prev => prev.map(c => c._id === newC._id ? newC : c))
            setSelected(newC)
          }}
        />
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="mb-10 animate-fade-up">
          <div className="flex items-start justify-between flex-wrap gap-6">
            <div>
              <h1 className="text-5xl font-black text-white mb-2 leading-tight tracking-tighter">✨ Talent Spotlight</h1>
              <p className="text-indigo-200 text-lg opacity-80 font-medium">Discover unique potential and help talent grow into their new roles.</p>
            </div>
            <div className="flex gap-4 flex-wrap">
              {[
                { val: total, label: 'Potential Team Members', color: '#818cf8', icon: '👤' },
                { val: strongHire, label: 'Exceptional Matches', color: '#2dd4bf', icon: '💎' },
                { val: avg !== null ? avg : '—', label: 'Overall Vibe', color: '#fbbf24', icon: '📈' },
              ].map((s, i) => (
                <div key={i} className={`saas-card-recruiter px-8 py-6 text-center min-w-[120px] animate-fade-up delay-${(i + 1) * 100}`}>
                  <div className="text-[10px] mb-2 opacity-60 text-indigo-300 font-black uppercase tracking-widest">{s.label}</div>
                  <div className="text-4xl font-black text-white">{s.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Create Job Accordion ── */}
        <div className="saas-card-recruiter mb-10 animate-fade-up delay-200 shadow-2xl border-white/5 overflow-hidden">
          <button type="button"
            className="w-full flex items-center justify-between px-8 py-6 text-left transition-colors hover:bg-indigo-400/10"
            onClick={() => {
              if (accordionOpen && editingJobId) cancelEdit()
              else setAccordionOpen(v => !v)
            }}>
            <span className="text-white font-black text-xl flex items-center gap-4">
              <span className="w-12 h-12 rounded-2xl bg-teal-500 text-white flex items-center justify-center text-lg shadow-lg shadow-teal-500/30">
                {editingJobId ? '✏️' : '✨'}
              </span>
              {editingJobId ? `Editing: ${jTitle}` : 'Launch Custom Job Posting'}
            </span>
            <span className="text-indigo-300 text-xl transition-transform duration-300" style={{ transform: accordionOpen ? 'rotate(180deg)' : '' }}>▼</span>
          </button>

          {accordionOpen && (
            <form onSubmit={saveJob} className="px-6 pb-6 animate-fade-in border-t border-slate-100">
              <div className="grid sm:grid-cols-2 gap-4 mt-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Job Title <span className="text-rose-400">*</span></label>
                  <input className="input-field" type="text" value={jTitle} onChange={e => setJTitle(e.target.value)} autoComplete="off" spellCheck="false" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Min. Experience (years)</label>
                  <input className="input-field" type="number" value={jExp} onChange={e => setJExp(e.target.value)} min="0" max="30" step="0.5" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                  <textarea className="input-field" rows={2} value={jDesc} onChange={e => setJDesc(e.target.value)} autoComplete="off" spellCheck="false" />
                </div>
                <div className="sm:col-span-2">
                  <ChipInput label={<>Required Skills <span className="text-rose-400">*</span></>} placeholder="Type & press Enter…" chips={reqSkills} onChange={setReqSkills} />
                </div>
                <div>
                  <ChipInput label="Nice-to-Have Skills" placeholder="e.g. GraphQL" chips={nthSkills} onChange={setNthSkills} />
                </div>
                <div>
                  <ChipInput label="Domains" placeholder="e.g. Frontend, Web" chips={domains} onChange={setDomains} />
                </div>
              </div>

              {jobError && (
                <div className="mt-4 px-4 py-3 rounded-lg text-sm animate-fade-in"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
                  ⚠ {jobError}
                </div>
              )}
              {jobSuccess && (
                <div className="mt-4 px-4 py-3 rounded-lg text-sm animate-fade-in"
                  style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#6ee7b7' }}>
                  {jobSuccess}
                </div>
              )}

                <div className="flex gap-3">
                  <button type="submit" disabled={jobLoading}
                    className="flex-1 px-6 py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-50 hover:bg-blue-700 flex items-center justify-center gap-2 shadow-md shadow-blue-500/10 btn-glint"
                    style={{ background: '#2563eb' }}>
                    {jobLoading ? <><span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin-slow" />Saving…</> : <>{editingJobId ? '💾 Update Job' : '🚀 Create Job Posting'}</>}
                  </button>
                  {editingJobId && (
                    <button type="button" onClick={cancelEdit}
                      className="px-6 py-3 rounded-xl text-slate-600 font-bold text-sm border border-slate-200 hover:bg-slate-50 transition-all">
                      Cancel
                    </button>
                  )}
                </div>
            </form>
          )}
        </div>

        {/* ── Job Management Section ── */}
        <div className="saas-card-recruiter mb-12 animate-fade-up delay-300 overflow-hidden shadow-2xl border-white/5">
          <div className="px-8 py-6 border-b border-indigo-400/10 bg-indigo-900/20">
            <h2 className="text-white font-black text-xl flex items-center gap-4"><span>📂</span> Manage Custom Jobs</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base">
              <thead className="bg-indigo-950/40 text-indigo-300 uppercase text-[11px] font-black tracking-[0.2em] border-b border-indigo-400/10">
                <tr>
                  <th className="px-8 py-5">Job Title</th>
                  <th className="px-8 py-5">Skills</th>
                  <th className="px-8 py-5">Exp</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-400/10 text-indigo-100">
                {jobs.filter(j => j.custom).map(j => (
                  <tr key={j.id} className="row-glow-recruiter transition-all">
                    <td className="px-8 py-6 font-black text-white">{j.title}</td>
                    <td className="px-8 py-6">
                      <div className="flex flex-wrap gap-2">
                        {(j.required_skills || []).slice(0, 3).map((s, i) => (
                          <span key={i} className="px-3 py-1 bg-white/5 text-teal-400 rounded-lg text-[10px] font-black uppercase tracking-wider border border-teal-400/20">{s}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-indigo-200 font-bold">{j.min_experience_years}y</td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => startEditJob(j)} className="w-10 h-10 rounded-2xl flex items-center justify-center text-indigo-100 hover:text-teal-400 hover:bg-teal-400/10 transition-colors bg-white/5 border border-indigo-400/20" title="Edit">
                          ✏️
                        </button>
                        <button onClick={() => deleteJob(j.id)} className="w-10 h-10 rounded-2xl flex items-center justify-center text-rose-400 hover:bg-rose-400/10 transition-colors bg-white/5 border border-indigo-400/20" title="Delete">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {jobs.filter(j => j.custom).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-12 text-center text-slate-400 italic font-medium">No custom jobs created yet. Start by creating one above!</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Leaderboard ── */}
        <div className="saas-card-recruiter animate-fade-up delay-200 shadow-2xl border-white/5 overflow-hidden">
          {/* Table header bar */}
          <div className="flex items-center justify-between flex-wrap gap-4 px-8 py-6 border-b border-indigo-400/10 bg-indigo-900/20">
            <h2 className="text-white font-black text-xl flex items-center gap-4"><span>🤝</span> Team Prospects</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => {
                const name = prompt('Candidate Name:')
                if (!name) return
                const jid = prompt('Job ID (e.g. software_engineer):', filterJob || 'software_engineer')
                if (!jid) return
                const fd = new FormData()
                fd.append('name', name)
                fd.append('job_id', jid)
                fetch('/recruiter/candidates', { method: 'POST', body: fd })
                  .then(r => r.json())
                  .then(d => { loadCandidates(); alert('Prospect added!') })
              }}
                className="px-6 py-3 rounded-2xl text-xs font-black text-white transition-all bg-teal-600 hover:bg-teal-500 shadow-lg shadow-teal-500/30 uppercase tracking-[0.2em]">
                + Find Harmony
              </button>
              <select className="input-field text-[10px] py-2.5 px-6 font-black uppercase tracking-wider bg-indigo-900/40 border-indigo-400/20 text-white" style={{ width: 'auto' }} value={filterJob} onChange={e => setFilterJob(e.target.value)}>
                <option value="">All Journeys</option>
                {jobs.map(j => <option key={j.id} value={j.id}>{j.custom ? '✨ ' : ''}{j.title}</option>)}
              </select>
              <select className="input-field text-[10px] py-2.5 px-6 font-black uppercase tracking-wider bg-indigo-900/40 border-indigo-400/20 text-white" style={{ width: 'auto' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="fit_score">Focus: Potential</option>
                <option value="analyzed_at">Focus: Recency</option>
              </select>
              <button onClick={loadCandidates}
                className="px-6 py-2.5 rounded-2xl text-xs font-black text-indigo-100 hover:text-white border border-indigo-400/20 hover:border-teal-400/40 transition-all bg-indigo-900/40 backdrop-blur-md shadow-sm">
                ↻ Refresh
              </button>
              <button onClick={clearBoard}
                className="px-6 py-2.5 rounded-2xl text-xs font-black border transition-all hover:bg-rose-500/10 backdrop-blur-md"
                style={{ color: '#fb7185', borderColor: '#f43f5e', background: 'rgba(244, 63, 94, 0.1)' }}>
                🗑 Clear
              </button>
            </div>
          </div>

          {boardError && (
            <div className="mx-6 mt-4 px-4 py-3 rounded-lg text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
              ⚠ {boardError}
            </div>
          )}

          {/* Loading */}
          {loadingBoard && (
            <div className="flex items-center justify-center py-16 gap-2 text-slate-500 text-sm">
              <span className="w-4 h-4 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin-slow" />
              Loading candidates…
            </div>
          )}

          {/* Empty state */}
          {!loadingBoard && candidates.length === 0 && (
            <div className="text-center py-16 px-6">
              <div className="text-5xl mb-4 opacity-70">🎯</div>
              <h3 className="text-slate-900 font-bold mb-2">No candidates yet</h3>
              <p className="text-slate-500 text-sm">Ask candidates to submit their resume via the Candidate dashboard.<br />Results appear here automatically.</p>
            </div>
          )}

          {/* Table */}
          {!loadingBoard && candidates.length > 0 && (
            <div className="overflow-x-auto">
              <table className="rec-table">
                <thead>
                  <tr>
                    <th>#</th><th>Score</th><th>Candidate</th><th>Role</th>
                    <th>Recommendation</th><th>Top Skills</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c, idx) => {
                    const rank = idx + 1
                    const rankColors = ['linear-gradient(135deg,#f59e0b,#fbbf24)', 'linear-gradient(135deg,#9ca3af,#d1d5db)', 'linear-gradient(135deg,#92400e,#b45309)']
                    const rankTextColor = rank <= 3 ? '#000' : '#94a3b8'
                    return (
                      <tr key={c._id || idx} className={`animate-fade-up row-glow-recruiter transition-all`} style={{ animationDelay: `${0.05 * idx}s` }}>
                        <td className="px-8 py-6">
                          <UserAvatar name={c.candidate_name} />
                        </td>
                        <td className="px-8 py-6"><MiniScoreRing score={c.fit_score || 0} /></td>
                        <td className="px-8 py-6">
                          <div className="font-black text-white text-xl leading-tight">{c.candidate_name || 'Unknown'}</div>
                          <div className="text-xs text-indigo-300 mt-1 font-black uppercase tracking-[0.2em] opacity-60">
                            {c.github_username ? `🐙 @${c.github_username}` : ''}
                            {c.github_username && c.portfolio_url ? ' · ' : ''}
                            {c.portfolio_url ? '🌐 Personal Site' : ''}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-teal-400 font-black text-sm tracking-tight uppercase opacity-80">{c.job_title || c.job_id || '—'}</td>
                        <td className="px-8 py-6">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-2xl shadow-lg border border-white/5"
                            style={{ background: recBg(c.recommendation), color: recColor(c.recommendation) }}>
                            {c.recommendation === 'Strong Hire' ? 'Perfect Match' : c.recommendation || '-'}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-wrap gap-2 max-w-[220px]">
                            {(c.skills || []).slice(0, 3).map((s, i) => (
                              <span key={i} className="px-3 py-1 bg-white/5 text-indigo-200 rounded-lg text-[10px] font-black border border-indigo-400/20 uppercase tracking-wider">{s}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex gap-3">
                            <button onClick={() => setSelected(c)}
                              className="px-6 py-2.5 rounded-2xl text-xs font-black border border-indigo-400/20 text-indigo-100 hover:text-white hover:border-teal-400/40 transition-all bg-indigo-900/40 backdrop-blur-md shadow-sm uppercase tracking-widest text-[10px]">
                              👁 Meet
                            </button>
                            <button onClick={() => deleteCandidate(c._id)}
                              className="w-10 h-10 flex items-center justify-center rounded-2xl text-sm border transition-all hover:bg-rose-500/10 backdrop-blur-md bg-indigo-900/40"
                              style={{ color: '#fb7185', borderColor: 'rgba(244, 63, 94, 0.2)' }}>
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
