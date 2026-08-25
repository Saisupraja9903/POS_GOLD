import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { api, session } from '../auth';
import { Login } from '../components/Login';
import { PosLayout } from '../components/PosLayout';
import { BillingPage } from '../pages/BillingPage';
import { InvoicesPage } from '../pages/InvoicesPage';
import { InvoiceDetailPage } from '../pages/InvoiceDetailPage';
import { ProductsPage } from '../pages/ProductsPage';
import { BranchProductsPage } from '../pages/BranchProductsPage';
import { TeamPage } from '../pages/TeamPage';
import { ReturnReportsPage } from '../pages/ReturnReportsPage';
import { ReportsPage } from '../pages/ReportsPage';
import { ReturnsPage } from '../pages/ReturnsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { GoldExchangePage } from '../pages/GoldExchangePage';
import { hasPermission, hasRole, homeFor, POS_ROLES, roleOf, type PosRole } from '../roleAccess';
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
        if (location.pathname === '/' || location.pathname === '') navigate(homeFor(data), { replace: true });
      })
      .catch(() => session.clear())
      .finally(() => setCheckingSession(false));
  }, []);

  if (checkingSession) return <main className="login"><div className="login-mark">P</div></main>;
  if (!session.access() || !user) return <Login />;

  return (
    <PosLayout user={user}>
      <Routes>
        <Route path="/dashboard" element={<Navigate to={homeFor(user)} replace />} />
        <Route path="/billing" element={!([POS_ROLES.salesPerson, POS_ROLES.cashier] as const).includes(roleOf(user) as any) ? <Navigate to={homeFor(user)} replace /> : <Permitted user={user} permission="billing.view" roles={[POS_ROLES.salesPerson, POS_ROLES.cashier]}><BillingPage user={user} /></Permitted>} />
        <Route path="/returns" element={<Permitted user={user} permission="returns.view" roles={ALL_POS_ROLES}><ReturnsPage canCreate={[POS_ROLES.salesPerson, POS_ROLES.cashier].includes(roleOf(user) as any)} /></Permitted>} />
        <Route path="/exchange" element={<Permitted user={user} permission="exchange.view" roles={ALL_POS_ROLES}><GoldExchangePage /></Permitted>} />
        <Route path="/products" element={<Permitted user={user} permission="products.view" roles={ALL_POS_ROLES}>{roleOf(user) === POS_ROLES.branchManager ? <BranchProductsPage /> : roleOf(user) === POS_ROLES.salesManager ? <div className="sales-manager-products-font"><ProductsPage canAddToBill={false} /></div> : <ProductsPage canAddToBill />}</Permitted>} />
        <Route path="/invoices" element={<Permitted user={user} permission="invoices.view" roles={ALL_POS_ROLES}><InvoicesPage /></Permitted>} />
        <Route path="/invoices/:id" element={<Permitted user={user} permission="invoices.view" roles={ALL_POS_ROLES}><InvoiceDetailPage /></Permitted>} />
        <Route path="/team" element={<Permitted user={user} permission="staff.view" roles={[POS_ROLES.branchManager, POS_ROLES.salesManager]}>{roleOf(user) === POS_ROLES.branchManager ? <div className="branch-team-font"><TeamPage user={user} /></div> : <TeamPage user={user} />}</Permitted>} />
        <Route path="/reports" element={<Permitted user={user} permission="reports.view" roles={ALL_POS_ROLES}><ReportsPage /></Permitted>} />
        <Route path="/return-reports" element={<Permitted user={user} permission="returns.view" roles={[POS_ROLES.branchManager, POS_ROLES.salesManager]}><div className="return-reports-number-size"><ReturnReportsPage /></div></Permitted>} />
        <Route path="/settings" element={<Permitted user={user} permission="settings.view" roles={ALL_POS_ROLES}><SettingsPage user={user} /></Permitted>} />
        <Route path="*" element={<Navigate to={homeFor(user)} replace />} />
      </Routes>
    </PosLayout>
  );
}

const ALL_POS_ROLES = [POS_ROLES.branchManager, POS_ROLES.salesManager, POS_ROLES.salesPerson, POS_ROLES.cashier] as const;

function Permitted({ user, permission, roles, children }: { user: PosUser; permission: string; roles: readonly PosRole[]; children: ReactNode }) {
  if (hasRole(user, roles) && hasPermission(user, permission)) return <>{children}</>;

  return <main className="grid min-h-[calc(100vh-78px)] place-items-center bg-[#f7f6f1] p-6 text-center">
    <section className="max-w-[460px] rounded-lg border border-[#e7e4dc] bg-white p-10 shadow-sm">
      <small className="tracking-[1.8px] text-[#b39748]">ACCESS RESTRICTED</small>
      <h2 className="font-['Cormorant_Garamond'] text-[32px]">This screen is not available for your role</h2>
      <p className="text-[12px] leading-6 text-[#74756f]">Signed in as {user.role.name}. Your POS administrator controls screen access.</p>
      <a className="mt-4 inline-block rounded-md bg-[#c1a552] px-5 py-3 text-[11px] font-bold uppercase tracking-[1px] text-[#18251f] no-underline" href={homeFor(user)}>Go to my home</a>
    </section>
  </main>;
}
