import { Buffer } from 'buffer'
globalThis.Buffer = Buffer

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { OpenfortProviders } from './providers/OpenfortProviders.tsx'
import { NetworkModeProvider } from './contexts/NetworkModeContext.tsx'
import { ThemeProvider } from './contexts/ThemeContext.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NetworkModeProvider>
      <ThemeProvider>
        <OpenfortProviders>
          <App />
        </OpenfortProviders>
      </ThemeProvider>
    </NetworkModeProvider>
  </StrictMode>,
)
