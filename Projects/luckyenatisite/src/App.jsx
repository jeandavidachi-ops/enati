import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Leaderboards from './pages/Leaderboards.jsx'
import Explore from './pages/Explore.jsx'
import GroupProfile from './pages/GroupProfile.jsx'
import TokenPage from './pages/TokenPage.jsx'

// Mêmes URLs qu'avant la migration MPA -> SPA (navigation client, sans refresh).
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/leaderboard" element={<Leaderboards />} />
      <Route path="/leaderboards" element={<Leaderboards />} />
      <Route path="/ticker" element={<Explore type="ticker" />} />
      <Route path="/group" element={<Explore type="group" />} />
      <Route path="/group/:id" element={<GroupProfile />} />
      <Route path="/ticker/:address" element={<TokenPage />} />
    </Routes>
  )
}
