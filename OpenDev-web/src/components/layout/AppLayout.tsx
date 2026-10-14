import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { TopNav, MainNavigation } from './TopNav'
import { LeftSidebar } from './LeftSidebar'
import { RightSidebar } from './RightSidebar'
import { Modal } from '../common/Modal'
interface AppLayoutProps {
  children: ReactNode
  sidebarVariant?: 'home' | 'none'
  showRail?: boolean
  customRightSidebar?: ReactNode
}
export function AppLayout({
  children,
  sidebarVariant = 'home',
  showRail = true,
  customRightSidebar,
}: AppLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const hasRight = !!customRightSidebar || sidebarVariant === 'home'
  return (
    <>
      <a className="skip-link" href="#main">
        Aller au contenu
      </a>
      <TopNav onToggleMobileMenu={() => setMenuOpen(true)} />
      <div
        className={
          'app-shell ' +
          (hasRight ? 'with-right' : 'wide-content') +
          (!showRail ? ' no-rail' : '')
        }
      >
        {showRail && (
          <div className="community-rail">
            <LeftSidebar />
          </div>
        )}
        <main id="main" className="main-content" tabIndex={-1}>
          {children}
        </main>
        {hasRight && (
          <div className="right-column">
            {customRightSidebar ?? <RightSidebar />}
          </div>
        )}
      </div>
      <div className="bottom-nav">
        <MainNavigation mobile onOpenMenu={() => setMenuOpen(true)} />
      </div>
      {menuOpen && (
        <Modal title="Mon espace" onClose={() => setMenuOpen(false)}>
          <nav className="mobile-space-links" aria-label="Mon espace">
            <Link to="/profil" onClick={() => setMenuOpen(false)}>
              Mon profil
            </Link>
            <Link to="/enregistres" onClick={() => setMenuOpen(false)}>
              Publications enregistrées
            </Link>
            <Link to="/developpeurs" onClick={() => setMenuOpen(false)}>
              Mon réseau
            </Link>
          </nav>
          <LeftSidebar expanded onCloseMobile={() => setMenuOpen(false)} />
        </Modal>
      )}
    </>
  )
}
