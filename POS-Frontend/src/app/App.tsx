import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { api, session } from '../auth';
import { Login } from '../components/Login';
import { PosLayout } from '../components/PosLayout';
import { BillingPage } from '../pages/BillingPage';
import { InvoicesPage } from '../pages/InvoicesPage';
import { InvoiceDetailPage } from '../pages/InvoiceDetailPage';
import { ProductsPage } from '../pages/ProductsPage';
import { ReportsPage } from '../pages/ReportsPage';
import { ReturnsPage } from '../pages/ReturnsPage';
import { SettingsPage } from '../pages/SettingsPage';
import type { PosUser } from '../types';

export function App() {
  const [user, setUser] = useState<PosUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(Boolean(session.access()));
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session.access()) {
      setCheckingSession(false);
      return;
    }

    api.get('/auth/me')
      .then(({ data }) => {
        setUser(data);
        if (location.pathname === '/' || location.pathname === '') navigate('/billing', { replace: true });
      })
      .catch(() => session.clear())
      .finally(() => setCheckingSession(false));
  }, []);

  if (checkingSession) return <main className="login"><div className="login-mark">P</div></main>;
  if (!session.access() || !user) return <Login />;

  return (
    <PosLayout user={user}>
      <Routes>
        <Route path="/billing" element={<Permitted user={user} permission="billing.view"><BillingPage user={user} /></Permitted>} />
        <Route path="/returns" element={<Permitted user={user} permission="returns.view"><ReturnsPage /></Permitted>} />
        <Route path="/products" element={<Permitted user={user} permission="products.view"><ProductsPage /></Permitted>} />
        <Route path="/invoices" element={<Permitted user={user} permission="invoices.view"><InvoicesPage /></Permitted>} />
        <Route path="/invoices/:id" element={<Permitted user={user} permission="invoices.view"><InvoiceDetailPage /></Permitted>} />
        <Route path="/reports" element={<Permitted user={user} permission="reports.view"><ReportsPage /></Permitted>} />
        <Route path="/settings" element={<Permitted user={user} permission="settings.view"><SettingsPage user={user} /></Permitted>} />
        <Route path="*" element={<Navigate to="/billing" replace />} />
      </Routes>
    </PosLayout>
  );
}

function Permitted({ user, permission, children }: { user: PosUser; permission: string; children: ReactNode }) {
  return user.permissions.includes('*') || user.permissions.includes(permission)
    ? <>{children}</>
    : <Navigate to="/billing" replace />;
}
