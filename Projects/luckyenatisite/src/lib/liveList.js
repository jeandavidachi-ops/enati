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

// ---- Boxe de filtres GROUPES (GroupFiltersModal) ----
// selected = Set de keys. Applique un predicat de filtrage (visibilite / taille /
// activite) PUIS un tri derive des options de tri cochees. Si aucune option de tri,
// fallbackComparator est utilise (le tri courant du chip). Data reelle: is_public,
// member_count (Telegram), last_activity.
const GROUP_SORT_PRIORITY = ['most-active', 'most-members', 'fastest-growing', 'highest-win-rate', 'most-wins']

export function applyGroupFilters(list, selected, fallbackComparator) {
  const sel = selected instanceof Set ? selected : new Set(selected || [])
  let out = (list || []).slice()

  // --- Filtres qui restreignent ---
  // Visibilite (OR interne). Un groupe is_public inconnu (null) est exclu si un
  // filtre de visibilite est actif.
  const wantPub = sel.has('public'), wantPriv = sel.has('private')
  if (wantPub || wantPriv) {
    out = out.filter((g) => (wantPub && g.is_public === true) || (wantPriv && g.is_public === false))
  }
  // Taille (OR interne). All Sizes = pas de contrainte.
  const s0 = sel.has('size-0-100'), s1 = sel.has('size-100-1k')
  if ((s0 || s1) && !sel.has('all-sizes')) {
    out = out.filter((g) => {
      const m = g.member_count
      if (m == null) return false
      return (s0 && m <= 100) || (s1 && m > 100 && m <= 1000)
    })
  }
  // Active Today : dernier call dans les dernieres 24h.
  if (sel.has('active-today')) {
    const dayAgo = Date.now() - 24 * 3600 * 1000
    out = out.filter((g) => parseTs(g.last_activity) >= dayAgo)
  }

  // --- Tri derive des options de tri cochees (1re par ordre de priorite) ---
  const sortKey = GROUP_SORT_PRIORITY.find((k) => sel.has(k))
  if (sortKey) out.sort(groupSortByOption(sortKey))
  else if (fallbackComparator) out.sort(fallbackComparator)
  return out
}

function groupSortByOption(key) {
  switch (key) {
    case 'most-members': return (a, b) => (b.member_count || 0) - (a.member_count || 0)
    case 'fastest-growing': return (a, b) => (b.max_current_stat || 0) - (a.max_current_stat || 0)
    case 'highest-win-rate': return (a, b) => (b.win_rate || 0) - (a.win_rate || 0)
    case 'most-wins': return (a, b) => (b.total_wins || 0) - (a.total_wins || 0)
    case 'most-active':
    default: return (a, b) => (b.total_current_stat || 0) - (a.total_current_stat || 0)
  }
}

// Comparateur tickers selon la cle du chip. sharedMap: addr(lower) -> { count, ids }.
export function tickerComparator(key, sharedMap = {}) {
  const gc = (x) => {
    const v = sharedMap[String(x.contract_address || '').toLowerCase()]
    return (typeof v === 'object' ? (v && v.count) : v) || 0
  }
  switch (key) {
    case 'market-cap': return (a, b) => (b.market_cap || 0) - (a.market_cap || 0)
    case 'oldest': return (a, b) => parseTs(a.creation_time) - parseTs(b.creation_time)
    case 'latest-scan':
    case 'newest': return (a, b) => parseTs(b.creation_time) - parseTs(a.creation_time)
    case 'most-scanned':
    default: return (a, b) => gc(b) - gc(a) || (b.current_stat || 0) - (a.current_stat || 0)
  }
}

// ---- Boxe de filtres TICKERS (TickerFiltersModal) ----
// filters = { sort, minCap, maxCap }. Restreint par tranche de market cap puis trie
// selon l'option de tri cochee (fallback = tri du chip courant). Data reelle:
// market_cap, creation_time, groups_count (via sharedMap).
export const EMPTY_TICKER_FILTERS = { sort: null, minCap: null, maxCap: null }

export function tickerFiltersCount(f) {
  if (!f) return 0
  let n = 0
  if (f.sort) n += 1
  if (f.minCap != null || f.maxCap != null) n += 1
  return n
}

export function applyTickerFilters(list, filters, sharedMap = {}, fallbackComparator) {
  const f = filters || {}
  let out = (list || []).slice()
  const { minCap, maxCap } = f
  if (minCap != null || maxCap != null) {
    out = out.filter((t) => {
      const mc = Number(t.market_cap)
      if (isNaN(mc)) return false
      if (minCap != null && mc < minCap) return false
      if (maxCap != null && mc > maxCap) return false
      return true
    })
  }
  if (f.sort) out.sort(tickerComparator(f.sort, sharedMap))
  else if (fallbackComparator) out.sort(fallbackComparator)
  return out
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
