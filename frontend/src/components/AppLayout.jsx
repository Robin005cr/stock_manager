import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearSession, getSessionUser } from '../api/auth';
import ThemeToggle from './ThemeToggle';

const adminNavItems = [
  { to: '/', label: 'Update record', icon: '✎', end: true },
  { to: '/transport-movement', label: 'Transport movement', icon: '↗' },
  { to: '/stock-booking', label: 'Stock booking', icon: '▤' },
  { to: '/meta-details', label: 'Add meta details', icon: '▣' },
];

const sharedNavItems = [
  { to: '/search', label: 'Search inventory', icon: '⌕' },
  { to: '/pinned-products', label: 'Pinned Products', icon: '📌' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const user = getSessionUser();
  const navItems = user?.role === 'admin' ? [...adminNavItems, ...sharedNavItems] : sharedNavItems;

  function handleLogout() {
    clearSession();
    navigate('/login', { viewTransition: true });
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Main navigation">
        <div className="app-brand">
          <div className="app-brand-icon" aria-hidden="true">
            SM
          </div>
          <div>
            <div className="app-brand-text">Stock Manager</div>
            <div className="app-brand-sub">Inventory control</div>
          </div>
        </div>
        <nav className="app-nav">
          {navItems.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              viewTransition
              className={({ isActive }) => `app-nav-link${isActive ? ' active' : ''}`}
            >
              <span className="app-nav-icon" aria-hidden="true">
                {icon}
              </span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="app-sidebar-footer">Warehouse ops · v1.0</div>
      </aside>
      <div className="app-main">
        <div className="top-bar">
          <ThemeToggle />
          <button type="button" className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
