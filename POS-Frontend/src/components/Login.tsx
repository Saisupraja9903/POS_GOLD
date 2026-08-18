import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { login, message } from '../auth';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try { await login(email, password); location.assign('/pos/billing'); }
    catch (reason) { setError(message(reason)); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen grid place-items-center bg-[radial-gradient(circle_at_20%_10%,#385345,#13231b)]">
    <form className="w-[390px] max-w-[calc(100vw-32px)] rounded-xl border border-[#e7e4dc] bg-white p-10 text-[#20231f] shadow-[0_25px_80px_#0005]" onSubmit={submit}>
      <div className="mb-[18px] grid size-[42px] place-items-center rounded-full border border-[#bca86b] bg-[#1b3026] font-['Cormorant_Garamond'] text-[28px] font-bold text-[#e7d394]">P</div>
      <small className="tracking-[2px] text-[#b79b4b]">POS GOLD</small>
      <h1 className="my-[12px] mb-1 font-['Cormorant_Garamond'] text-[34px] font-bold">Welcome back</h1>
      <p className="mb-[25px] text-[11px] text-[#74756f]">Sign in to open your retail counter.</p>
      <label className="my-[13px] block text-[10px] text-[#30352f]">Email or employee ID<input className="mt-[7px] block w-full border border-[#ddd8cc] bg-white p-3 text-[#20231f] outline-none focus:outline-2 focus:outline-[#c1a552] focus:outline-offset-1" aria-label="Email or employee ID" type="text" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label className="my-[13px] block text-[10px] text-[#30352f]">Password<div className="relative flex items-center"><input className="mt-[7px] block w-full border border-[#ddd8cc] bg-white p-3 pr-[46px] text-[#20231f] outline-none focus:outline-2 focus:outline-[#c1a552] focus:outline-offset-1" aria-label="Password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /><button type="button" className="absolute right-1 grid size-[38px] place-items-center border-0 bg-transparent p-0 text-inherit" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}</button></div></label>
      {error && <div className="text-[#a22]" role="alert">{error}</div>}
      <button className="mt-[15px] w-full rounded-md border-0 bg-[#c1a552] p-[13px] font-extrabold text-[#18251f] disabled:cursor-wait disabled:opacity-65" disabled={busy}>{busy ? 'Opening counter…' : 'Sign in'}</button>
    </form>
  </main>;
}
