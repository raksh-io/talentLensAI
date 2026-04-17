"use client"

import { useState, useEffect } from "react"
import { ShieldCheck, Briefcase, Code2, Globe } from "lucide-react"

export function ProfileCard({
  name = "Candidate Name",
  title = "Potential Candidate",
  avatarUrl = "https://i.ibb.co/Kc3MTRNm/caarton-character.png",
  backgroundUrl = "https://i.ibb.co/nHk8jc8/cloud-image.jpg",
  skillsCount = 0,
  yearsExp = 0,
  projectsCount = 0,
  fitScore = 0,
  githubUrl = "",
  portfolioUrl = "",
}) {
  const [expProgress, setExpProgress] = useState(0)
  const [animatedSkills, setAnimatedSkills] = useState(0)
  const [animatedYears, setAnimatedYears] = useState(0)
  const [animatedProjects, setAnimatedProjects] = useState(0)

  // Animate experience bar to fitScore
  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setExpProgress((prev) => {
          if (prev >= fitScore) {
            clearInterval(interval)
            return fitScore
          }
          return prev + 1
        })
      }, 20)
      return () => clearInterval(interval)
    }, 300)
    return () => clearTimeout(timer)
  }, [fitScore])

  // Animate counters
  useEffect(() => {
    const duration = 2000
    const steps = 60
    const stepDuration = duration / steps

    const skillsIncrement = skillsCount / steps
    const yearsIncrement = yearsExp / steps
    const projectsIncrement = projectsCount / steps

    let currentStep = 0

    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        currentStep++
        setAnimatedSkills(Math.min(Math.floor(skillsIncrement * currentStep), skillsCount))
        setAnimatedYears(Math.min(Math.floor(yearsIncrement * currentStep), yearsExp))
        setAnimatedProjects(Math.min(Math.floor(projectsIncrement * currentStep), projectsCount))

        if (currentStep >= steps) {
          clearInterval(interval)
        }
      }, stepDuration)
      return () => clearInterval(interval)
    }, 500)

    return () => clearTimeout(timer)
  }, [skillsCount, yearsExp, projectsCount])

  return (
    <div className="w-full max-w-sm mx-auto animate-fade-up">
      <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-100">
        {/* Header with background */}
        <div className="relative h-40 bg-gradient-to-br from-blue-500 to-indigo-600 overflow-hidden">
          <img
            src={backgroundUrl || "/placeholder.svg"}
            alt="Background"
            className="w-full h-full object-cover opacity-40 mix-blend-overlay"
          />

        </div>

        {/* Profile content */}
        <div className="px-6 pb-6 -mt-12">
          {/* Avatar */}
          <div className="relative w-24 h-24 mb-4">
            <div className="w-full h-full rounded-full border-4 border-white overflow-hidden bg-white shadow-xl">
              <img src={avatarUrl || "/placeholder.svg"} alt={name} className="w-full h-full object-cover" />
            </div>
            {fitScore >= 80 && (
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full shadow-lg border-2 border-white">
                <ShieldCheck className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* Progress bar (Fit Score) */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fit Match</span>
              <span className="text-[10px] font-black text-blue-600">{expProgress}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 transition-all duration-300 ease-out"
                style={{ width: `${expProgress}%` }}
              />
            </div>
          </div>

          {/* Name and title */}
          <h2 className="text-2xl font-black text-slate-900 mb-1 tracking-tight leading-none">{name}</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-6 font-medium">{title}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-6 py-4 border-t border-b border-slate-50">
            <div className="text-center">
              <div className="text-xl font-black text-slate-900 mb-0.5">{animatedSkills}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Skills</div>
            </div>
            <div className="text-center border-l border-r border-slate-50">
              <div className="text-xl font-black text-slate-900 mb-0.5">{animatedYears}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Years</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black text-slate-900 mb-0.5">{animatedProjects}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Projects</div>
            </div>
          </div>

          {/* Social icons */}
          <div className="flex justify-center gap-6">
            {githubUrl && (
              <a href={githubUrl} target="_blank" rel="noopener noreferrer" 
                className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors border border-slate-100 group">
                <Code2 className="w-5 h-5 text-slate-500 group-hover:text-slate-900" />
              </a>
            )}
            {portfolioUrl && (
              <a href={portfolioUrl} target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors border border-slate-100 group">
                <Globe className="w-5 h-5 text-slate-500 group-hover:text-slate-900" />
              </a>
            )}
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group">
              <Briefcase className="w-5 h-5 text-slate-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
