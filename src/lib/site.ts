import type { Source } from '../../shared/papers'

// Which site this is: talk2arxiv.org or talk2biorxiv.org. Both serve the same
// app. Add ?site=biorxiv to preview the bioRxiv site locally.
export function currentSite(): Source {
  const forced = new URLSearchParams(window.location.search).get('site')
  if (forced === 'arxiv' || forced === 'biorxiv') return forced
  return window.location.hostname.includes('bio') ? 'biorxiv' : 'arxiv'
}
