import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItemClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-cyan-400/20 text-cyan-200' : 'text-slate-200 hover:bg-white/10'
  }`;

function TopNav() {
  const { isAuthenticated, isAdmin, user } = useAuth();
  const isOnboardingCompleted = Boolean(user?.onboarding_completed);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }

    const onDocumentClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, [isMenuOpen]);

  return (
    <header className="border-b border-white/10 bg-slate-950/50 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link to="/" className="text-lg font-semibold tracking-wide text-cyan-200">
          Placement and Training Platform
        </Link>

        <nav className="flex flex-wrap items-center gap-1">
          <NavLink to="/" className={navItemClass}>
            Home
          </NavLink>

          {!isAuthenticated && (
            <>
              <NavLink to="/login" className={navItemClass}>
                Login
              </NavLink>
              <NavLink to="/register" className={navItemClass}>
                Register
              </NavLink>
            </>
          )}

          {isAuthenticated && (
            <>
              {!isOnboardingCompleted && (
                <NavLink to="/onboarding" className={navItemClass}>
                  Onboarding
                </NavLink>
              )}
              {isOnboardingCompleted && (
                <>
                  <NavLink to="/dashboard" className={navItemClass}>
                    Dashboard
                  </NavLink>
                  <NavLink to="/profile" className={navItemClass}>
                    Profile
                  </NavLink>
                  <NavLink to="/jobs" className={navItemClass}>
                    Job Recommendations
                  </NavLink>
                  <NavLink to="/training" className={navItemClass}>
                    Training
                  </NavLink>
                  <NavLink to="/assistant" className={navItemClass}>
                    AI Assistant Chat
                  </NavLink>
                  {isAdmin && (
                    <NavLink to="/admin" className={navItemClass}>
                      Admin Panel
                    </NavLink>
                  )}
                </>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated && (
            <span className="hidden text-sm text-slate-300 sm:inline">
              {user?.name || user?.email}
            </span>
          )}
          {isAuthenticated && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((current) => !current)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-cyan-400/20 text-sm font-semibold text-cyan-100 hover:bg-cyan-400/30"
                aria-label="Open profile menu"
              >
                {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 z-30 mt-2 w-44 rounded-xl border border-white/15 bg-slate-900/95 p-1 shadow-lg">
                  <NavLink
                    to="/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm text-slate-100 hover:bg-white/10"
                  >
                    Profile
                  </NavLink>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default TopNav;
