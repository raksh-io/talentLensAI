import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { BackgroundPaths } from '@/components/ui/background-paths'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { 
  Users, 
  Zap, 
  Target, 
  BarChart3, 
  ChevronRight, 
  ShieldCheck, 
  Cpu, 
  ArrowRight,
  Globe,
  Sparkles
} from 'lucide-react'

// Custom Cursor Follower
function CursorFollower() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)

  useEffect(() => {
    const handleMove = (e) => setMousePos({ x: e.clientX, y: e.clientY })
    const handleOver = (e) => {
      if (['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) || e.target.closest('button') || e.target.closest('a')) {
        setIsHovering(true)
      } else {
        setIsHovering(false)
      }
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseover', handleOver)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseover', handleOver)
    }
  }, [])

  return (
    <>
      <div 
        className="cursor-follower"
        style={{ 
          left: mousePos.x, 
          top: mousePos.y,
          width: isHovering ? '60px' : '40px',
          height: isHovering ? '60px' : '40px',
          background: isHovering ? 'rgba(37, 99, 235, 0.25)' : 'rgba(37, 99, 235, 0.15)'
        }}
      />
      <div 
        className="cursor-point"
        style={{ left: mousePos.x, top: mousePos.y }}
      />
    </>
  )
}

function FeatureCard({ icon: Icon, title, desc, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -8, scale: 1.01 }}
      className="saas-card p-10 bg-white group cursor-none relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
      <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-8 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-sm border border-blue-100 group-hover:shadow-blue-500/20 group-hover:shadow-lg">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-slate-900 font-black text-2xl mb-4 tracking-tight leading-none">{title}</h3>
      <p className="text-slate-500 text-base leading-relaxed font-medium">{desc}</p>
    </motion.div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 })
  
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
    { icon: Users, title: 'Skill Intelligence', desc: 'Go beyond keywords. Deep NLP analysis extracts true competency from resumes and portfolios.' },
    { icon: ShieldCheck, title: '100% Privacy', desc: 'Enterprise-grade intelligence that runs entirely in your environment. No data ever leaves your control.' },
    { icon: Target, title: 'Precision Matching', desc: 'Automated gap analysis cross-references candidates against complex job roles with 95% accuracy.' },
    { icon: BarChart3, title: 'Visual Insights', desc: 'Beautiful, ranked leaderboards and individual profile deep-dives powered by neural analysis.' },
  ]


  return (
    <div className="relative min-h-screen bg-slate-50 cursor-none">
      <CursorFollower />

      {/* Progress Bar */}
      <motion.div className="fixed top-0 left-0 right-0 h-1 bg-blue-600 z-[100] origin-left" style={{ scaleX }} />

      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] rounded-full opacity-30 pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, #dbeafe 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-30 pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, #e0f2fe 0%, transparent 70%)' }} />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="font-black text-slate-900 text-xl tracking-tight">TalentLens AI</span>
          </div>
          
          <div className="flex items-center gap-6">
            {loggedIn ? (
              <div className="flex items-center gap-4">
                <span className="hidden sm:inline text-sm font-bold text-slate-500">Welcome, {user?.name?.split(' ')[0]}</span>
                <button
                  onClick={() => navigate(user.role === 'recruiter' ? '/recruiter' : '/candidate')}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                >
                  Dashboard →
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/signin" className="text-sm font-black text-slate-600 hover:text-blue-600 transition-colors px-4 py-2 uppercase tracking-widest">
                  Login
                </Link>
                <Link to="/signin" className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
                  Join Now
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero with BackgroundPaths */}
      <section className="relative z-10 pt-20">
        <BackgroundPaths 
          title="Talent Intelligence Redefined" 
          tagline="We don't match resumes — we match true human potential with neural precision."
          onStarted={() => navigate('/signin')} 
        />
      </section>

      {/* Trusted By Marquee (Premium Addition) */}
      <section className="relative z-10 py-10 overflow-hidden border-y border-slate-100 bg-white/30 backdrop-blur-md mt-[-20px]">
        <div className="max-w-7xl mx-auto px-6 overflow-hidden">
          <p className="text-center text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-8">Powering the next generation of hiring at</p>
          <div className="flex gap-16 md:gap-24 items-center justify-center opacity-30 grayscale hover:opacity-60 hover:grayscale-0 transition-all duration-700">
             {['TECHFLOW', 'NEURALIS', 'DATAVEX', 'QUANTUM', 'SYNERGY', 'APEX'].map(name => (
               <span key={name} className="text-2xl font-black tracking-tighter text-slate-900">{name}</span>
             ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="flex flex-col items-center mb-16">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] border border-blue-100 mb-6"
          >
            Why Choose Us
          </motion.div>
          <h2 className="text-5xl font-black text-slate-900 text-center tracking-tight mb-4">Precision-First Hiring</h2>
          <p className="text-slate-500 text-lg font-medium text-center max-w-2xl">Building the future of recruitment with privacy-focused, neural skill mapping.</p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <FeatureCard key={i} icon={f.icon} title={f.title} desc={f.desc} delay={i * 0.1} />
          ))}
        </div>
      </section>

      {/* Impact Stats */}
      <section className="relative z-10 py-24 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { val: '200+', label: 'Unique Skills Detected', sub: 'Extracted via advanced NLP' },
              { val: '95%', label: 'Alignment Accuracy', sub: 'Verified by neural scoring' },
              { val: '<3s', label: 'Processing Time', sub: 'Entirely offline & encrypted' },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-6xl font-black text-blue-600 mb-2 tracking-tighter">{s.val}</div>
                <div className="text-slate-900 font-black text-lg mb-1">{s.label}</div>
                <div className="text-slate-400 text-sm font-medium">{s.sub}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Visual Tech Showcase */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-32">
        <div className="bg-slate-900 rounded-[3rem] p-12 md:p-20 overflow-hidden relative shadow-2xl">
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
            <Cpu className="w-full h-full text-blue-400" />
          </div>
          <div className="grid md:grid-cols-2 gap-16 items-center relative z-10">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-8 border border-blue-400/20">
                <Globe className="w-6 h-6" />
              </div>
              <h2 className="text-5xl font-black text-white mb-8 tracking-tight leading-tight">Match Skills, <br/><span className="text-blue-500">Not Keywords.</span></h2>
              <p className="text-slate-400 text-xl font-medium leading-relaxed mb-10">
                TalentLens AI understands the nuance of technical experience by cross-referencing code commits, 
                portfolios, and project history into a unified profile.
              </p>
              <div className="space-y-6">
                {[
                  { t: 'Extract Intelligence', d: 'Identifies core competencies from raw text.' },
                  { t: 'Multi-Source Verify', d: 'Authenticates skills with live evidence.' }
                ].map((item, i) => (
                  <div key={i} className="flex gap-5">
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 font-black text-sm">0{i+1}</div>
                    <div>
                      <h4 className="font-black text-white text-lg">{item.t}</h4>
                      <p className="text-slate-500 font-medium">{item.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/5 p-4 rounded-[2.5rem] border border-white/10 backdrop-blur-md shadow-2xl group/card overflow-hidden">
              <div className="bg-white rounded-[2rem] p-10 shadow-2xl relative overflow-hidden">
                {/* Simulated AI Scan Line */}
                <motion.div 
                  animate={{ top: ['-10%', '110%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-20 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent pointer-events-none z-10"
                />
                
                <div className="flex items-center gap-6 mb-10 relative z-20">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-3xl font-black shadow-lg shadow-blue-500/20">JD</div>
                  <div className="space-y-2">
                    <div className="h-6 w-40 bg-slate-100 rounded-full"></div>
                    <div className="h-4 w-24 bg-slate-50 rounded-full"></div>
                  </div>
                </div>
                <div className="space-y-6 relative z-20">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">Neural Alignment Scan...</span>
                    <span className="text-3xl font-black text-blue-600">92.4%</span>
                  </div>
                  <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden p-1">
                    <motion.div 
                      initial={{ width: 0 }}
                      whileInView={{ width: '92.4%' }}
                      transition={{ duration: 2, ease: "circOut" }}
                      className="h-full bg-blue-600 rounded-full relative" 
                    >
                       <div className="absolute top-0 right-0 w-8 h-full bg-white/30 skew-x-12 animate-shimmer" />
                    </motion.div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <div className="px-5 py-2.5 rounded-xl bg-blue-50 border border-blue-100 text-[10px] font-black uppercase text-blue-600 flex items-center gap-2">
                       <Zap className="w-3 h-3" /> Neural Match
                    </div>
                    <div className="px-5 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase text-slate-400">Verified</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating CTA Footer */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="bg-white rounded-[3rem] p-16 shadow-2xl border border-slate-100 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl opacity-50" />
          <h2 className="text-5xl font-black text-slate-900 mb-6 tracking-tight">Ready to find your match?</h2>
          <p className="text-slate-500 text-xl font-medium mb-12 max-w-2xl mx-auto italic">"The future of talent intelligence is local, private, and precise."</p>
          <button
            onClick={() => navigate('/signin')}
            className="px-10 py-5 rounded-2xl text-white font-black text-sm uppercase tracking-[0.2em] transition-all hover:bg-blue-700 bg-blue-600 shadow-xl shadow-blue-500/30 group btn-glint"
          >
            Get Started Free <ArrowRight className="inline-block ml-3 group-hover:translate-x-2 transition-transform" />
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
