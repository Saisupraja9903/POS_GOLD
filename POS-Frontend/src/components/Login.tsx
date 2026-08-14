import { useState } from 'react';
import { login, message } from '../auth';
import '../styles/login.css';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      location.assign('/pos/billing');
    } catch (reason) {
      setError(message(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <form onSubmit={submit}>
        <div className="login-mark">P</div>
        <small>POS GOLD</small>
        <h1>Welcome back</h1>
        <p>Sign in to open your retail counter.</p>
        <label>Email or employee ID<input aria-label="Email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input aria-label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <div className="error" role="alert">{error}</div>}
        <button disabled={busy}>{busy ? 'Opening counter…' : 'Sign in'}</button>
      </form>
    </main>
  );
}
