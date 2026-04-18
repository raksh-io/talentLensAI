import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, User, Building2, Check, Chrome } from "lucide-react";
import authBg from '@/assets/candidate_bg.png'
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from '../lib/supabaseClient'

// Helper function to merge class names
const cn = (...classes) => {
  return classes.filter(Boolean).join(" ");
};

// Custom Button Component
const Button = ({ 
  children, 
  variant = "default", 
  className = "", 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  
  const variantStyles = {
    default: "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20",
    outline: "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 shadow-sm"
  };
  
  return (
    <button
      className={cn(baseStyles, variantStyles[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
};

// Custom Input Component
const Input = ({ className = "", ...props }) => {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm text-slate-900 ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
};

const DotMap = () => {
  const canvasRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const routes = [
    { start: { x: 100, y: 150, delay: 0 }, end: { x: 200, y: 80, delay: 2 }, color: "#2563eb" },
    { start: { x: 200, y: 80, delay: 2 }, end: { x: 260, y: 120, delay: 4 }, color: "#2563eb" },
    { start: { x: 50, y: 50, delay: 1 }, end: { x: 150, y: 180, delay: 3 }, color: "#2563eb" },
    { start: { x: 280, y: 60, delay: 0.5 }, end: { x: 180, y: 180, delay: 2.5 }, color: "#2563eb" },
  ];

  const generateDots = (width, height) => {
    const dots = [];
    const gap = 12;
    const dotRadius = 1;

    for (let x = 0; x < width; x += gap) {
      for (let y = 0; y < height; y += gap) {
        const isInMapShape =
          ((x < width * 0.25 && x > width * 0.05) && (y < height * 0.4 && y > height * 0.1)) ||
          ((x < width * 0.25 && x > width * 0.15) && (y < height * 0.8 && y > height * 0.4)) ||
          ((x < width * 0.45 && x > width * 0.3) && (y < height * 0.35 && y > height * 0.15)) ||
          ((x < width * 0.5 && x > width * 0.35) && (y < height * 0.65 && y > height * 0.35)) ||
          ((x < width * 0.7 && x > width * 0.45) && (y < height * 0.5 && y > height * 0.1)) ||
          ((x < width * 0.8 && x > width * 0.65) && (y < height * 0.8 && y > height * 0.6));

        if (isInMapShape && Math.random() > 0.3) {
          dots.push({ x, y, radius: dotRadius, opacity: Math.random() * 0.5 + 0.2 });
        }
      }
    }
    return dots;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateDimensions = () => {
      const parent = canvas.parentElement;
      if (parent) {
        setDimensions({ width: parent.clientWidth, height: parent.clientHeight });
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!dimensions.width || !dimensions.height) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dots = generateDots(dimensions.width, dimensions.height);
    let animationFrameId;
    let startTime = Date.now();

    function animate() {
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      dots.forEach(dot => {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(37, 99, 235, ${dot.opacity})`;
        ctx.fill();
      });

      const currentTime = (Date.now() - startTime) / 1000;
      routes.forEach(route => {
        const elapsed = currentTime - route.start.delay;
        if (elapsed <= 0) return;
        const duration = 3;
        const progress = Math.min(elapsed / duration, 1);
        const x = route.start.x + (route.end.x - route.start.x) * progress;
        const y = route.start.y + (route.end.y - route.start.y) * progress;
        
        ctx.beginPath();
        ctx.moveTo(route.start.x, route.start.y);
        ctx.lineTo(x, y);
        ctx.strokeStyle = route.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#3b82f6";
        ctx.fill();
      });

      if (currentTime > 15) startTime = Date.now();
      animationFrameId = requestAnimationFrame(animate);
    }
    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [dimensions]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-40" />;
};

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
  const [step, setStep] = useState(location.state?.role ? 1 : 0)
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const role = session.user.user_metadata?.role
        navigate(role === 'recruiter' ? '/recruiter' : '/candidate', { replace: true })
      }
    })
  }, [])

  function clearMessages() { setError(''); setSuccess('') }

  async function handleAuth(e) {
    if (e) e.preventDefault()
    clearMessages()

    if (!email || !email.includes('@')) { setError('Enter a valid email address.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (authMode === 'signup') {
      if (!name.trim()) { setError('Enter your full name.'); return }
      if (password !== confirm) { setError('Passwords do not match.'); return }
    }

    setLoading(true)

    try {
      if (authMode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: name.trim(),
              role: selectedRole
            }
          }
        })
        if (signUpError) throw signUpError
        setSuccess('Account created! Please check your email for a verification link.')
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        })
        
        if (signInError) {
          if (signInError.message === 'Email not confirmed') {
            setError('Please confirm your email first. Check your inbox (and spam folder) for the verification link, or disable email confirmation in the Supabase Dashboard.')
            return
          }
          throw signInError
        }
        
        const role = data.user.user_metadata?.role || selectedRole
        setSuccess('Welcome back! Redirecting…')
        await new Promise(r => setTimeout(r, 600))
        navigate(role === 'recruiter' ? '/recruiter' : '/candidate', { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 md:p-8 overflow-hidden bg-transparent">
      {/* Premium Background Image */}
      <div className="fixed inset-0 -z-30 pointer-events-none overflow-hidden bg-white">
        <img 
          src={authBg} 
          className="w-full h-full object-cover opacity-80" 
          alt="Background" 
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/20 via-transparent to-white/40" />
        <div className="absolute inset-0 backdrop-blur-[2px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-5xl h-full min-h-[640px] overflow-hidden rounded-[2rem] flex glass-premium relative z-10"
      >
        {/* Left side - Map & Branding */}
        <div className="hidden lg:block w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700">
          <DotMap />
          <div className="absolute inset-0 flex flex-col items-center justify-center p-12 z-10 text-white text-center">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center mb-8 shadow-2xl"
            >
              <div className="text-4xl text-white">🔍</div>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-4xl font-bold mb-4 tracking-tight"
            >
              TalentLens AI
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-blue-100 text-lg font-medium max-w-xs leading-relaxed"
            >
              We don't match resumes — <br />
              <span className="text-white font-bold italic">we match skills.</span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="absolute bottom-12 left-0 right-0"
            >
              <p className="text-blue-200/60 text-xs font-semibold uppercase tracking-[0.2em]">Next Gen Talent Intelligence</p>
            </motion.div>
          </div>
          
          {/* Decorative gradients */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/20 blur-3xl rounded-full -translate-x-1/2 translate-y-1/2" />
        </div>

        {/* Right side - Form */}
        <div className="w-full lg:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center relative bg-transparent">
          <AnimatePresence mode="wait">
            {step === 0 ? (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full"
              >
                <div className="mb-10 text-center lg:text-left">
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">Who are you?</h1>
                  <p className="text-slate-500 text-sm">Pick your role for a tailored experience.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  {[
                    { role: 'candidate', icon: <User className="w-6 h-6" />, title: 'Candidate', desc: 'Find your perfect role' },
                    { role: 'recruiter', icon: <Building2 className="w-6 h-6" />, title: 'Recruiter', desc: 'Find top talent' },
                  ].map(r => (
                    <button key={r.role}
                      onClick={() => setSelectedRole(r.role)}
                      className={cn(
                        "group relative p-6 rounded-2xl text-left transition-all border-2",
                        selectedRole === r.role 
                          ? "bg-blue-50 border-blue-500 shadow-lg shadow-blue-500/10" 
                          : "bg-white border-slate-100 hover:border-slate-200"
                      )}>
                      {selectedRole === r.role && (
                        <div className="absolute top-4 right-4 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white stroke-[4px]" />
                        </div>
                      )}
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors",
                        selectedRole === r.role ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                      )}>
                        {r.icon}
                      </div>
                      <div className="text-slate-900 font-bold text-base mb-1">{r.title}</div>
                      <div className="text-slate-500 text-xs font-medium leading-relaxed">{r.desc}</div>
                    </button>
                  ))}
                </div>

                <Button
                  onClick={() => setStep(1)}
                  className="w-full h-14 text-base"
                >
                  Continue as {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>

                <div className="mt-8 text-center sm:text-left">
                  <p className="text-slate-500 text-sm font-medium">
                    Already have an account?{' '}
                    <button onClick={() => setStep(1)} className="text-blue-600 font-bold hover:underline">
                      Sign In
                    </button>
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full"
              >
                <div className="mb-8 relative">
                   <button
                    onClick={() => { setStep(0); clearMessages() }}
                    className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 text-sm font-bold transition-colors mb-6"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                    Change Role
                  </button>
                  <h1 className="text-3xl font-black text-slate-900 mb-1">
                    {authMode === 'signin' ? 'Welcome Back' : 'Join TalentLens'}
                  </h1>
                  <p className="text-slate-500 text-sm font-medium">
                    {selectedRole === 'recruiter' ? 'Recruiter' : 'Candidate'} Account
                  </p>
                </div>

                {/* Mode Toggle */}
                <div className="flex p-1 bg-slate-100 rounded-xl mb-8 border border-slate-200/50">
                  <button onClick={() => { setAuthMode('signin'); clearMessages() }}
                    className={cn(
                      "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                      authMode === 'signin' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}>
                    Sign In
                  </button>
                  <button onClick={() => { setAuthMode('signup'); clearMessages() }}
                    className={cn(
                      "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                      authMode === 'signup' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}>
                    Sign Up
                  </button>
                </div>

                 {/* Social Login */}
                {authMode === 'signin' && (
                  <div className="mb-6">
                    <button 
                      className="w-full flex items-center justify-center gap-3 h-12 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-semibold text-slate-700 text-sm shadow-sm"
                      onClick={() => console.log("Google login")}
                    >
                      <Chrome className="w-5 h-5 text-blue-500" />
                      Continue with Google
                    </button>
                    <div className="relative my-8">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                      <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold"><span className="px-3 bg-white text-slate-400">or use email</span></div>
                    </div>
                  </div>
                )}

                {/* Messages */}
                {error && (
                   <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="mb-4 p-4 rounded-xl text-sm bg-red-50 border border-red-100 text-red-600 font-medium flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" /> {error}
                  </motion.div>
                )}
                {success && (
                   <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="mb-4 p-4 rounded-xl text-sm bg-emerald-50 border border-emerald-100 text-emerald-600 font-medium flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" /> {success}
                  </motion.div>
                )}

                <form className="space-y-4" onSubmit={handleAuth}>
                  {authMode === 'signup' && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 pl-1">Full Name</label>
                      <Input placeholder="Raksh Jog" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                  )}
                  
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 pl-1">Email Address</label>
                    <Input type="email" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 pl-1">Password</label>
                    <div className="relative">
                      <Input type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {authMode === 'signup' && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 pl-1">Confirm Password</label>
                      <Input type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} required />
                    </div>
                  )}

                  <motion.div 
                    onMouseEnter={() => setIsHovered(true)} 
                    onMouseLeave={() => setIsHovered(false)}
                    className="pt-4"
                  >
                    <Button disabled={loading} type="submit" className="w-full h-14 text-base relative overflow-hidden group">
                      <span className="flex items-center justify-center relative z-10 font-bold tracking-tight">
                        {loading ? (
                          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </span>
                       {isHovered && !loading && (
                        <motion.div
                          layoutId="shimmer"
                          initial={{ x: '-100%' }}
                          animate={{ x: '100%' }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                        />
                      )}
                    </Button>
                  </motion.div>
                </form>

                <div className="mt-8 text-center">
                  <button className="text-slate-400 hover:text-blue-600 text-xs font-bold transition-colors">
                    Forgot your password?
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      <div className="fixed bottom-4 text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">TalentLens AI © 2026</div>
    </div>
  )
}
