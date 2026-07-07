import React from 'react'
import PageShell from '../components/shared/PageShell.jsx'
import { useApi } from '../lib/api.js'
import ProfileContent from './ProfileContent.jsx'

// --- Page ----------------------------------------------------------------
export default function Profile() {
  const data = useApi('/api/me/profile')
  // Snapshot en cache (/api/auth/me) -> pre-affichage instantane (header + stats +
  // anneau Win Rate) avant que le profil complet ne charge (stale-while-revalidate).
  const me = useApi('/api/auth/me')?.user

  return (
    <PageShell>
      <ProfileContent data={data} me={me} />
    </PageShell>
  )
}
