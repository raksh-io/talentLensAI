import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

window.addEventListener('mousemove', (e) => {
  const x = (e.clientX / window.innerWidth - 0.5) * 100
  const y = (e.clientY / window.innerHeight - 0.5) * 100
  document.body.style.setProperty('--mx', x.toString());
  document.body.style.setProperty('--my', y.toString());
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
