import { useEffect, useState } from 'react'
import { useApi, apiFetch, apiInvalidate } from './api.js'

// Active le mode demo si l'URL contient ?test (perturbe les metriques cote client
// pour VOIR l'animation de reclassement meme si la data est figee).
export function isReorderDemo() {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).has('test')
}

// Refetch reseau en contournant le cache fige de lib/api.js.
export function apiRefetch(url) {
  apiInvalidate(url)
  return apiFetch(url)
}

// Source "vivante" : rend la data (rendu instantane depuis le cache), puis
// - en mode demo : un timer perturbe les lignes via demoMutate (pas de reseau),
// - sinon : refetch periodique (intervalMs) pour refleter les vrais changements.
// Le tri est applique par l'appelant (dans son useMemo d'items).
export function useLiveList(url, { intervalMs = 8000, demoMutate } = {}) {
  const seed = useApi(url)
  const [data, setData] = useState(seed)

  // Synchronise sur le seed tant qu'on n'a pas encore de data locale.
  useEffect(() => { if (seed && !data) setData(seed) }, [seed]) // eslint-disable-line

  const demo = isReorderDemo()

  useEffect(() => {
    if (!url) return
    if (demo) {
      if (!demoMutate) return
      const id = setInterval(() => {
        setData((cur) => {
          const src = cur || seed
          if (!src || !Array.isArray(src.data)) return cur
          return { ...src, data: demoMutate(src.data.map((r) => ({ ...r }))) }
        })
      }, 1900)
      return () => clearInterval(id)
    }
    const id = setInterval(() => {
      apiRefetch(url).then((d) => setData(d)).catch(() => {})
    }, intervalMs)
    return () => clearInterval(id)
  }, [url, demo]) // eslint-disable-line

  return data || seed
}

// ---- Regles de tri (choisies par l'utilisateur) ----
// Groupes : Win Rate desc, tiebreak Total Calls.
export function sortGroups(a, b) {
  return (b.win_rate || 0) - (a.win_rate || 0) || (b.total_members || 0) - (a.total_members || 0)
}
// Tickers : Multiplier (current_stat) desc, tiebreak Market Cap.
export function sortTickers(a, b) {
  return (b.current_stat || 0) - (a.current_stat || 0) || (b.market_cap || 0) - (a.market_cap || 0)
}
// Users/callers : Win desc, tiebreak Total Calls.
export function sortUsers(a, b) {
  return (b.win || 0) - (a.win || 0) || (b.calls || 0) - (a.calls || 0)
}

// ---- Tri par chip de filtre (barre FilterBar) ----
// creation_time des tickers arrive au format "dd.mm.yyyy hh:mm" -> timestamp comparable.
export function parseTs(s) {
  if (!s) return 0
  if (typeof s !== 'string') { const t = new Date(s).getTime(); return isNaN(t) ? 0 : t }
  const m = s.match(/(\d{2})\.(\d{2})\.(\d{4})[ T]?(\d{2})?:?(\d{2})?/)
  if (!m) { const t = Date.parse(s); return isNaN(t) ? 0 : t }
  const [, d, mo, y, h = '0', mi = '0'] = m
  return new Date(+y, +mo - 1, +d, +h, +mi).getTime()
}

// Comparateur groupes selon la cle du chip. sharedMap non utilise ici.
export function groupComparator(key) {
  switch (key) {
    case 'most-members': return (a, b) => (b.total_members || 0) - (a.total_members || 0)
    case 'new-groups': return (a, b) => parseTs(b.created_at) - parseTs(a.created_at)
    case 'most-active': return (a, b) => (b.total_current_stat || 0) - (a.total_current_stat || 0)
    case 'fastest-growing': return (a, b) => (b.max_current_stat || 0) - (a.max_current_stat || 0)
    case 'top-ranked':
    default: return (a, b) => (b.score || 0) - (a.score || 0) || (b.total_wins || 0) - (a.total_wins || 0)
  }
}

// Comparateur tickers selon la cle du chip. sharedMap: addr(lower) -> groups_count.
export function tickerComparator(key, sharedMap = {}) {
  const gc = (x) => sharedMap[String(x.contract_address || '').toLowerCase()] || 0
  switch (key) {
    case 'market-cap': return (a, b) => (b.market_cap || 0) - (a.market_cap || 0)
    case 'oldest': return (a, b) => parseTs(a.creation_time) - parseTs(b.creation_time)
    case 'latest-scan':
    case 'newest': return (a, b) => parseTs(b.creation_time) - parseTs(a.creation_time)
    case 'most-scanned':
    default: return (a, b) => gc(b) - gc(a) || (b.current_stat || 0) - (a.current_stat || 0)
  }
}

// ---- Perturbateurs demo : nudge la metrique de tri sur 2-3 lignes au hasard ----
function pick(list, n) {
  return [...list].sort(() => Math.random() - 0.5).slice(0, n)
}
export function demoGroups(rows) {
  pick(rows, 2 + Math.floor(Math.random() * 2)).forEach((r) => {
    r.win_rate = Math.max(0, Math.min(100, (r.win_rate || 0) + (Math.floor(Math.random() * 13) - 6)))
    r.total_members = (r.total_members || 0) + Math.floor(Math.random() * 6)
  })
  return rows
}
export function demoTickers(rows) {
  pick(rows, 2 + Math.floor(Math.random() * 2)).forEach((r) => {
    r.current_stat = Math.max(0, (r.current_stat || 0) + (Math.floor(Math.random() * 9) - 4))
  })
  return rows
}
export function demoUsers(rows) {
  pick(rows, 2 + Math.floor(Math.random() * 2)).forEach((r) => {
    r.win = Math.max(0, (r.win || 0) + (Math.floor(Math.random() * 13) - 6))
  })
  return rows
}
