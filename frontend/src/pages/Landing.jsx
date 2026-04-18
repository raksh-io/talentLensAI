import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { BackgroundPaths } from '@/components/ui/background-paths'
import { motion } from 'framer-motion'

/* Background removed for SaaS aesthetic */

export default function Landing() {
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

  const loggedIn = !!user
  const existingUser = user

  const features = [
    { icon: '🧠', title: 'Skill Intelligence', desc: 'Deep NLP-powered extraction from resumes, GitHub, and portfolios.' },
    { icon: '⚡', title: '100% Offline', desc: 'No cloud dependency. Runs entirely on your machine. No API keys.' },
    { icon: '🎯', title: 'Precision Matching', desc: 'Score candidates against job profiles with full gap analysis.' },
    { icon: '📊', title: 'Ranked Leaderboard', desc: 'Recruiters see ranked candidates with real-time fit scores.' },
  ]

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Background blobs (enhanced) */}
      <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] rounded-full opacity-40 pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, #f5f3ff 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-40 pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, #e0f2fe 0%, transparent 70%)' }} />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto border-b border-transparent">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-sm text-white"
            style={{ background: '#2563eb' }}>🔍</div>
          <span className="font-bold text-slate-900 text-lg tracking-tight">TalentLens AI</span>
        </div>
        <div className="flex items-center gap-3">
          {loggedIn ? (
            <>
              <span className="text-sm text-slate-600">Hi, {existingUser?.name?.split(' ')[0] || existingUser?.email?.split('@')[0]}</span>
              <button
                onClick={() => navigate(existingUser.role === 'recruiter' ? '/recruiter' : '/candidate')}
                className="px-4 py-2 text-sm font-semibold rounded-lg text-white transition-all hover:bg-blue-700 shadow-sm"
                style={{ background: '#2563eb' }}>
                Go to Dashboard →
              </button>
            </>
          ) : (
            <Link to="/signin"
              className="px-4 py-2 text-sm font-semibold rounded-lg text-white transition-all bg-blue-600 hover:bg-blue-700 shadow-sm">
              Sign In
            </Link>
          )}
        </div>
      </nav>

      {/* Hero with BackgroundPaths */}
      <section className="relative z-10 pt-10 pb-16">
        <BackgroundPaths 
          title="TalentLensAI" 
          tagline="We don't match resumes — we match skills."
          onStarted={() => navigate('/signin')} 
        />
      </section>

      {/* Stats strip */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 mb-20">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Skills Detected', value: '200+', color: '#3b82f6' },
            { label: 'Fit Score Accuracy', value: '95%', color: '#2563eb' },
            { label: 'Avg Analysis Time', value: '<3s', color: '#10b981' },
          ].map((s, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="saas-card p-6 text-center"
            >
              <div className="text-3xl font-black mb-1" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-slate-500 font-medium">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-3">Why TalentLens AI?</h2>
        <p className="text-slate-600 text-center mb-12 text-sm">Built for speed, precision, and total privacy.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="saas-card p-6 group transition-all hover:-translate-y-1 hover:shadow-md border border-slate-200 bg-white"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-slate-900 font-bold text-sm mb-2">{f.title}</h3>
              <p className="text-slate-600 text-xs leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="saas-card p-12 bg-white/40 border-white/50 shadow-xl overflow-hidden">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-black text-slate-900 mb-6 leading-tight">Match Skills, Not Keywords</h2>
              <p className="text-slate-600 mb-8 leading-relaxed">
                TalentLens AI uses advanced NLP to understand the <span className="text-blue-600 font-bold">nuance</span> of projects and technical experience.
                We scan through GitHub commits, project descriptions, and resumes to build a unified skill profile.
              </p>
              <div className="space-y-4">
                {[
                  { t: 'Extract', d: 'Automatically identifies skills from unstructured text.' },
                  { t: 'Verify', d: 'Cross-references data with GitHub and live portfolios.' },
                  { t: 'Score', d: 'Generates a Weighted Fit Score for specific job roles.' }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">{i+1}</div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{item.t}</h4>
                      <p className="text-slate-500 text-xs">{item.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6 }}
                className="saas-card p-8 bg-white shadow-2xl"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl">👤</div>
                  <div>
                    <div className="h-4 w-32 bg-slate-100 rounded-full mb-2"></div>
                    <div className="h-3 w-24 bg-slate-50 rounded-full"></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-2 w-full bg-emerald-50 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[85%]"></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="h-6 bg-blue-50 rounded-md"></div>
                    <div className="h-6 bg-blue-50 rounded-md"></div>
                    <div className="h-6 bg-blue-50 rounded-md"></div>
                  </div>
                </div>
              </motion.div>
              {/* Floating element */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="absolute -bottom-6 -right-6 saas-card p-4 bg-white shadow-lg animate-float"
              >
                <span className="text-emerald-500 font-bold">Strong Fit ✨</span>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA footer band */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        <div className="rounded-2xl p-10 text-center relative overflow-hidden bg-slate-900 text-white shadow-2xl">
          <h2 className="text-3xl font-black mb-4">Ready to find your perfect match?</h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">Join the smarter way to hire and get hired. Enterprise-grade intelligence, running locally.</p>
          <button
            onClick={() => navigate('/signin')}
            className="px-8 py-4 rounded-xl text-white font-bold text-sm transition-all hover:bg-blue-700 bg-blue-600 shadow-lg shadow-blue-500/20 btn-glint">
            Get Started Free →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 text-slate-500 text-xs border-t border-slate-200">
        © 2025 TalentLens AI · We don't match resumes — we match skills.
      </footer>
    </div>
  )
}
