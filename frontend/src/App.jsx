import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import Landing from './pages/Landing'
import SignIn from './pages/SignIn'
import CandidateDashboard from './pages/CandidateDashboard'
import RecruiterDashboard from './pages/RecruiterDashboard'

function ProtectedRoute({ children, requiredRole }) {
  const stored = localStorage.getItem('tl_user')
  if (!stored) return <Navigate to="/signin" replace />
  try {
    const user = JSON.parse(stored)
    if (requiredRole && user.role !== requiredRole) {
      return <Navigate to={user.role === 'recruiter' ? '/recruiter' : '/candidate'} replace />
    }
    return children
  } catch {
    return <Navigate to="/signin" replace />
  }
}

export default function App() {
  return (
    <>
      <div className="noise-overlay" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/candidate" element={
            <ProtectedRoute requiredRole="candidate">
              <CandidateDashboard />
            </ProtectedRoute>
          } />
          <Route path="/recruiter" element={
            <ProtectedRoute requiredRole="recruiter">
              <RecruiterDashboard />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}
