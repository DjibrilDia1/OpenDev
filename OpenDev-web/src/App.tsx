import { Route, Routes, Navigate } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { DiscoverPage } from './pages/DiscoverPage'
import { CommunityDetailPage } from './pages/CommunityDetailPage'
import { MyProfilePage } from './pages/MyProfilePage'
import { UserProfilePage } from './pages/UserProfilePage'
import { FollowersPage } from './pages/FollowersPage'
import { FollowingPage } from './pages/FollowingPage'
import { MessagesPage } from './pages/MessagesPage'

export default function App() {
  return (
    <Routes>
      {/* 1. Page Accueil */}
      <Route path="/" element={<HomePage />} />

      {/* 2. Page Découvrir */}
      <Route path="/decouvrir" element={<DiscoverPage />} />
      <Route path="/explorer" element={<Navigate to="/decouvrir" replace />} />

      {/* 3. Redirections de l'ancien module communauté supprimé */}
      <Route path="/communaute" element={<Navigate to="/communaute/react" replace />} />
      <Route path="/mes-communautes" element={<Navigate to="/communaute/react" replace />} />

      {/* 4. Page dédiée Communauté React */}
      <Route path="/communaute/react" element={<CommunityDetailPage />} />
      <Route path="/communaute/:slug" element={<CommunityDetailPage />} />

      {/* 5. Profils */}
      <Route path="/profil" element={<MyProfilePage />} />
      <Route path="/profil/me" element={<MyProfilePage />} />
      <Route path="/profil/amina" element={<UserProfilePage />} />
      <Route path="/profil/:handle" element={<UserProfilePage />} />

      {/* 6. Abonnés & Abonnements */}
      <Route path="/profil/amina/abonnes" element={<FollowersPage />} />
      <Route path="/profil/:handle/abonnes" element={<FollowersPage />} />
      <Route path="/profil/amina/abonnements" element={<FollowingPage />} />
      <Route path="/profil/:handle/abonnements" element={<FollowingPage />} />

      {/* 7. Messagerie */}
      <Route path="/messages" element={<MessagesPage />} />

      {/* 8. Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
