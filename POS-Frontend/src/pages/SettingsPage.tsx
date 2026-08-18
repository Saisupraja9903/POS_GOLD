import { LogOut } from 'lucide-react';
import { logout } from '../auth';
import { Page } from '../components/Page';
import type { PosUser } from '../types';

export function SettingsPage({ user }: { user: PosUser }) {
  async function signOut() { await logout(); location.assign('/pos/'); }
  const has = (permission: string) => user.permissions.includes('*') || user.permissions.includes(permission);
  const access = [
    ['Billing', ['billing.view', 'billing.create', 'billing.cart', 'billing.quantity_edit', 'billing.wastage_edit', 'billing.checkout', 'billing.payment']],
    ['Invoices', ['invoices.view', 'invoices.print', 'invoices.download']],
    ['Returns', ['returns.view', 'returns.create', 'returns.approve']],
    ['Reports', ['reports.own', 'reports.team', 'reports.branch']],
    ['Staff', ['staff.view', 'staff.create', 'staff.edit', 'staff.disable']],
  ];
  return <Page title="Counter settings" subtitle="Session and branch context for this POS terminal.">
    {/* Permission checklist intentionally removed from the user-facing settings page.
    <div className="mt-[18px] max-w-[580px] border border-[#e7e4dc] bg-white p-6"><div className="grid size-[55px] place-items-center border border-[#b39748] font-['Cormorant_Garamond'] text-[25px] font-bold text-[#d5b85b]">{user.full_name[0]}</div><h2 className="mb-[3px]">{user.full_name}</h2><p className="text-[#82847f]">{user.role.name}</p><dl className="grid grid-cols-[140px_1fr] border-t border-[#e7e5df] pt-[15px] text-[11px]"><dt className="text-[#82847f]">Employee ID</dt><dd className="mb-[13px] overflow-wrap-anywhere">{user.employee_id || '—'}</dd><dt className="text-[#82847f]">Branch</dt><dd className="mb-[13px] overflow-wrap-anywhere">{user.branch_name}</dd><dt className="text-[#82847f]">Email</dt><dd className="mb-[13px] overflow-wrap-anywhere">{user.email}</dd></dl><section><h3>My access</h3>{access.map(([module, permissions]) => <div key={module as string} className="mb-3"><b>{module as string}</b><ul>{(permissions as string[]).map(permission => <li key={permission}>{has(permission) ? '✓' : '×'} {permission.replace(/^[^.]+\./, '').replaceAll('_', ' ')}</li>)}</ul></div>)}</section><button className="flex gap-[7px] border-0 bg-[#c1a552] px-[14px] py-[10px] text-[#18251f]" onClick={signOut}><LogOut className="w-4" /> Sign out</button></div>
    */}
    <div className="mt-[18px] max-w-[580px] border border-[#e7e4dc] bg-white p-6">
      <div className="grid size-[55px] place-items-center border border-[#b39748] font-['Cormorant_Garamond'] text-[25px] font-bold text-[#d5b85b]">{user.full_name[0]}</div>
      <h2 className="mb-[3px]">{user.full_name}</h2><p className="text-[#82847f]">{user.role.name}</p>
      <dl className="grid grid-cols-[140px_1fr] border-t border-[#e7e5df] pt-[15px] text-[11px]"><dt className="text-[#82847f]">Employee ID</dt><dd className="mb-[13px] overflow-wrap-anywhere">{user.employee_id || '—'}</dd><dt className="text-[#82847f]">Branch</dt><dd className="mb-[13px] overflow-wrap-anywhere">{user.branch_name}</dd><dt className="text-[#82847f]">Email</dt><dd className="mb-[13px] overflow-wrap-anywhere">{user.email}</dd></dl>
      <button className="flex gap-[7px] border-0 bg-[#c1a552] px-[14px] py-[10px] text-[#18251f]" onClick={signOut}><LogOut className="w-4" /> Sign out</button>
    </div>
  </Page>;
}
