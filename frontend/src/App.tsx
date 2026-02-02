import { useState, useEffect, useCallback } from 'react'
import { LandingPage } from './pages/LandingPage.tsx'
import { VaultPage } from './pages/VaultPage.tsx'

type Page = 'landing' | 'app'

function pathToPage(pathname: string): Page {
  return pathname === '/app' ? 'app' : 'landing'
}

export default function App() {
  const [page, setPage] = useState<Page>(() => pathToPage(window.location.pathname))

  const navigate = useCallback((target: Page) => {
    const path = target === 'app' ? '/app' : '/'
    window.history.pushState(null, '', path)
    setPage(target)
  }, [])

  useEffect(() => {
    const onPopState = () => setPage(pathToPage(window.location.pathname))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  if (page === 'landing') {
    return <LandingPage onLaunch={() => navigate('app')} />
  }

  return <VaultPage onBack={() => navigate('landing')} />
}
