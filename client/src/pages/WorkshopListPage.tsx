import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../api';
import { useAuth } from '../auth-context';

interface Workshop {
  id: string;
  code: string;
  title: string;
  instructor: string;
  scheduledAt: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  capacity: number;
  activeRegistrationCount: number;
  remainingSeats: number;
  isAvailable: boolean;
}

const WorkshopListPage = () => {
  const { user } = useAuth();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [filters, setFilters] = useState({ from: '', to: '', status: '', availableOnly: false });

  const query = new URLSearchParams();
  if (filters.from) query.set('from', new Date(`${filters.from}T00:00:00`).toISOString());
  if (filters.to) query.set('to', new Date(`${filters.to}T23:59:59.999`).toISOString());
  if (filters.status) query.set('status', filters.status);
  if (filters.availableOnly) query.set('availableOnly', 'true');
  const queryString = query.toString();

  useEffect(() => {
    const controller = new AbortController();
    const suffix = queryString ? `?${queryString}` : '';

    apiGet<{ workshops: Workshop[] }>(`/api/workshops${suffix}`, { signal: controller.signal })
      .then((response) => {
        setWorkshops(response.workshops);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Unable to load workshops.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [queryString, reloadKey]);

  const changeFilters = (next: Partial<typeof filters>) => {
    setLoading(true);
    setError(null);
    setFilters((current) => ({ ...current, ...next }));
  };

  const refresh = () => {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  };

  return (
    <main className="page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Workshop registry</p>
          <h1>Workshops</h1>
        </div>
        <div className="button-row">
          <button className="button button--secondary" type="button" onClick={refresh} disabled={loading}>
            Refresh
          </button>
          {user?.role === 'MANAGER' && (
            <Link className="button" to="/workshops/new">Create workshop</Link>
          )}
        </div>
      </div>

      <form className="filter-bar" aria-label="Filter workshops" onSubmit={(event) => event.preventDefault()}>
        <label>
          From
          <input type="date" value={filters.from} onChange={(event) => changeFilters({ from: event.target.value })} />
        </label>
        <label>
          To
          <input type="date" value={filters.to} min={filters.from || undefined} onChange={(event) => changeFilters({ to: event.target.value })} />
        </label>
        <label>
          Status
          <select value={filters.status} onChange={(event) => changeFilters({ status: event.target.value })}>
            <option value="">All statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={filters.availableOnly}
            onChange={(event) => changeFilters({ availableOnly: event.target.checked })}
          />
          Available seats only
        </label>
      </form>

      {loading && <p className="feedback" role="status">Loading workshops…</p>}
      {error && (
        <div className="feedback feedback--error" role="alert">
          <p>{error}</p>
          <button className="button button--secondary" type="button" onClick={refresh}>Retry</button>
        </div>
      )}
      {!loading && !error && workshops.length === 0 && (
        <p className="feedback">No workshops match these filters.</p>
      )}
      {!error && workshops.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Workshop</th>
                <th scope="col">Instructor</th>
                <th scope="col">Scheduled</th>
                <th scope="col">Status</th>
                <th scope="col">Capacity</th>
                <th scope="col">Active</th>
                <th scope="col">Remaining</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {workshops.map((workshop) => (
                <tr key={workshop.id}>
                  <td>{workshop.code}</td>
                  <td>{workshop.title}</td>
                  <td>{workshop.instructor}</td>
                  <td>{new Date(workshop.scheduledAt).toLocaleString()}</td>
                  <td><span className={`status status--${workshop.status.toLowerCase()}`}>{workshop.status}</span></td>
                  <td>{workshop.capacity}</td>
                  <td>{workshop.activeRegistrationCount}</td>
                  <td>
                    <span className={workshop.isAvailable ? 'seats seats--open' : 'seats seats--full'}>
                      {workshop.remainingSeats}
                    </span>
                  </td>
                  <td><Link className="text-link" to={`/workshops/${workshop.id}`}>Details</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
};

export default WorkshopListPage;
