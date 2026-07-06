// Helper partagé pour lier / changer le compte Telegram via le Login Widget.
// Réutilise l'endpoint /api/auth/telegram (qui fait un $set -> lier ET changer).
import { apiSet } from './api.js'

// Charge le script du widget Telegram une seule fois pour toute la page.
export function loadTelegramWidget() {
  if (window.__vsTgWidgetLoading) return window.__vsTgWidgetLoading
  window.__vsTgWidgetLoading = new Promise((resolve) => {
    if (window.Telegram && window.Telegram.Login) return resolve()
    const s = document.createElement('script')
    s.async = true
    s.src = 'https://telegram.org/js/telegram-widget.js?22'
    s.onload = () => resolve()
    s.onerror = () => resolve()
    document.head.appendChild(s)
  })
  return window.__vsTgWidgetLoading
}

let _cfg = null
let _cfgLoading = false

// À appeler tôt (au montage) : charge le script du widget ET la config du bot,
// pour que connectTelegram() puisse ouvrir la popup SYNCHRONEMENT au clic.
// Ouvrir la popup après un await réseau casse le "user gesture" et Telegram la
// referme immédiatement -> d'où l'importance de tout précharger ici.
export function preloadTelegram() {
  loadTelegramWidget()
  if (!_cfgLoading && !_cfg) {
    _cfgLoading = true
    fetch('/api/auth/config')
      .then((r) => r.json())
      .then((d) => { _cfg = (d && d.telegram) || null })
      .catch(() => {})
      .finally(() => { _cfgLoading = false })
  }
}

// Doit être appelé DIRECTEMENT depuis un handler de clic (sans await préalable).
// Ouvre le widget Telegram de façon synchrone, puis poste le payload à
// /api/auth/telegram, met à jour le cache /api/auth/me et renvoie l'utilisateur.
export function connectTelegram() {
  return new Promise((resolve, reject) => {
    if (!(window.Telegram && window.Telegram.Login) || !_cfg || !_cfg.bot_id) {
      // Pas encore prêt : on relance le préchargement pour la prochaine fois.
      preloadTelegram()
      reject(new Error("Connexion Telegram indisponible : bot non configuré, ou pas encore prêt (réessaie dans un instant)."))
      return
    }
    // Appel synchrone -> conserve le user gesture, la popup ne se referme pas.
    window.Telegram.Login.auth({ bot_id: _cfg.bot_id, request_access: true }, (user) => {
      if (!user) { reject(new Error('cancelled')); return }
      fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      })
        .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
        .then(({ ok, data }) => {
          if (!ok) throw new Error((data && data.error) || 'Telegram link failed.')
          apiSet('/api/auth/me', { user: data.user })
          resolve(data.user)
        })
        .catch(reject)
    })
  })
}
