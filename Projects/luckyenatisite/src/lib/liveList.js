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
