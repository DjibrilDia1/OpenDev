import { useEffect } from 'react'
import { Route, Routes, Navigate, useLocation } from 'react-router-dom'
import { DemoProvider } from './state/DemoProvider'
import { LiveProvider } from './state/LiveProvider'
import { liveMode } from './lib/api'
import { UpcomingFeaturePage } from './pages/UpcomingFeaturePage'
import { AuthFlow } from './components/auth/AuthFlow'
import { AccountGate } from './components/auth/AccountGate'
import { HomePage } from './pages/HomePage'
import { DiscoverPage } from './pages/DiscoverPage'
import { CommunityDetailPage } from './pages/CommunityDetailPage'
import { MyProfilePage } from './pages/MyProfilePage'
import { UserProfilePage } from './pages/UserProfilePage'
import { FollowersPage } from './pages/FollowersPage'
import { FollowingPage } from './pages/FollowingPage'
import { PeoplePage } from './pages/PeoplePage'
import { MessagesPage } from './pages/MessagesPage'
import { NotificationsPage as LiveNotificationsPage } from './pages/NotificationsPage'
import { SavedPostsPage } from './pages/SavedPostsPage'
import { SettingsPage } from './pages/SettingsPage'
import { EventsPage } from './pages/EventsPage'
import {
  SearchPage,
  SavedPage,
  PostPage,
  NotificationsPage,
  InfoPage,
  NotFoundPage,
} from './pages/UtilityPages'
function RouteEffects() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    const title =
      pathname === '/evenements'
        ? 'Événements'
        : pathname === '/parametres'
          ? 'Paramètres'
          : pathname === '/'
            ? 'Le fil communautaire'
            : pathname.startsWith('/decouvrir')
              ? 'Découvrir'
              : pathname.startsWith('/profil')
                  ? 'Profil'
                : pathname.startsWith('/messages')
                  ? 'Messages'
                  : pathname.startsWith('/communaute')
                    ? 'Communauté'
                    : pathname.startsWith('/recherche')
                      ? 'Rechercher'
                      : 'La communauté'
    document.title = title + ' OpenDev'
  }, [pathname])
  return null
}
export default function App() {
  const Provider = liveMode ? LiveProvider : DemoProvider
  return (
    <Provider>
      <RouteEffects />
      <AccountGate>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/decouvrir" element={<DiscoverPage />} />
          <Route
            path="/explorer"
            element={<Navigate to="/decouvrir" replace />}
          />
          <Route
            path="/discover"
            element={<Navigate to="/decouvrir" replace />}
          />
          <Route
            path="/communaute"
            element={<Navigate to="/decouvrir" replace />}
          />
          <Route
            path="/mes-communautes"
            element={<Navigate to="/decouvrir?mes=1" replace />}
          />
          <Route path="/communaute/:slug" element={<CommunityDetailPage />} />
          <Route path="/profil" element={<MyProfilePage />} />
          <Route path="/profil/me" element={<MyProfilePage />} />
          <Route path="/profil/u/:handle" element={<UserProfilePage />} />
          <Route path="/profil/:handle" element={<UserProfilePage />} />
          <Route
            path="/profil/:handle/abonnes"
            element={
              liveMode ? (
                <UpcomingFeaturePage title="Abonnés" />
              ) : (
                <FollowersPage />
              )
            }
          />
          <Route
            path="/profil/:handle/abonnements"
            element={
              liveMode ? (
                <UpcomingFeaturePage title="Abonnements" />
              ) : (
                <FollowingPage />
              )
            }
          />
          <Route path="/developpeurs" element={<PeoplePage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/parametres" element={<SettingsPage />} />
          <Route path="/evenements" element={<EventsPage />} />
          <Route path="/recherche" element={<SearchPage />} />
          <Route
            path="/enregistres"
            element={liveMode ? <SavedPostsPage /> : <SavedPage />}
          />
          <Route path="/publication/:id" element={<PostPage />} />
          <Route
            path="/notifications"
            element={
              liveMode ? <LiveNotificationsPage /> : <NotificationsPage />
            }
          />
          <Route
            path="/a-propos"
            element={<Navigate to="/informations/a-propos" replace />}
          />
          <Route
            path="/regles"
            element={<Navigate to="/informations/regles" replace />}
          />
          <Route
            path="/confidentialite"
            element={<Navigate to="/informations/confidentialite" replace />}
          />
          <Route path="/informations/:page" element={<InfoPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AccountGate>
      <AuthFlow />
    </Provider>
  )
}
