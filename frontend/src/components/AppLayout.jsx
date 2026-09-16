import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Update record', icon: '✎', end: true },
  { to: '/search', label: 'Search inventory', icon: '⌕' },
  { to: '/login', label: 'Sign in', icon: '◉' },
];

export default function AppLayout() {
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
        <Outlet />
      </div>
    </div>
  );
}
