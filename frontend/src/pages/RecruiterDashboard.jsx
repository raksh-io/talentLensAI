import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

/* ── Topnav ── */
function Navbar({ user, onLogout }) {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3.5"
      style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.5)' }}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base text-white shadow-sm"
          style={{ background: '#2563eb' }}>🔍</div>
        <div>
          <span className="font-bold text-slate-900 text-sm">TalentLens AI</span>
          <span className="hidden sm:inline text-slate-500 text-xs ml-2">· Recruiter Dashboard</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
            style={{ background: '#eff6ff' }}>🏢</div>
          <span className="text-slate-600 text-sm font-medium">{user?.name || user?.email?.split('@')[0]}</span>
          <span className="badge badge-recruiter text-xs">Recruiter</span>
        </div>
        <button onClick={onLogout}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-all bg-white shadow-sm">
          Sign Out
        </button>
      </div>
    </nav>
  )
}

/* ── Mini score ring for table ── */
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
      <div className="w-full max-w-2xl saas-card animate-fade-up relative my-auto shadow-2xl">
        <div className="absolute top-4 right-4 flex gap-2">
          {!isEditing && (
            <button onClick={() => setIsEditing(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 border border-slate-200 hover:border-blue-200 transition-all text-sm bg-white">
              ✏️
            </button>
          )}
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-all text-sm bg-white">
            ✕
          </button>
        </div>
        <div className="p-6">
          {isEditing ? (
            <div className="space-y-4 pt-4">
              <h2 className="text-slate-900 font-bold text-lg mb-4">Edit Candidate</h2>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Name</label>
                <input className="input-field" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Role Title</label>
                <input className="input-field" value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Fit Score (0-100)</label>
                  <input className="input-field" type="number" min="0" max="100" value={score} onChange={e => setScore(parseInt(e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Recommendation</label>
                  <select className="input-field" value={rec} onChange={e => setRec(e.target.value)}>
                    <option value="Strong Hire">Strong Hire</option>
                    <option value="Consider">Consider</option>
                    <option value="Reject">Reject</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleSave} className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-xl transition-all hover:bg-blue-700">Save Changes</button>
                <button onClick={() => setIsEditing(false)} className="px-6 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-slate-900 font-bold text-lg mb-4 pr-16 leading-tight">
                {c.candidate_name || 'Candidate'} · <span className="text-slate-500 font-normal text-sm">{c.job_title || c.job_id}</span>
              </h2>

          {/* Score band */}
          <div className="flex items-center gap-5 p-4 rounded-xl mb-5"
            style={{ background: '#f8fafc', border: '1px solid #e5e7eb' }}>
            <div className="relative w-20 h-20 flex-shrink-0">
              {(() => {
                const r = 34; const circ = 2 * Math.PI * r
                return (
                  <svg viewBox="0 0 75 75" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="37.5" cy="37.5" r={r} fill="none" stroke="#e5e7eb" strokeWidth="6" />
                    <circle cx="37.5" cy="37.5" r={r} fill="none" stroke={scoreColor} strokeWidth="6"
                      strokeLinecap="round"
                      style={{ strokeDasharray: circ, strokeDashoffset: circ - (score / 100) * circ, transition: 'stroke-dashoffset 1s' }} />
                  </svg>
                )
              })()}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black" style={{ color: scoreColor }}>{score}</span>
                <span className="text-xs text-slate-600">/100</span>
              </div>
            </div>
            <div className="flex-1">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: scoreBg, color: scoreColor }}>{c.score_label || score >= 70 ? 'Strong Fit' : score >= 40 ? 'Moderate Fit' : 'Weak Fit'}</span>
              <p className="text-slate-500 text-sm mt-2">
                Recommendation: <span className="text-slate-900 font-semibold">{c.recommendation || '-'}</span>
              </p>
              {c.github_username && <p className="text-slate-500 text-xs mt-1">🐙 @{c.github_username}</p>}
              {/* Progress bars */}
              <div className="mt-3 space-y-1.5">
                {[['Skill Match', 'skill_match', '#8b5cf6'], ['Project Fit', 'project_relevance', '#34d399']].map(([l, k, col]) => (
                  <div key={k}>
                    <div className="flex justify-between text-xs text-slate-600 mb-0.5">
                      <span>{l}</span><span style={{ color: col }}>{c.score_breakdown?.[k] || 0}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${c.score_breakdown?.[k] || 0}%`, background: col }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Explanation */}
          {c.explanation && (
            <p className="text-slate-600 text-sm leading-relaxed p-4 rounded-xl mb-4 bg-slate-50 border border-slate-200">
              {c.explanation}
            </p>
          )}

          {/* Skills grids */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: '🛠 Skills', items: c.skills, variant: 'default' },
              { label: '✅ Matched', items: c.matched_skills, variant: 'match' },
              { label: '❌ Missing', items: c.missing_skills, variant: 'missing' },
            ].map(({ label, items, variant }) => (
              <div key={label} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{label}</p>
                <div className="flex flex-wrap gap-1">
                  {(items || []).length === 0
                    ? <span className="text-slate-400 text-xs italic">None</span>
                    : (items || []).map((s, i) => <span key={i} className={`badge badge-${variant}`}>{s}</span>)}
                </div>
              </div>
            ))}
          </div>

          {/* Exp & Edu */}
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { label: '💼 Experience', rows: (c.experience || []).filter(x => x.role), render: x => ({ title: x.role, sub: `${x.organization || ''}${x.duration ? ' · ' + x.duration : ''}` }) },
              { label: '🎓 Education', rows: (c.education || []).filter(x => x.degree || x.institution), render: x => ({ title: `${x.degree || ''}${x.field ? ' · ' + x.field : ''}`, sub: `${x.institution || ''}${x.year ? ' · ' + x.year : ''}` }) },
            ].map(({ label, rows, render }) => (
              <div key={label} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{label}</p>
                {rows.length === 0
                  ? <p className="text-slate-400 text-xs italic">None found</p>
                  : rows.map((x, i) => {
                    const { title, sub } = render(x)
                    return (
                      <div key={i} className="py-2 border-b last:border-0 border-slate-200">
                        <p className="text-slate-900 text-xs font-semibold">{title}</p>
                        <p className="text-slate-500 text-xs">{sub}</p>
                      </div>
                    )
                  })}
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
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{label}</label>
      <div className="input-field min-h-[42px] flex flex-wrap gap-1.5 cursor-text items-center"
        onClick={e => e.currentTarget.querySelector('input')?.focus()}
        style={{ padding: '0.4rem 0.75rem' }}>
        {chips.map((c, i) => (
          <span key={i} className="badge badge-recruiter flex items-center gap-1">
            {c}
            <button type="button" onClick={() => onChange(chips.filter((_, j) => j !== i))}
              className="opacity-60 hover:opacity-100 leading-none">×</button>
          </span>
        ))}
        <input value={val} onChange={e => setVal(e.target.value)} placeholder={chips.length === 0 ? placeholder : ''}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(val) }
            if (e.key === 'Backspace' && !val && chips.length) onChange(chips.slice(0, -1))
          }}
          onBlur={() => val.trim() && add(val)}
          className="flex-1 min-w-[80px] bg-transparent outline-none text-slate-900 text-sm" autoComplete="off" spellCheck="false" />
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
    <div className="min-h-screen bg-slate-50">
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-6 animate-fade-up">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1 leading-tight tracking-tight">🏢 Recruiter Dashboard</h1>
              <p className="text-slate-600 text-sm">Manage job postings and rank candidates by fit score.</p>
            </div>
            {/* Stat pills */}
            <div className="flex gap-3 flex-wrap">
              {[
                { val: total, label: 'Candidates', color: '#f9a8d4' },
                { val: strongHire, label: 'Strong Hire', color: '#4ade80' },
                { val: avg !== null ? avg : '—', label: 'Avg Score', color: '#fbbf24' },
              ].map((s, i) => (
                <div key={i} className={`saas-card px-4 py-3 text-center min-w-[70px] animate-fade-up delay-${(i + 1) * 100}`}>
                  <div className="text-xl font-black">{s.val}</div>
                  <div className="text-xs text-slate-500 mt-0.5 font-bold uppercase tracking-tighter opacity-70">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Create Job Accordion ── */}
        <div className="saas-card mb-5 animate-fade-up delay-200 shadow-sm border border-slate-200 input-focus-card overflow-hidden">
          <button type="button"
            className="w-full flex items-center justify-between px-6 py-4 text-left transition-colors hover:bg-slate-50/50"
            onClick={() => {
              if (accordionOpen && editingJobId) cancelEdit()
              else setAccordionOpen(v => !v)
            }}>
            <span className="text-slate-900 font-bold text-sm flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm shadow-sm">
                {editingJobId ? '✏️' : '✨'}
              </span>
              {editingJobId ? `Editing: ${jTitle}` : 'Create Custom Job Posting'}
            </span>
            <span className="text-slate-400 text-sm transition-transform duration-300" style={{ transform: accordionOpen ? 'rotate(180deg)' : '' }}>▼</span>
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
        <div className="saas-card mb-8 animate-fade-up delay-300 overflow-hidden border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/30">
            <h2 className="text-slate-900 font-bold text-sm flex items-center gap-2"><span>📂</span> Manage Custom Jobs</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Job Title</th>
                  <th className="px-6 py-3">Skills</th>
                  <th className="px-6 py-3">Exp</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.filter(j => j.custom).map(j => (
                  <tr key={j.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">{j.title}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(j.required_skills || []).slice(0, 3).map((s, i) => (
                          <span key={i} className="badge badge-default text-[10px]">{s}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{j.min_experience_years}y</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => startEditJob(j)} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                          ✏️
                        </button>
                        <button onClick={() => deleteJob(j.id)} className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors" title="Delete">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {jobs.filter(j => j.custom).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic">No custom jobs created yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Leaderboard ── */}
        <div className="saas-card animate-fade-up delay-200 shadow-sm">
          {/* Table header bar */}
          <div className="flex items-center justify-between flex-wrap gap-3 px-6 py-4 border-b border-slate-200">
            <h2 className="text-slate-900 font-bold text-sm flex items-center gap-2"><span>🏆</span> Candidate Leaderboard</h2>
            <div className="flex items-center gap-2.5 flex-wrap">
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
                  .then(d => { loadCandidates(); alert('Candidate added!') })
              }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all bg-emerald-500 hover:bg-emerald-600 shadow-sm shadow-emerald-200">
                + Add Candidate
              </button>
              <select className="input-field text-xs py-1.5 px-3" style={{ width: 'auto' }} value={filterJob} onChange={e => setFilterJob(e.target.value)}>
                <option value="">All Roles</option>
                {jobs.map(j => <option key={j.id} value={j.id}>{j.custom ? '✨ ' : ''}{j.title}</option>)}
              </select>
              <select className="input-field text-xs py-1.5 px-3" style={{ width: 'auto' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="fit_score">Sort: Fit Score</option>
                <option value="analyzed_at">Sort: Recent</option>
              </select>
              <button onClick={loadCandidates}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-all bg-white shadow-sm">
                ↻ Refresh
              </button>
              <button onClick={clearBoard}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:bg-red-50"
                style={{ color: '#ef4444', borderColor: '#fca5a5', background: '#fef2f2' }}>
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
                      <tr key={c._id || idx} className={`animate-fade-up row-float`} style={{ animationDelay: `${0.1 * idx}s` }}>
                        <td>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                            style={{
                              background: rank <= 3 ? rankColors[rank - 1] : '#f1f5f9',
                              color: rankTextColor,
                            }}>
                            {rank}
                          </div>
                        </td>
                        <td><MiniScoreRing score={c.fit_score || 0} /></td>
                        <td>
                          <div className="font-semibold text-slate-900 text-sm">{c.candidate_name || 'Unknown'}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {c.github_username ? `🐙 @${c.github_username}` : ''}
                            {c.github_username && c.portfolio_url ? ' · ' : ''}
                            {c.portfolio_url ? '🌐 Portfolio' : ''}
                          </div>
                        </td>
                        <td className="text-slate-400 text-xs">{c.job_title || c.job_id || '—'}</td>
                        <td>
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                            style={{ background: recBg(c.recommendation), color: recColor(c.recommendation) }}>
                            {c.recommendation || '-'}
                          </span>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {(c.skills || []).slice(0, 3).map((s, i) => (
                              <span key={i} className="badge badge-default text-xs">{s}</span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div className="flex gap-1.5">
                            <button onClick={() => setSelected(c)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all bg-white shadow-sm">
                              👁 View
                            </button>
                            <button onClick={() => deleteCandidate(c._id)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all hover:bg-red-50"
                              style={{ color: '#ef4444', borderColor: '#fca5a5', background: '#fef2f2' }}>
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
