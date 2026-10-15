import { NavLink, Link, Outlet } from 'react-router-dom';
import { Boxes, FolderOpen, Home, Settings as SettingsIcon } from 'lucide-react';
import { useSettings } from '../lib/settings';

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#202027" />
      <path d="M11.5 8h9l5 17h-19z" fill="#8E7CFF" opacity=".42" />
      <rect x="10" y="6" width="12" height="3" rx="1.5" fill="#EDEAE3" />
      <rect x="6" y="23.5" width="20" height="2.5" rx="1.25" fill="#EDEAE3" />
    </svg>
  );
}

const NAV = [
  { to: '/', label: 'Accueil', icon: Home, end: true },
  { to: '/projets', label: 'Mes projets', icon: FolderOpen },
  { to: '/materiel', label: 'Mon matériel', icon: Boxes },
  { to: '/parametres', label: 'Paramètres', icon: SettingsIcon },
];

export function Layout() {
  const { settings } = useSettings();
  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Régie, accueil">
          <Logo />
          <span className="brand-name">Régie</span>
          {settings.agencyName && <span className="brand-agency">{settings.agencyName}</span>}
        </Link>
        <nav className="nav" aria-label="Navigation principale">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} title={label}>
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
