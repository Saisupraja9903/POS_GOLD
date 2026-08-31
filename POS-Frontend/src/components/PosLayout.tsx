import { useState, type ReactNode } from 'react';
import { ChartNoAxesCombined, FileChartColumn, LogOut, Menu, PackageSearch, ReceiptText, RotateCcw, Settings, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../auth';
import { hasPermission, hasRole, POS_ROLES, roleOf, type PosRole } from '../roleAccess';
import type { PosUser } from '../types';

export const navigation = [
  { label: 'Billing', path: '/billing', icon: ReceiptText, permission: 'billing.view', roles: [POS_ROLES.salesPerson, POS_ROLES.cashier] },
  { label: 'Products', path: '/products', icon: PackageSearch, permission: 'products.view', roles: [POS_ROLES.branchManager, POS_ROLES.salesManager, POS_ROLES.salesPerson, POS_ROLES.cashier], group: 'Products' },
  { label: 'Invoices', path: '/invoices', icon: ReceiptText, permission: 'invoices.view', roles: [POS_ROLES.branchManager, POS_ROLES.salesManager, POS_ROLES.salesPerson, POS_ROLES.cashier], group: 'Sales' },
  { label: 'Gold Exchange', path: '/exchange', icon: RotateCcw, permission: 'exchange.view', roles: [POS_ROLES.branchManager, POS_ROLES.salesManager, POS_ROLES.salesPerson, POS_ROLES.cashier], group: 'Sales' },
  { label: 'Old Gold Buyback', path: '/old-gold-buyback', icon: RotateCcw, permission: 'old_gold.view', roles: [POS_ROLES.branchManager, POS_ROLES.salesManager, POS_ROLES.salesPerson, POS_ROLES.cashier], group: 'Sales' },
  { label: 'Returns', path: '/returns', icon: RotateCcw, permission: 'returns.view', roles: [POS_ROLES.branchManager, POS_ROLES.salesManager, POS_ROLES.salesPerson, POS_ROLES.cashier], group: 'Sales' },
  { label: 'Team', path: '/team', icon: Users, permission: 'staff.view', roles: [POS_ROLES.branchManager, POS_ROLES.salesManager], group: 'Management' },
  { label: 'Reports', path: '/reports', icon: ChartNoAxesCombined, permission: 'reports.view', roles: [POS_ROLES.branchManager, POS_ROLES.salesManager, POS_ROLES.salesPerson], group: 'Management' },
  { label: 'Return Reports', path: '/return-reports', icon: FileChartColumn, permission: 'returns.view', roles: [POS_ROLES.branchManager, POS_ROLES.salesManager], group: 'Management' },
  { label: 'Settings', path: '/settings', icon: Settings, permission: 'settings.view', roles: [POS_ROLES.branchManager, POS_ROLES.salesManager, POS_ROLES.salesPerson], group: 'Management' },
] satisfies ReadonlyArray<{ label: string; path: string; icon: typeof ReceiptText; permission: string; roles: readonly PosRole[]; group?: string }>;

export function PosLayout({ user, children }: { user: PosUser; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false); const location = useLocation(); const navigate = useNavigate();
  const visibleNavigation = navigation.filter((item) => hasRole(user, item.roles) && hasPermission(user, item.permission));
  const groupedNavigation = roleOf(user) === POS_ROLES.branchManager ? ['Products', 'Sales', 'Management'].map(group => ({ group, items: visibleNavigation.filter(item => item.group === group) })).filter(section => section.items.length) : [{ group: '', items: visibleNavigation }];
  const current = visibleNavigation.find((item) => location.pathname.startsWith(item.path))?.label ?? 'POS Gold';
  async function signOut() { await logout(); window.location.assign('/pos/'); }
  return <div className={`grid min-h-screen transition-[grid-template-columns] duration-200 max-[1050px]:grid-cols-[72px_1fr] ${collapsed ? 'grid-cols-[72px_1fr]' : 'grid-cols-[232px_1fr]'}`}>
    <aside className={`fixed inset-y-0 left-0 z-10 flex flex-col border-r border-[#16251e] bg-[#16251e] px-[15px] py-[25px] text-[#dce4df] transition-[width] duration-200 max-[1050px]:w-[72px] ${collapsed ? 'w-[72px]' : 'w-[232px]'}`}>
      <div className={`flex items-center gap-[13px] pb-8 max-[1050px]:pl-0 ${collapsed ? 'pl-0' : 'px-[9px]'}`}><span className="grid size-[42px] place-items-center rounded-full border border-[#bca86b] font-['Cormorant_Garamond'] text-[28px] font-bold text-[#e7d394]">P</span><div className={`${collapsed ? 'hidden' : ''} max-[1050px]:hidden`}><b className="block font-['Cormorant_Garamond'] text-[20px] font-bold tracking-[1.5px]">POS GOLD</b><small className="text-[8px] tracking-[1.7px] text-[#7f9489]">JEWELLERY COUNTER</small></div></div>
      <nav className="grid gap-[5px]">{groupedNavigation.map(({ group, items }) => <section key={group || 'main'} className="grid gap-[5px]">{group && <small className={`${collapsed ? 'hidden' : ''} px-[14px] pt-3 text-[8px] font-bold uppercase tracking-[1.5px] text-[#7f9489] max-[1050px]:hidden`}>{group}</small>}{items.map(({ label, path, icon: Icon }) => <button key={path} className={`relative flex items-center gap-[13px] rounded-[5px] border-0 bg-transparent px-[14px] py-[13px] text-[11px] font-bold uppercase tracking-[1.2px] text-[#b8c6bf] hover:bg-[#294036] hover:text-white max-[1050px]:justify-center max-[1050px]:px-0 ${collapsed ? 'justify-center px-0' : ''} ${location.pathname.startsWith(path) ? "bg-[#294036] text-white before:absolute before:left-0 before:h-[22px] before:w-0.5 before:bg-[#d1b866] before:content-['']" : ''}`} onClick={() => navigate(path)}><Icon className="w-[18px]" /><span className={`${collapsed ? 'hidden' : ''} max-[1050px]:hidden`}>{label}</span></button>)}</section>)}</nav>
      <div className="mt-auto flex items-center gap-2 border-t border-[#294036] px-[10px] pt-[18px] text-[10px] uppercase tracking-[1px] text-[#7f9489]"><i className="size-[7px] rounded-full bg-[#5fa36d]" /><span className={`${collapsed ? 'hidden' : ''} max-[1050px]:hidden`}>Counter online</span></div>
    </aside>
    <main className="col-start-2 min-w-0"><header className="sticky top-0 z-[8] flex h-[78px] items-center border-b border-[#e7e5df] bg-white px-[27px]"><button className="mr-[18px] border-0 bg-transparent text-[#62665f]" aria-label="Toggle navigation" onClick={() => setCollapsed((value) => !value)}><Menu /></button><div><small className="text-[9px] tracking-[1.3px] text-[#82847f]">POS GOLD / {current.toUpperCase()}</small><h1 className="my-0.5 font-['Cormorant_Garamond'] text-[25px] font-bold">{current}</h1></div><div className="ml-auto flex items-center gap-4"><span className="text-right max-[760px]:hidden"><small className="block text-[9px] tracking-[1.3px] text-[#82847f]">{user.branch_name}</small><b className="block text-[12px]">{user.full_name}</b><em className="block text-[9px] not-italic text-[#82847f]">{user.employee_id ? `${user.employee_id} · ` : ''}{user.role.name}</em></span><button className="size-[37px] rounded-full border border-[#f0eee6] bg-[#f0eee6] text-[#62665f]" title="Sign out" onClick={signOut}><LogOut className="w-[15px]" /></button></div></header>{children}</main>
  </div>;
}
