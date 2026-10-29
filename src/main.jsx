import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import App from './App.jsx'
import { ModeProvider } from './mode/ModeContext.jsx'
import { WorldProvider } from './world/WorldContext.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <ModeProvider>
        <WorldProvider>
          <App />
        </WorldProvider>
      </ModeProvider>
    </MotionConfig>
  </StrictMode>,
)
