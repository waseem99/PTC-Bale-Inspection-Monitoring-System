import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, runtime } from '../api';
import { useAuth } from '../auth';
import { Icon } from '../components';
import { ptcLogoDataUri } from '../logo';
import { navigate, useRouter } from '../router';

function safeAuthenticatedTarget(returnTo: string | null): string {
  return returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/overview';
}

type ApiReadiness = 'checking' | 'ready' | 'unavailable' | 'skipped';

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const { searchParams } = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [apiReadiness, setApiReadiness] = useState<ApiReadiness>(() => runtime.dataMode === 'mock' ? 'skipped' : 'checking');
  const returnTo = searchParams.get('returnTo');
  const authenticatedTarget = safeAuthenticatedTarget(returnTo);

  useEffect(() => { if (isAuthenticated) navigate(authenticatedTarget, { replace: true }); }, [authenticatedTarget, isAuthenticated]);

  useEffect(() => {
    if (runtime.dataMode === 'mock') return;
    let active = true;
    let controller: AbortController | undefined;

    const check = () => {
      controller?.abort();
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 4_000);
      void fetch('/readyz', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = await response.json().catch(() => null) as { status?: unknown; database?: unknown } | null;
          const ready = response.ok && payload?.status === 'ready' && payload.database === 'connected';
          if (active) setApiReadiness(ready ? 'ready' : 'unavailable');
        })
        .catch(() => {
          if (active) setApiReadiness('unavailable');
        })
        .finally(() => window.clearTimeout(timeout));
    };

    check();
    const interval = window.setInterval(check, 5_000);
    return () => {
      active = false;
      window.clearInterval(interval);
      controller?.abort();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (isSubmitting) return; setError('');
    if (!username.trim() || !password) { setError('Enter both username and password.'); return; }
    setSubmitting(true);
    try { await login(username.trim(), password); }
    catch (loginError) {
      if (loginError instanceof ApiError && loginError.code === 'REQUEST_TIMEOUT') {
        setError(apiReadiness === 'unavailable'
          ? 'The API or database is not ready. Please check the server and retry.'
          : 'The login API did not respond in time. Please retry or check server connectivity.');
      } else {
        setError(loginError instanceof ApiError ? loginError.message : 'Sign-in could not be completed.');
      }
    }
    finally { setSubmitting(false); }
  }

  return <main className="login-page">
    <section className="login-panel" aria-labelledby="login-title">
      <div className="login-brand"><img src={ptcLogoDataUri} alt="PTC" /></div>
      <div className="login-copy">
        <span className="eyebrow">Bale Inspection & Monitoring</span>
        <h1 id="login-title">Sign in</h1>
        <p>Access live monitoring, inspection evidence, review workflows and system health.</p>
      </div>
      <form className="login-form" onSubmit={(event) => void submit(event)} noValidate>
        <div><label htmlFor="username">Username</label><input id="username" name="username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" inputMode="text" disabled={isSubmitting} required autoFocus /></div>
        <div><label htmlFor="password">Password</label><div className="password-field"><input id="password" name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" disabled={isSubmitting} required /><button type="button" className="password-toggle" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Hide password' : 'Show password'}><Icon name={showPassword ? 'eyeOff' : 'eye'} size={20} /></button></div></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {apiReadiness === 'unavailable' && !error && <p className="form-error" role="status">Platform API is unavailable. Confirm the API and database are running.</p>}
        <button className="button button--primary button--wide" type="submit" disabled={isSubmitting || apiReadiness === 'unavailable'}>{isSubmitting ? 'Signing in…' : 'Sign in'} <Icon name="arrow" size={18} /></button>
      </form>
    </section>
    <aside className="login-visual" aria-hidden="true">
      <div className="visual-grid"/>
      <div className="visual-ring visual-ring--one"/>
      <div className="visual-ring visual-ring--two"/>
      <div className="login-visual__copy">
        <strong>Operational monitoring</strong>
        <span>Four-camera inspection visibility for PTC.</span>
      </div>
    </aside>
  </main>;
}
