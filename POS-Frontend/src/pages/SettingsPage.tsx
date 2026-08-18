import { LogOut } from 'lucide-react';
import { logout } from '../auth';
import { Page } from '../components/Page';
import type { PosUser } from '../types';
import '../styles/settings.css';

export function SettingsPage({ user }: { user: PosUser }) {
  async function signOut() {
    await logout();
    location.assign('/pos/');
  }

  return (
    <Page title="Counter settings" subtitle="Session and branch context for this POS terminal.">
      <div className="settings-card">
        <div className="avatar">{user.full_name[0]}</div>
        <h2>{user.full_name}</h2><p>{user.role.name}</p>
        <dl><dt>Business</dt><dd>{user.business_name}</dd><dt>Branch</dt><dd>{user.branch_name}</dd><dt>Email</dt><dd>{user.email}</dd><dt>Session storage</dt><dd>Encrypted token transport · refresh rotation</dd></dl>
        <section className="my-access"><h3>My access</h3><p>Role: {user.role.name}</p><p>Branch: {user.branch_name}</p><ul>{user.permissions.includes('*') ? <li>Full access</li> : user.permissions.map(permission => <li key={permission}>{permission}</li>)}</ul></section>
        <button onClick={signOut}><LogOut /> Sign out</button>
      </div>
    </Page>
  );
}
