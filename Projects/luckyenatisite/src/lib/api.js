import { useState, useEffect } from 'react'

// Cache mémoire (par session) des réponses GET de l'API.
// But : afficher les pages instantanément depuis le cache au changement de page,
// sans re-fetch ni écran vide. Les données restent figées jusqu'à un rechargement (F5).
const cache = new Map()     // url -> donnée JSON résolue
const inflight = new Map()  // url -> Promise en cours (déduplication)

// Fetch mémorisé par URL. Renvoie toujours une Promise.
export function apiFetch(url) {
  if (cache.has(url)) return Promise.resolve(cache.get(url))
  if (inflight.has(url)) return inflight.get(url)
  const p = fetch(url)
    .then((r) => r.json())
    .then((data) => { cache.set(url, data); inflight.delete(url); return data })
    .catch((e) => { inflight.delete(url); throw e })
  inflight.set(url, p)
  return p
}

// Lecture synchrone du cache (ou undefined si pas encore chargé).
export function apiGet(url) {
  return cache.has(url) ? cache.get(url) : undefined
}

// Écrit/écrase une valeur en cache (ex. après login pour /api/auth/me).
export function apiSet(url, data) {
  cache.set(url, data)
}

// Invalide une entrée (prochain apiFetch refera le réseau).
export function apiInvalidate(url) {
  cache.delete(url)
  inflight.delete(url)
}

// Précharge une liste d'URLs (erreurs ignorées).
export function prefetch(urls) {
  urls.forEach((u) => { apiFetch(u).catch(() => {}) })
}

// Hook : rend la donnée en cache immédiatement (rendu instantané si cache chaud),
// puis met à jour quand le fetch résout. `undefined` tant que rien n'est chargé.
export function useApi(url) {
  const [data, setData] = useState(() => (url ? apiGet(url) : undefined))
  useEffect(() => {
    if (!url) return
    let alive = true
    apiFetch(url).then((d) => { if (alive) setData(d) }).catch(() => {})
    return () => { alive = false }
  }, [url])
  return data
}
