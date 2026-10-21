import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router'
import { useAuth } from '../features/auth/hooks/useAuth'
import './Navbar.scss'

const Navbar = ({ onHistoryClick }) => {
    const { user, handleLogout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    const isHome = location.pathname === '/'

    const handleHistoryNavigation = () => {
        if (onHistoryClick) {
            onHistoryClick()
            return
        }

        if (isHome) {
            const el = document.getElementById('history-section')
            if (el) {
                el.scrollIntoView({ behavior: 'smooth' })
            }
        } else {
            navigate('/#history-section')
        }
    }

    const onLogout = async () => {
        await handleLogout()
        navigate('/login')
    }

    return (
        <header className="app-navbar">
            <div className="app-navbar__container">
                <Link to="/" className="app-navbar__brand">
                    <span className="brand-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                        </svg>
                    </span>
                    <span>Interview<span className="brand-highlight">AI</span></span>
                </Link>

                <nav className="app-navbar__links">
                    <Link
                        to="/"
                        className={`nav-link ${isHome ? 'nav-link--active' : ''}`}
                    >
                        New Plan
                    </Link>
                    <button
                        onClick={handleHistoryNavigation}
                        type="button"
                        className="nav-link"
                    >
                        Previous History
                    </button>
                </nav>

                <div className="app-navbar__user">
                    {user && (
                        <div className="user-badge" title={user.email || user.username}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                            <span>{user.username}</span>
                        </div>
                    )}
                    <button
                        onClick={onLogout}
                        className="logout-btn"
                        title="Sign out of your account"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Logout
                    </button>
                </div>
            </div>
        </header>
    )
}

export default Navbar
