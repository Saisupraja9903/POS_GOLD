import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { login, message } from '../auth';
import '../styles/login.css';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        <label>Email or employee ID<input aria-label="Email or employee ID" type="text" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<div className="password-field"><input aria-label="Password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /><button type="button" className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>
        {error && <div className="error" role="alert">{error}</div>}
        <button disabled={busy}>{busy ? 'Opening counter…' : 'Sign in'}</button>
      </form>
    </main>
  );
}
