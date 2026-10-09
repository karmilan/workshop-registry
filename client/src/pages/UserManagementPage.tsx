import { useEffect, useState, type FormEvent } from 'react';
import { apiGet, apiPost } from '../api';

interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
  createdAt: string;
}

const UserManagementPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<User['role']>('STAFF');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    apiGet<{ users: User[] }>('/api/users', { signal: controller.signal })
      .then(({ users: responseUsers }) => {
        setUsers(responseUsers);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Unable to load users.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reloadKey]);

  const refresh = () => {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  };

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await apiPost<{ user: User }>('/api/users', { email: email.trim(), password, role });
      setEmail('');
      setPassword('');
      setNotice('User account created.');
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page-content">
      <div className="page-heading">
        <div><p className="eyebrow">Administration</p><h1>User management</h1></div>
        <button className="button button--secondary" type="button" onClick={refresh} disabled={loading}>Refresh</button>
      </div>
      {error && <div className="feedback feedback--error" role="alert">{error}<button className="button button--secondary" type="button" onClick={refresh}>Retry</button></div>}
      {notice && <p className="feedback feedback--success" role="status">{notice}</p>}

      <section className="section-block">
        <h2>Create account</h2>
        <form className="form-grid form-grid--user" onSubmit={createUser}>
          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} disabled={saving} /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} disabled={saving} /></label>
          <label>Role<select value={role} onChange={(event) => setRole(event.target.value as User['role'])} disabled={saving}>
            <option value="ADMIN">Admin</option><option value="MANAGER">Manager</option><option value="STAFF">Staff</option>
          </select></label>
          <button className="button" type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create user'}</button>
        </form>
      </section>

      <section className="section-block">
        <div className="section-heading"><h2>Accounts</h2>{loading && <span role="status">Loading…</span>}</div>
        {!loading && !error && users.length === 0 && <p className="feedback">No user accounts found.</p>}
        {users.length > 0 && (
          <div className="table-scroll"><table className="data-table">
            <thead><tr><th>Email</th><th>Role</th><th>Created</th></tr></thead>
            <tbody>{users.map((account) => <tr key={account.id}><td>{account.email}</td><td>{account.role}</td><td>{new Date(account.createdAt).toLocaleString()}</td></tr>)}</tbody>
          </table></div>
        )}
      </section>
    </main>
  );
};

export default UserManagementPage;