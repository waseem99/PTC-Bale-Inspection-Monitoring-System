import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiError, runtime } from '../api';
import { getDemoCredentials, useAuth } from '../auth';
import { Icon, StatusPill } from '../components';
import { ptcLogoDataUri } from '../logo';
import { navigate, useRouter } from '../router';

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const { searchParams } = useRouter();
  const credentials = useMemo(() => getDemoCredentials(), []);
  const [username, setUsername] = useState(credentials?.username ?? '');
  const [password, setPassword] = useState(credentials?.password ?? '');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const returnTo = searchParams.get('returnTo');

  useEffect(() => { if (isAuthenticated) navigate(returnTo?.startsWith('/') ? returnTo : '/overview', { replace: true }); }, [isAuthenticated, returnTo]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (isSubmitting) return; setError('');
    if (!username.trim() || !password) { setError('Enter both username and password.'); return; }
    setSubmitting(true);
    try { await login(username.trim(), password); navigate(returnTo?.startsWith('/') ? returnTo : '/overview', { replace: true }); }
    catch (loginError) { setError(loginError instanceof ApiError ? loginError.message : 'Sign-in could not be completed.'); }
    finally { setSubmitting(false); }
  }

  return <main className="login-page">
    <section className="login-panel" aria-labelledby="login-title">
      <div className="login-brand"><img src={ptcLogoDataUri} alt="PTC" /></div>
      <div className="login-copy"><span className="eyebrow">Bale Inspection & Monitoring</span><h1 id="login-title">Operational visibility for every inspection.</h1><p>Secure supervisor access to live monitoring, inspection evidence, review workflows and system health.</p><div className="login-state-row"><StatusPill label={runtime.dataMode === 'mock' ? 'Mock data provider' : 'Connected API'} tone={runtime.dataMode === 'mock' ? 'info' : 'good'} /><StatusPill label={runtime.environmentName} tone="neutral" /></div></div>
      <form className="login-form" onSubmit={(event) => void submit(event)} noValidate>
        <div><label htmlFor="username">Username</label><input id="username" name="username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" inputMode="text" disabled={isSubmitting} required autoFocus /></div>
        <div><label htmlFor="password">Password</label><div className="password-field"><input id="password" name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" disabled={isSubmitting} required /><button type="button" className="password-toggle" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Hide password' : 'Show password'}><Icon name={showPassword ? 'eyeOff' : 'eye'} size={20} /></button></div></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button--primary button--wide" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'} <Icon name="arrow" size={18} /></button>
        {credentials && <div className="demo-credentials" role="note"><strong>Demo access</strong><span>Username: {credentials.username}</span><span>Password: {credentials.password}</span></div>}
        <p className="form-note">The mock provider uses production screen flows and contracts. Real API credentials replace this provider without changing the interface.</p>
      </form>
    </section>
    <aside className="login-visual" aria-hidden="true"><div className="visual-grid"/><div className="visual-ring visual-ring--one"/><div className="visual-ring visual-ring--two"/><div className="visual-bale visual-bale--one"/><div className="visual-bale visual-bale--two"/><div className="visual-scan-line"/><div className="visual-label">AI MONITORING ACTIVE</div></aside>
  </main>;
}
