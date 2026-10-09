import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';

export const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink className="brand" to="/workshops">Workshop Registry</NavLink>
        <nav className="main-nav" aria-label="Main navigation">
          <NavLink to="/workshops">Workshops</NavLink>
          {user?.role === 'ADMIN' && <NavLink to="/admin/users">Users</NavLink>}
        </nav>
        <div className="user-menu">
          <span className="user-identity">
            <strong>{user?.email}</strong>
            <span>{user?.role}</span>
          </span>
          <button className="button button--quiet" type="button" onClick={signOut}>Sign out</button>
        </div>
      </header>
      <div className="content-wrap"><Outlet /></div>
    </div>
  );
};