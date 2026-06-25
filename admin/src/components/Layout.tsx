import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import type { ClientPrincipal } from '../types';
import { CONTENT_TYPES } from '../contentTypes';

export default function Layout({ me, children }: { me: ClientPrincipal; children: ReactNode }) {
  return (
    <div className="admin-app">
      <header className="admin-header">
        <div className="admin-brand">Content Admin</div>
        <nav className="admin-nav">
          {CONTENT_TYPES.map((t) => (
            <NavLink key={t.slug} to={`/${t.slug}`} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="admin-nav-icon" aria-hidden>{t.icon}</span>
              {t.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-user">
          <span className="admin-user-name" title={me.userDetails}>{me.userDetails}</span>
          <a className="admin-btn admin-btn-sm" href="/.auth/logout">Sign out</a>
        </div>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
