import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function SignIn() {
  const navigate = useNavigate()
  const location = useLocation()
  const initialRole = location.state?.role || 'candidate'

  const [selectedRole, setSelectedRole] = useState(initialRole)
  const [authMode, setAuthMode] = useState('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [step, setStep] = useState(location.state?.role ? 1 : 0) // Step 0 = role selection, Step 1 = auth form

  // If already logged in, redirect
  useEffect(() => {
    const stored = localStorage.getItem('tl_user')
    if (stored) {
      try {
        const u = JSON.parse(stored)
        navigate(u.role === 'recruiter' ? '/recruiter' : '/candidate', { replace: true })
      } catch {}
    }
  }, [])

  function clearMessages() { setError(''); setSuccess('') }

  async function handleAuth(e) {
    e.preventDefault()
    clearMessages()

    if (!email || !email.includes('@')) { setError('Enter a valid email address.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (authMode === 'signup') {
      if (!name.trim()) { setError('Enter your full name.'); return }
      if (password !== confirm) { setError('Passwords do not match.'); return }
    }

    setLoading(true)
    await new Promise(r => setTimeout(r, 850))

    try {
      let user
      if (authMode === 'signup') {
        user = { name: name.trim(), email: email.trim(), role: selectedRole }
        localStorage.setItem('tl_user', JSON.stringify(user))
        setSuccess(`Account created! Welcome, ${name.split(' ')[0]} 🎉`)
        await new Promise(r => setTimeout(r, 800))
      } else {
        const stored = localStorage.getItem('tl_user')
        const base = stored ? JSON.parse(stored) : { name: email.split('@')[0], email: email.trim() }
        user = { ...base, role: selectedRole }
        localStorage.setItem('tl_user', JSON.stringify(user))
        setSuccess('Welcome back! Redirecting…')
        await new Promise(r => setTimeout(r, 600))
      }
      navigate(selectedRole === 'recruiter' ? '/recruiter' : '/candidate', { replace: true })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isRecruiter = selectedRole === 'recruiter'
  const accentGrad = '#2563eb'
  const accentColor = '#2563eb'
  const accentBorder = 'rgba(37, 99, 235, 0.1)'
  const glowColor = 'rgba(37, 99, 235, 0.05)'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background blobs (subtle for light mode) */}
      <div className="fixed top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-30 pointer-events-none"
        style={{ background: `radial-gradient(circle, #dbeafe 0%, transparent 70%)`, transition: 'all 0.5s' }} />
      <div className="fixed bottom-[-15%] right-[-10%] w-[400px] h-[400px] rounded-full opacity-30 pointer-events-none"
        style={{ background: `radial-gradient(circle, #e0e7ff 0%, transparent 70%)`, transition: 'all 0.5s' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-up">
          <div className="inline-flex w-12 h-12 rounded-2xl items-center justify-center text-2xl mb-3 text-white shadow-sm"
            style={{ background: accentGrad, transition: 'all 0.5s' }}>
            🔍
          </div>
          <h1 className="text-xl font-bold text-slate-900">TalentLens AI</h1>
          <p className="text-slate-500 text-xs mt-1">We don't match resumes — we match skills.</p>
        </div>

        {/* Step 0 — Role Selection */}
        {step === 0 && (
          <div className="animate-fade-up">
            <div className="saas-card p-8 shadow-sm">
              <h2 className="text-slate-900 font-bold text-xl mb-1 text-center">Who are you?</h2>
              <p className="text-slate-500 text-sm text-center mb-6">Pick your role for a tailored experience.</p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { role: 'candidate', icon: '👤', title: 'Candidate', desc: 'Submit resume, get AI fit score' },
                  { role: 'recruiter', icon: '🏢', title: 'Recruiter', desc: 'Manage jobs, rank candidates' },
                ].map(r => (
                  <button key={r.role}
                    onClick={() => setSelectedRole(r.role)}
                    className="relative p-4 rounded-xl text-left transition-all border"
                    style={{
                      background: selectedRole === r.role ? '#eff6ff' : '#ffffff',
                      borderColor: selectedRole === r.role ? '#2563eb' : '#e2e8f0',
                    }}>
                    {selectedRole === r.role && (
                      <span className="absolute top-2 right-2 text-xs font-bold text-blue-600">✓</span>
                    )}
                    <div className="text-2xl mb-2">{r.icon}</div>
                    <div className="text-slate-900 font-semibold text-sm">{r.title}</div>
                    <div className="text-slate-600 text-xs mt-0.5">{r.desc}</div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep(1)}
                className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 hover:scale-[1.01] shadow-md shadow-blue-500/20"
                style={{ background: accentGrad, transition: 'all 0.4s' }}>
                Continue as {selectedRole === 'recruiter' ? 'Recruiter' : 'Candidate'} →
              </button>
            </div>

            <p className="text-center text-slate-600 text-xs mt-4">
              Already have an account?{' '}
              <button className="underline hover:text-slate-400 transition-colors" onClick={() => setStep(1)}>
                Sign in
              </button>
            </p>
          </div>
        )}

        {/* Step 1 — Auth Form */}
        {step === 1 && (
          <div className="animate-fade-up">
            <button
              onClick={() => { setStep(0); clearMessages() }}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-5 transition-colors">
              ← Back
            </button>

            <div className="saas-card overflow-hidden shadow-sm border border-slate-200">
              {/* Role indicator top bar */}
              <div className="h-1 w-full" style={{ background: accentGrad, transition: 'all 0.4s' }} />

              <div className="p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-blue-50">
                    {isRecruiter ? '🏢' : '👤'}
                  </div>
                  <div>
                    <h2 className="text-slate-900 font-bold text-base leading-tight">
                      {isRecruiter ? 'Welcome, Recruiter' : 'Welcome, Candidate'}
                    </h2>
                    <p className="text-slate-500 text-xs">
                      {authMode === 'signup' ? 'Create your account' : 'Sign in to continue'}
                    </p>
                  </div>
                </div>

                {/* Mode toggle */}
                <div className="flex rounded-lg p-1 mb-5 bg-slate-100 border border-slate-200">
                  {['signin', 'signup'].map(m => (
                    <button key={m}
                      onClick={() => { setAuthMode(m); clearMessages() }}
                      className="flex-1 py-1.5 rounded-md text-sm font-semibold transition-all"
                      style={{
                        background: authMode === m ? accentGrad : 'transparent',
                        color: authMode === m ? '#fff' : '#64748b',
                        boxShadow: authMode === m ? `0 2px 4px rgba(0,0,0,0.1)` : 'none',
                        transition: 'all 0.3s',
                      }}>
                      {m === 'signin' ? 'Sign In' : 'Sign Up'}
                    </button>
                  ))}
                </div>

                {/* Messages */}
                {error && (
                  <div className="mb-4 px-4 py-3 rounded-lg text-sm animate-fade-in"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
                    ⚠ {error}
                  </div>
                )}
                {success && (
                  <div className="mb-4 px-4 py-3 rounded-lg text-sm animate-fade-in"
                    style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#6ee7b7' }}>
                    ✓ {success}
                  </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                  {authMode === 'signup' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                      <input className="input-field" type="text" value={name} onChange={e => setName(e.target.value)}
                        autoComplete="off" spellCheck="false" />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                    <input className="input-field" type="email" value={email} onChange={e => setEmail(e.target.value)}
                      autoComplete="off" spellCheck="false" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Password</label>
                    <div className="relative">
                      <input className="input-field pr-10" type={showPw ? 'text' : 'password'}
                        value={password} onChange={e => setPassword(e.target.value)}
                        autoComplete="off" spellCheck="false" />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors text-sm">
                        {showPw ? '🙈' : '👁'}
                      </button>
                    </div>
                  </div>

                  {authMode === 'signup' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Confirm Password</label>
                      <input className="input-field" type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                        autoComplete="off" spellCheck="false" />
                    </div>
                  )}

                  <button type="submit" disabled={loading}
                    className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 shadow-md shadow-blue-500/20"
                    style={{ background: '#2563eb', marginTop: '1.5rem', transition: 'all 0.3s' }}>
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin-slow" />
                        {authMode === 'signup' ? 'Creating account…' : 'Signing in…'}
                      </>
                    ) : (
                      authMode === 'signup' ? 'Create Account' : 'Sign In'
                    )}
                  </button>
                </form>
              </div>
            </div>

            <p className="text-center text-slate-600 text-xs mt-4">
              Demo mode — any credentials work.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
