// Hook partagé pour lier / changer le compte Telegram via le Login Widget.
// Reprend EXACTEMENT le flux éprouvé d'AuthCorner (config en state, await du
// widget, puis Telegram.Login.auth) pour éviter toute divergence de comportement.
import { useEffect, useState, useCallback } from 'react'
import { apiSet } from '../../lib/api.js'

// Charge le script du widget Telegram une seule fois pour toute la page.
function loadTelegramWidget() {
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

// onConnected(user) est appelé après une liaison réussie ; onError(message) sur échec.
export default function useTelegramConnect({ onConnected, onError } = {}) {
  const [cfg, setCfg] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    loadTelegramWidget()
    fetch('/api/auth/config').then((r) => r.json())
      .then((d) => { if (d.telegram && d.telegram.bot_id) setCfg(d.telegram) })
      .catch(() => {})
  }, [])

  const finish = useCallback(async (payload) => {
    try {
      const r = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await r.json()
      if (r.ok) {
        apiSet('/api/auth/me', { user: data.user })
        onConnected && onConnected(data.user)
        window.location.reload()
      } else {
        onError && onError((data && data.error) || 'Telegram link failed.')
      }
    } catch {
      onError && onError('Network error.')
    }
    setBusy(false)
  }, [onConnected, onError])

  const connect = useCallback(async () => {
    await loadTelegramWidget()
    if (cfg && cfg.bot_id && window.Telegram && window.Telegram.Login) {
      setBusy(true)
      window.Telegram.Login.auth({ bot_id: cfg.bot_id, request_access: true },
        (user) => { if (user) finish(user); else setBusy(false) })
    } else {
      onError && onError("Connexion Telegram indisponible : le bot n'est pas configuré (BOT_TOKEN + domaine dans BotFather).")
    }
  }, [cfg, finish, onError])

  return { connect, busy, ready: !!cfg }
}
