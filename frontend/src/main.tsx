import { Buffer } from 'buffer'
globalThis.Buffer = Buffer

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { OpenfortProviders } from './providers/OpenfortProviders.tsx'
import { NetworkModeProvider } from './contexts/NetworkModeContext.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NetworkModeProvider>
      <OpenfortProviders>
        <App />
      </OpenfortProviders>
    </NetworkModeProvider>
  </StrictMode>,
)
