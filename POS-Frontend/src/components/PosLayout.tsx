import { useState, type ReactNode } from 'react';
import { ChartNoAxesCombined, LogOut, Menu, PackageSearch, ReceiptText, RotateCcw, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../auth';
import type { PosUser } from '../types';
import '../styles/layout.css';

export const navigation = [
  { label: 'Billing', path: '/billing', icon: ReceiptText, permission: 'billing.view' },
  { label: 'Returns', path: '/returns', icon: RotateCcw, permission: 'returns.view' },
  { label: 'Products', path: '/products', icon: PackageSearch, permission: 'products.view' },
  { label: 'Invoices', path: '/invoices', icon: ReceiptText, permission: 'invoices.view' },
  { label: 'Reports', path: '/reports', icon: ChartNoAxesCombined, permission: 'reports.view' },
  { label: 'Settings', path: '/settings', icon: Settings, permission: 'settings.view' },
] as const;

export function PosLayout({ user, children }: { user: PosUser; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const allowed = (permission: string) => user.permissions.includes('*') || user.permissions.includes(permission);
  const visibleNavigation = navigation.filter((item) => allowed(item.permission));
  const current = visibleNavigation.find((item) => location.pathname.startsWith(item.path))?.label ?? 'Billing';

  async function signOut() {
    await logout();
    window.location.assign('/pos/');
  }

  return (
    <div className={`pos-shell ${collapsed ? 'collapsed' : ''}`}>
      <aside className="side">
        <div className="pos-brand"><span>P</span><div><b>POS GOLD</b><small>JEWELLERY COUNTER</small></div></div>
        <nav>
          {visibleNavigation.map(({ label, path, icon: Icon }) => (
            <button key={path} className={location.pathname.startsWith(path) ? 'active' : ''} onClick={() => navigate(path)}>
              <Icon /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="side-foot"><i /><span>Counter online</span></div>
      </aside>
      <main className="workspace">
        <header>
          <button className="menu" aria-label="Toggle navigation" onClick={() => setCollapsed((value) => !value)}><Menu /></button>
          <div><small>POS GOLD / {current.toUpperCase()}</small><h1>{current}</h1></div>
          <div className="identity">
            <span><small>{user.branch_name}</small><b>{user.full_name}</b><em>{user.employee_id ? `${user.employee_id} · ` : ''}{user.role.name}</em></span>
            <button title="Sign out" onClick={signOut}><LogOut /></button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
