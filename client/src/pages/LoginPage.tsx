/* src/pages/LoginPage.tsx */
import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';

interface LocationState {
  from?: { pathname: string };
}

const LoginPage = () => {
  const { login, loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) || {};
  const redirectPath = state.from?.pathname || '/workshops';

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && !loading) navigate(redirectPath, { replace: true });
  }, [loading, navigate, redirectPath, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setError(null);
    try {
      await login(email.trim(), password);
      navigate(redirectPath, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in.');
    }
  };

  return (
    <main className="login-shell">
      <section className="login-panel">
        <p className="eyebrow">Workshop Registry</p>
        <h1>Sign in</h1>
        <form className="stacked-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="email">Email
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          </label>
          <label htmlFor="password">Password
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          </label>
          {error && <p className="feedback feedback--error" role="alert">{error}</p>}
          <button className="button" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
};

export default LoginPage;
