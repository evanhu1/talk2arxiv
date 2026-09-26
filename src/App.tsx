import { lazy, Suspense } from 'react'
import Home from './pages/Home'
import { paperIdFromPath } from '../shared/papers'

// The reader pulls in Markdown, KaTeX, and DOMPurify. The home page needs none of them.
const PaperPage = lazy(() => import('./pages/PaperPage'))

export default function App() {
  const paperId = paperIdFromPath(window.location.pathname)
  if (!paperId) return <Home />
  return (
    <Suspense fallback={null}>
      <PaperPage key={paperId} paperId={paperId} />
    </Suspense>
  )
}
