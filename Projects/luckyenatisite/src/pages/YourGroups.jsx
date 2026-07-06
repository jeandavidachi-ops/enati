import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '../components/shared/PageShell.jsx'
import { useApi, apiInvalidate, apiSet } from '../lib/api.js'

const CIRC = 144.5

// Couleur d'avatar deterministe a partir du group_id (stable entre rendus).
const AVATAR_COLORS = [
  '#1f6b3a', '#1c4f8a', '#155e63', '#8a6d1c', '#3a3f45',
  '#2a5c33', '#7a1f1f', '#6b3fb0', '#5a2d8a', '#2ab0c4',
]
const avatarColor = (id) => AVATAR_COLORS[Math.abs(Number(id) || 0) % AVATAR_COLORS.length]
const initialOf = (name) => (name || '?').trim().charAt(0).toUpperCase() || '?'

const usersIcon = (stroke) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
)

function fmtMembers(n) {
  if (n == null) return '—'
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'K'
  return String(n)
}

// Ligne d'un groupe rejoint : win rate en anneau, wins, defeats, calls, membres reels.
function JoinedRow({ g, last }) {
  const navigate = useNavigate()
  const pct = g.win_rate || 0
  const offset = (CIRC * (1 - pct / 100)).toFixed(1)
  return (
    <div
      onClick={() => navigate(`/group/${g.group_id}`)}
      style={{ display: 'grid', gridTemplateColumns: '2.1fr 1fr 0.8fr 0.9fr 1.15fr 1.1fr', alignItems: 'center', height: 88, borderBottom: `1px solid ${last ? 'transparent' : '#1b2429'}`, cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', flexShrink: 0, background: avatarColor(g.group_id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700 }}>{initialOf(g.group_name)}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ color: '#ffffff', fontSize: 15, fontWeight: 600, lineHeight: 1 }}>{g.group_name}</span>
        </div>
      </div>
      <div style={{ position: 'relative', width: 54, height: 54 }}>
        <svg width="54" height="54" viewBox="0 0 54 54" style={{ display: 'block' }}>
          <circle cx="27" cy="27" r="23" fill="none" stroke="#1b2429" strokeWidth="4"></circle>
          <circle cx="27" cy="27" r="23" fill="none" stroke="#00e676" strokeWidth="4" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={offset} transform="rotate(-90 27 27)"></circle>
        </svg>
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: 13, fontWeight: 600 }}>{pct}%</span>
      </div>
      <div style={{ color: '#00e676', fontSize: 15, fontWeight: 600 }}>{g.wins}</div>
      <div style={{ color: '#ff3b24', fontSize: 15, fontWeight: 600 }}>{g.defeats}</div>
      <div style={{ color: '#d3d9db', fontSize: 15, fontWeight: 500 }}>{g.calls}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {usersIcon('#8b9599')}
        <span style={{ color: '#d3d9db', fontSize: 14, fontWeight: 500 }}>{fmtMembers(g.members)}</span>
      </div>
    </div>
  )
}

// Ligne d'un groupe disponible : bouton Join/Request again (toujours actif).
// Le lien de join est resolu au clic (POST request-join) -> chemin rapide sans
// appel Telegram au chargement. Un re-clic renvoie la demande (ré-ouvre le lien).
function AvailableRow({ g, last }) {
  const [requested, setRequested] = useState(!!g.requested)
  const [busy, setBusy] = useState(false)
  const [noLink, setNoLink] = useState(false)

  async function requestJoin() {
    setBusy(true)
    setNoLink(false)
    try {
      const r = await fetch(`/api/group/${g.group_id}/request-join`, { method: 'POST' })
      const data = await r.json()
      setRequested(true)
      apiInvalidate('/api/my-groups')
      if (data.join_link) window.open(data.join_link, '_blank', 'noopener')
      else setNoLink(true)
    } catch { /* ignore */ }
    setBusy(false)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2.1fr 1fr 0.8fr 0.9fr 1.15fr 1.1fr', alignItems: 'center', height: 88, borderBottom: `1px solid ${last ? 'transparent' : '#1b2429'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', flexShrink: 0, background: avatarColor(g.group_id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700 }}>{initialOf(g.group_name)}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ color: '#ffffff', fontSize: 15, fontWeight: 600, lineHeight: 1 }}>{g.group_name}</span>
        </div>
      </div>
      <div style={{ color: '#d3d9db', fontSize: 15, fontWeight: 500 }}>{g.win_rate}%</div>
      <div style={{ color: '#00e676', fontSize: 15, fontWeight: 600 }}>{g.wins}</div>
      <div style={{ color: '#ff3b24', fontSize: 15, fontWeight: 600 }}>{g.defeats}</div>
      <div style={{ color: '#d3d9db', fontSize: 15, fontWeight: 500 }}>{g.calls}</div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
        <button onClick={requestJoin} disabled={busy} style={{ height: 38, padding: '0 20px', border: '1px solid rgba(0,230,118,0.45)', background: 'transparent', borderRadius: 7, color: '#00e676', fontSize: 14, fontWeight: 600, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit', opacity: busy ? 0.6 : 1 }}>
          {busy ? '…' : (requested ? 'Request again' : 'Join')}
        </button>
        {noLink && <span style={{ color: '#8b9599', fontSize: 11 }}>No invite link available (bot not admin)</span>}
      </div>
    </div>
  )
}

const headerCell = { color: '#8b9599', fontSize: 13, fontWeight: 500 }

function GroupsTable({ rows, kind }) {
  const RowCmp = kind === 'joined' ? JoinedRow : AvailableRow
  const lastCol = kind === 'joined' ? 'Members' : 'Join'
  return (
    <div style={{ marginTop: 20, border: '1px solid #253036', borderRadius: 8, background: '#0d1112', padding: '0 28px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2.1fr 1fr 0.8fr 0.9fr 1.15fr 1.1fr', alignItems: 'center', height: 52, borderBottom: '1px solid #1b2429' }}>
        <div style={headerCell}>Group</div>
        <div style={headerCell}>Win Rate</div>
        <div style={headerCell}>Wins</div>
        <div style={headerCell}>Defeats</div>
        <div style={headerCell}>Groups Calls</div>
        <div style={headerCell}>{lastCol}</div>
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: '28px 0', color: '#8b9599', fontSize: 14 }}>
          {kind === 'joined' ? 'No groups joined yet.' : 'No other groups available.'}
        </div>
      ) : (
        rows.map((g, i) => <RowCmp key={g.group_id} g={g} last={i === rows.length - 1} />)
      )}
    </div>
  )
}

// Section "Requests From Groups" : impossible cote API Telegram (un bot ne peut pas
// lire les invitations recues par un user). Conservee en placeholder visuel.
function RequestsPlaceholder() {
  return (
    <div style={{ marginTop: 28, border: '1px solid #253036', borderRadius: 8, background: '#0d1112', padding: '0 28px', opacity: 0.6 }}>
      <div style={{ padding: '22px 0 18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ color: '#ffffff', fontSize: 19, fontWeight: 700 }}>Requests From Groups</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 8px', background: '#1b2429', color: '#c4ccce', fontSize: 12, fontWeight: 600, borderRadius: 6 }}>Soon</span>
        </div>
        <p style={{ margin: '9px 0 0 0', color: '#8b9599', fontSize: 14, fontWeight: 400, lineHeight: 1 }}>Groups that have invited you to join</p>
      </div>
    </div>
  )
}

export default function YourGroups() {
  const cached = useApi('/api/my-groups')          // instantane (base)
  const [fresh, setFresh] = useState(null)         // reconciliation de fond
  const [tab, setTab] = useState('joined')

  // Detecte en tache de fond les groupes nouvellement rejoints/quittes, sans
  // bloquer l'affichage. On memorise la version fraiche pour les prochains rendus.
  useEffect(() => {
    let alive = true
    fetch('/api/my-groups/refresh')
      .then((r) => r.json())
      .then((d) => { if (alive && d && d.success) { setFresh(d); apiSet('/api/my-groups', d) } })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const data = fresh || cached
  const joined = data?.joined || []
  const available = data?.available || []
  const loading = cached === undefined && !fresh
  const notLinked = data && data.success === false

  const tabStyle = (active) => ({
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, height: 74,
    position: 'relative', cursor: 'pointer',
    borderBottom: active ? '2px solid #00e676' : '2px solid transparent',
  })
  const badge = (active) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 22, height: 22,
    padding: '0 7px', boxSizing: 'border-box', background: '#1b2429',
    color: active ? '#00e676' : '#c4ccce', fontSize: 13, fontWeight: 600, borderRadius: 6,
  })

  return (
    <PageShell>
      <div style={{ background: '#070808' }}>
        <div style={{ padding: '34px 32px', boxSizing: 'border-box', fontFamily: "'Inter',sans-serif" }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, position: 'relative', top: 1 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <h1 style={{ margin: 0, color: '#ffffff', fontSize: 27, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1 }}>Your Groups</h1>
          </div>
          <p style={{ margin: '10px 0 0 0', color: '#8b9599', fontSize: 15, fontWeight: 400, lineHeight: 1 }}>All the groups you've joined and can request</p>

          {notLinked ? (
            <div style={{ marginTop: 26, border: '1px solid #253036', borderRadius: 8, background: '#0d1112', padding: '28px', color: '#8b9599', fontSize: 15 }}>
              Connect your Telegram account to see your groups.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', marginTop: 26, border: '1px solid #253036', borderRadius: 8, overflow: 'hidden' }}>
                <div style={tabStyle(tab === 'joined')} onClick={() => setTab('joined')}>
                  <span style={{ color: tab === 'joined' ? '#ffffff' : '#c4ccce', fontSize: 15, fontWeight: 600 }}>Joined Groups</span>
                  <span style={badge(tab === 'joined')}>{joined.length}</span>
                </div>
                <div style={tabStyle(tab === 'requested')} onClick={() => setTab('requested')}>
                  <span style={{ color: tab === 'requested' ? '#ffffff' : '#c4ccce', fontSize: 15, fontWeight: 600 }}>Requested</span>
                  <span style={badge(tab === 'requested')}>{available.length}</span>
                </div>
              </div>

              {loading ? (
                <div style={{ marginTop: 20, color: '#8b9599', fontSize: 14, padding: '28px 4px' }}>Loading…</div>
              ) : tab === 'joined' ? (
                <GroupsTable rows={joined} kind="joined" />
              ) : (
                <GroupsTable rows={available} kind="available" />
              )}

              <RequestsPlaceholder />
            </>
          )}
        </div>
      </div>
    </PageShell>
  )
}
