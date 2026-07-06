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

let _cfgPromise = null
function getTgConfig() {
  if (!_cfgPromise) {
    _cfgPromise = fetch('/api/auth/config')
      .then((r) => r.json())
      .then((d) => (d && d.telegram) || null)
      .catch(() => null)
  }
  return _cfgPromise
}

// Ouvre le widget Telegram, poste le payload à /api/auth/telegram, met à jour le
// cache /api/auth/me et renvoie l'utilisateur mis à jour. Rejette en cas d'échec/annulation.
export async function connectTelegram() {
  await loadTelegramWidget()
  const cfg = await getTgConfig()
  if (!cfg || !cfg.bot_id || !(window.Telegram && window.Telegram.Login)) {
    throw new Error("Connexion Telegram indisponible : le bot n'est pas configuré (BOT_TOKEN + domaine dans BotFather).")
  }
  const payload = await new Promise((resolve, reject) => {
    window.Telegram.Login.auth({ bot_id: cfg.bot_id, request_access: true },
      (user) => (user ? resolve(user) : reject(new Error('cancelled'))))
  })
  const r = await fetch('/api/auth/telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await r.json()
  if (!r.ok) throw new Error((data && data.error) || 'Telegram link failed.')
  apiSet('/api/auth/me', { user: data.user })
  return data.user
}
