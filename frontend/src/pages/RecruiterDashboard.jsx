import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import recruiterBg from '@/assets/candidate_bg.png'
import { 
  Users, 
  Briefcase, 
  Plus, 
  Search, 
  LogOut, 
  ChevronRight, 
  Filter, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Trophy,
  Shield,
  Zap,
  Clock,
  LayoutDashboard,
  Calendar,
  Star,
  User,
  ArrowRight,
  Target,
  Edit2,
  X,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'

// Helper function to merge class names
const cn = (...classes) => classes.filter(Boolean).join(" ");

/* ── Topnav ── */
function Navbar({ user, onLogout }) {
  return (
    <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200 px-6 py-3">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-slate-900 text-lg tracking-tight leading-none">TalentLens AI</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Enterprise Recruiter</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 px-4 py-1.5 bg-slate-100 rounded-full border border-slate-200">
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white uppercase">
              {(user?.name || user?.email || 'R')[0]}
            </div>
            <span className="text-slate-900 text-sm font-bold">{user?.name || user?.email?.split('@')[0]}</span>
          </div>
          <button 
            onClick={onLogout}
            className="p-2.5 rounded-xl bg-white text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-all shadow-sm"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </nav>
  )
}

/* ── Avatar Helper ── */
function UserAvatar({ name, size = "w-10 h-10", className = "" }) {
  const initials = (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className={cn(
      "rounded-2xl flex items-center justify-center font-black text-white shadow-lg",
      size,
      className
    )}
      style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
      {initials}
    </div>
  )
}

function MiniScoreRing({ score }) {
  const r = 16; const circ = 2 * Math.PI * r
  const color = score >= 80 ? '#2563eb' : score >= 60 ? '#3b82f6' : '#64748b'
  const [off, setOff] = useState(circ)
  useEffect(() => { setTimeout(() => setOff(circ - (score / 100) * circ), 300) }, [score])
  return (
    <div className="relative w-12 h-12">
      <svg viewBox="0 0 36 36" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="18" cy="18" r={r} fill="none" stroke="#f1f5f9" strokeWidth="3.5" />
        <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3.5"
          strokeLinecap="round"
          style={{ strokeDasharray: circ, strokeDashoffset: off, transition: 'stroke-dashoffset 0.8s ease 0.3s' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-black" style={{ color }}>{score}%</span>
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

  const scoreColor = score >= 80 ? '#2563eb' : score >= 60 ? '#3b82f6' : '#64748b'

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
      const res = await fetch(`/recruiter/candidates/${c.id}`, { method: 'PUT', body: fd })
      if (!res.ok) throw new Error('Update failed')
      const data = await res.json()
      onUpdate(data.candidate)
      setIsEditing(false)
    } catch (err) { alert('Failed to update candidate.') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 py-8 overflow-y-auto bg-slate-900/40 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl glass-premium rounded-[2rem] shadow-2xl animate-fade-up relative my-auto overflow-hidden">
        <div className="absolute top-6 right-6 flex gap-2 z-10">
          {!isEditing && (
            <button onClick={() => setIsEditing(true)}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-white text-slate-400 hover:text-blue-600 border border-slate-200 hover:border-blue-200 transition-all shadow-sm">
              <Edit2 className="w-5 h-5" />
            </button>
          )}
          <button onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-white text-slate-400 hover:text-red-500 border border-slate-200 transition-all shadow-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-10">
          {isEditing ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-black text-slate-900 mb-1">Edit Profile</h2>
                <p className="text-slate-500 text-sm font-medium">Update candidate evaluation details.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 pl-1">Full Name</label>
                  <input className="input-field py-3 text-base" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 pl-1">Target Role</label>
                  <input className="input-field py-3 text-base" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 pl-1">Fit Score</label>
                    <input className="input-field py-3 text-base" type="number" min="0" max="100" value={score} onChange={e => setScore(parseInt(e.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 pl-1">Recommendation</label>
                    <select className="input-field py-3 text-base appearance-none" value={rec} onChange={e => setRec(e.target.value)}>
                      <option value="Strong Hire">Strong Hire</option>
                      <option value="Consider">Consider</option>
                      <option value="Reject">Reject</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-6 border-t border-slate-100">
                <button onClick={handleSave} className="flex-1 h-14 bg-blue-600 text-white font-black rounded-2xl transition-all hover:bg-blue-700 shadow-lg shadow-blue-500/20">Save Changes</button>
                <button onClick={() => setIsEditing(false)} className="px-8 h-14 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-8 mb-10">
                <UserAvatar name={c.candidate_name} size="w-28 h-28" className="text-4xl shadow-xl ring-8 ring-blue-50" />
                <div>
                  <h2 className="text-5xl font-black text-slate-900 mb-2 leading-none tracking-tight">
                    {c.candidate_name || 'Candidate'}
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-black rounded-full border border-blue-100 uppercase tracking-widest">
                      <Target className="w-3 h-3" /> {c.job_title || c.job_id}
                    </span>
                    <span className="text-slate-400 text-sm font-bold flex items-center gap-1">
                      <Clock className="w-4 h-4" /> Ready for review
                    </span>
                  </div>
                </div>
              </div>

              {/* Assessment Card */}
              <div className="p-2 sm:p-6 bg-slate-50 border border-slate-200 rounded-[2rem] mb-8 flex items-center gap-6">
                <div className="w-24 h-24 flex-shrink-0 relative">
                  {(() => {
                    const r = 38; const circ = 2 * Math.PI * r
                    return (
                      <svg viewBox="0 0 84 84" className="w-full h-full -rotate-90">
                        <circle cx="42" cy="42" r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
                        <circle cx="42" cy="42" r={r} fill="none" stroke={scoreColor} strokeWidth="7"
                          strokeLinecap="round"
                          style={{ strokeDasharray: circ, strokeDashoffset: circ - (score / 100) * circ, transition: 'stroke-dashoffset 1s' }} />
                      </svg>
                    )
                  })()}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-900">{score}</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Fit%</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                     <span className={cn(
                        "badge text-[10px] uppercase font-black tracking-widest",
                        score >= 80 ? "bg-blue-100 text-blue-700 border-blue-200" : score >= 60 ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-500 border-slate-200"
                      )}>
                        {score >= 80 ? 'Exceptional Match' : score >= 60 ? 'Strong Potential' : 'Basic Fit'}
                      </span>
                  </div>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed">
                    This candidate demonstrates a <span className="text-slate-900 font-bold">{c.recommendation === 'Strong Hire' ? 'superior' : 'solid'} alignment</span> with the core requirements of the <span className="text-blue-600 font-bold">{c.job_title}</span> role.
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="p-5 glass-premium rounded-2xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-blue-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matched Skills</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.matched_skills?.slice(0, 6).map((s, i) => (
                      <span key={i} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-100">
                        {s}
                      </span>
                    )) || <span className="text-slate-300 italic text-xs">None</span>}
                  </div>
                </div>
                <div className="p-5 glass-premium rounded-2xl">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Growth Areas</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.missing_skills?.slice(0, 6).map((s, i) => (
                      <span key={i} className="px-2.5 py-1 bg-slate-50 text-slate-500 text-[10px] font-bold rounded-lg border border-slate-200">
                        {s}
                      </span>
                    )) || <span className="text-slate-300 italic text-xs">Standard fit</span>}
                  </div>
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

  async function logout() { 
    await supabase.auth.signOut()
    localStorage.removeItem('tl_user')
    navigate('/signin', { replace: true }) 
  }

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
    <div className="relative min-h-screen bg-transparent">
      {/* Premium Background Image */}
      <div className="fixed inset-0 -z-30 pointer-events-none overflow-hidden bg-white">
        <img 
          src={recruiterBg} 
          className="w-full h-full object-cover opacity-80" 
          alt="Background" 
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/20 via-transparent to-white/40" />
        <div className="absolute inset-0 backdrop-blur-[2px]" />
      </div>
      <Navbar user={user} onLogout={logout} />

      {selected && (
        <CandidateModal 
          candidate={selected} 
          onClose={() => setSelected(null)} 
          onUpdate={(newC) => {
            setCandidates(prev => prev.map(c => c.id === newC.id ? newC : c))
            setSelected(newC)
          }}
        />
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12 animate-fade-up">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tight leading-none">
              Talent Intelligence <span className="text-blue-600">Leaderboard</span>
            </h1>
            <p className="text-slate-500 text-lg font-medium leading-relaxed">
              Discover, evaluate, and rank top talent using AI-powered skill matching. 
              Transform your recruitment process from data to human insights.
            </p>
          </div>
          
          <div className="flex gap-4">
            {[
              { val: total, label: 'Candidates', icon: <Users className="w-5 h-5" />, color: 'blue' },
              { val: strongHire, label: 'Top Fits', icon: <Trophy className="w-5 h-5" />, color: 'emerald' },
              { val: avg !== null ? `${avg}%` : '—', label: 'Avg. Fit', icon: <Zap className="w-5 h-5" />, color: 'blue' },
            ].map((s, i) => (
              <div key={i} className="glass-premium px-6 py-5 rounded-[2rem] min-w-[140px] text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg bg-${s.color}-50 text-${s.color}-600 flex items-center justify-center`}>
                    {s.icon}
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
                </div>
                <div className="text-3xl font-black text-slate-900">{s.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Create Job Accordion ── */}
        <div className="glass-premium rounded-[2rem] mb-12 animate-fade-up delay-100 overflow-hidden">
          <button type="button"
            className="w-full flex items-center justify-between px-8 py-7 text-left transition-colors hover:bg-slate-50"
            onClick={() => {
              if (accordionOpen && editingJobId) cancelEdit()
              else setAccordionOpen(v => !v)
            }}>
            <div className="flex items-center gap-5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform ${accordionOpen ? 'scale-110' : ''}`}
                style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                {editingJobId ? <Edit2 className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
              </div>
              <div>
                <span className="text-slate-900 font-black text-2xl tracking-tight block leading-none mb-1">
                  {editingJobId ? `Edit: ${jTitle}` : 'Create New Posting'}
                </span>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-none">
                  {editingJobId ? 'Update role requirements' : 'Define your ideal candidate profile'}
                </span>
              </div>
            </div>
            <div className={`w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center transition-transform duration-300 ${accordionOpen ? 'rotate-180 bg-blue-50 text-blue-600' : 'text-slate-400'}`}>
              <ChevronRight className="w-5 h-5 rotate-90" />
            </div>
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
        <div className="glass-premium rounded-[2rem] mb-12 animate-fade-up delay-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-slate-900 font-black text-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
              Managed Roles
            </h2>
            <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-slate-200">
              {jobs.filter(j => j.custom).length} Active
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/30 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                  <th className="px-8 py-5">Position</th>
                  <th className="px-8 py-5">Key Skills</th>
                  <th className="px-8 py-5">Experience</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {jobs.filter(j => j.custom).map(j => (
                  <tr key={j.id} className="hover:bg-blue-50/30 transition-all group">
                    <td className="px-8 py-6 font-black text-slate-900 text-lg tracking-tight">{j.title}</td>
                    <td className="px-8 py-6">
                      <div className="flex flex-wrap gap-2">
                        {(j.required_skills || []).slice(0, 3).map((s, i) => (
                          <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-blue-100">{s}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-slate-500 font-bold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> {j.min_experience_years}y+
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEditJob(j)} className="p-2.5 rounded-xl bg-white text-slate-400 hover:text-blue-600 border border-slate-200 hover:border-blue-200 transition-all shadow-sm" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteJob(j.id)} className="p-2.5 rounded-xl bg-white text-slate-400 hover:text-red-500 border border-slate-200 hover:border-red-200 transition-all shadow-sm" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {jobs.filter(j => j.custom).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-16 text-center text-slate-400 italic">No custom roles defined. Create one above to begin analysis.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Leaderboard ── */}
        <div className="glass-premium rounded-[2rem] animate-fade-up delay-300 overflow-hidden">
          {/* Table header bar */}
          <div className="flex items-center justify-between flex-wrap gap-6 px-10 py-8 border-b border-slate-100 bg-white/40 backdrop-blur-md">
            <div>
              <h2 className="text-slate-900 font-black text-2xl tracking-tight leading-none mb-1">Ranked Prospects</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Global talent assessment pipeline</p>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner">
                <select className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-0 px-4 py-1.5 cursor-pointer" value={filterJob} onChange={e => setFilterJob(e.target.value)}>
                  <option value="">All Journeys</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.custom ? '✨ ' : ''}{j.title}</option>)}
                </select>
                <div className="w-px h-4 bg-slate-200" />
                <select className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-0 px-4 py-1.5 cursor-pointer" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="fit_score">By Potential</option>
                  <option value="analyzed_at">By Recency</option>
                </select>
              </div>

              <div className="h-10 w-px bg-slate-200 mx-2 hidden lg:block" />

              <button onClick={loadCandidates} className="p-3 bg-white text-slate-400 hover:text-blue-600 rounded-xl border border-slate-200 hover:border-blue-200 transition-all shadow-sm" title="Refresh">
                <Clock className="w-4 h-4" />
              </button>
              
              <button 
                onClick={clearBoard}
                className="p-3 bg-white text-slate-400 hover:text-red-500 rounded-xl border border-slate-200 hover:border-red-200 transition-all shadow-sm"
                title="Clear Board"
              >
                <Trash2 className="w-4 h-4" />
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
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                    <th className="px-10 py-5">Rank</th>
                    <th className="px-10 py-5">Potenital</th>
                    <th className="px-10 py-5">Candidate profile</th>
                    <th className="px-10 py-5">Target role</th>
                    <th className="px-10 py-5">Status</th>
                    <th className="px-10 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {candidates.map((c, idx) => {
                    const rank = idx + 1
                    return (
                      <tr key={c.id || idx} className="hover:bg-blue-50/20 transition-all group">
                        <td className="px-10 py-6">
                           <div className={cn(
                             "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs",
                             rank === 1 ? "bg-amber-100 text-amber-700" : rank === 2 ? "bg-slate-200 text-slate-600" : rank === 3 ? "bg-orange-100 text-orange-700" : "bg-slate-50 text-slate-400"
                           )}>
                             {rank}
                           </div>
                        </td>
                        <td className="px-10 py-6">
                          <MiniScoreRing score={c.fit_score || 0} />
                        </td>
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-4">
                            <UserAvatar name={c.candidate_name} size="w-12 h-12" />
                            <div>
                              <div className="font-black text-slate-900 text-lg tracking-tight leading-none mb-1">{c.candidate_name || 'Anonymous'}</div>
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {c.github_username && <span className="flex items-center gap-1"><Users className="w-3 h-3" /> @{c.github_username}</span>}
                                {c.portfolio_url && <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Portfolio</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <span className="flex items-center gap-1.5 text-blue-600 font-bold text-sm">
                            <Briefcase className="w-4 h-4" /> {c.job_title || c.job_id || '—'}
                          </span>
                        </td>
                        <td className="px-10 py-6">
                          <span className={cn(
                            "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                            c.recommendation === 'Strong Hire' ? "bg-blue-50 text-blue-700 border-blue-100" : c.recommendation === 'Reject' ? "bg-slate-50 text-slate-400 border-slate-200" : "bg-white text-slate-600 border-slate-200"
                          )}>
                            {c.recommendation === 'Strong Hire' ? 'Top Choice' : c.recommendation || 'Under Review'}
                          </span>
                        </td>
                        <td className="px-10 py-6 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => setSelected(c)}
                              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-shadow shadow-lg shadow-blue-500/20">
                              View Profile
                            </button>
                            <button onClick={() => deleteCandidate(c.id)}
                              className="p-2.5 rounded-xl bg-white text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 transition-all shadow-sm">
                              <Trash2 className="w-4 h-4" />
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
