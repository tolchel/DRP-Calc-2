import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

// Note: React 19 useRef() always requires an initial argument.
// Use useRef<T>(null), not useRef<T>() — enforced throughout the codebase.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
