import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import type { ClientPrincipal } from './types';
import { getMe } from './api';
import { CONTENT_TYPES } from './contentTypes';
import Layout from './components/Layout';
import ContentManager from './components/ContentManager';

export default function App() {
  const [me, setMe] = useState<ClientPrincipal | null | undefined>(undefined);

  useEffect(() => {
    getMe().then(setMe);
  }, []);

  if (me === undefined) {
    return <div className="admin-center">Loading…</div>;
  }

  if (!me) {
    return <SignIn />;
  }

  if (!me.userRoles?.includes('admin')) {
    return <NotAuthorized me={me} />;
  }

  return (
    <Layout me={me}>
      <Routes>
        <Route path="/" element={<Navigate to={`/${CONTENT_TYPES[0].slug}`} replace />} />
        {CONTENT_TYPES.map((t) => (
          <Route key={t.slug} path={`/${t.slug}`} element={<ContentManager type={t} />} />
        ))}
        <Route path="*" element={<Navigate to={`/${CONTENT_TYPES[0].slug}`} replace />} />
      </Routes>
    </Layout>
  );
}

function SignIn() {
  return (
    <div className="admin-center">
      <div className="admin-card">
        <h1>Content Admin</h1>
        <p>Sign in with your Microsoft account to manage site content.</p>
        <a className="admin-btn admin-btn-primary" href="/.auth/login/aad?post_login_redirect_uri=/admin/">
          Sign in with Microsoft
        </a>
      </div>
    </div>
  );
}

function NotAuthorized({ me }: { me: ClientPrincipal }) {
  return (
    <div className="admin-center">
      <div className="admin-card">
        <h1>Access denied</h1>
        <p>
          Your account (<strong>{me.userDetails}</strong>) is not authorized for content administration.
        </p>
        <a className="admin-btn" href="/.auth/logout">Sign out</a>
      </div>
    </div>
  );
}
