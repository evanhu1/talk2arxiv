import { lazy, Suspense } from 'react'
import Home from './pages/Home'
import { paperIdFromPath } from '../shared/papers'

// The reader pulls in Markdown, KaTeX, and DOMPurify. The home page needs none of them.
const PaperPage = lazy(() => import('./pages/PaperPage'))

export default function App() {
  const path = window.location.pathname
  const paperId = paperIdFromPath(path)
  // Any other path is a link we could not read. Say so instead of silently showing home.
  if (!paperId) return <Home unrecognizedLink={path === '/' ? null : path} />
  return (
    <Suspense fallback={null}>
      <PaperPage key={paperId} paperId={paperId} />
    </Suspense>
  )
}
