import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { apiGet, apiPost } from '../api';
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

interface Registration {
  id: string;
  attendeeName: string;
  attendeeEmail: string;
  status: 'ACTIVE' | 'CANCELLED';
  createdAt: string;
  cancelledAt: string | null;
  createdBy: { email: string; role: string } | null;
  cancelledBy: { email: string; role: string } | null;
}

const WorkshopDetailsPage = () => {
  const { id = '' } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const canRegister = user?.role === 'MANAGER' || user?.role === 'STAFF';
  const canEdit = user?.role === 'MANAGER';
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(() => {
    const state = location.state as { notice?: string } | null;
    return state?.notice ?? null;
  });

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      apiGet<{ workshop: Workshop }>(`/api/workshops/${id}`, { signal: controller.signal }),
      apiGet<{ registrations: Registration[] }>(`/api/workshops/${id}/registrations`, { signal: controller.signal }),
    ])
      .then(([workshopResponse, registrationResponse]) => {
        setWorkshop(workshopResponse.workshop);
        setRegistrations(registrationResponse.registrations);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Unable to load this workshop.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, refreshKey]);

  const refresh = () => {
    setLoading(true);
    setError(null);
    setRefreshKey((key) => key + 1);
  };

  const register = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      await apiPost(`/api/workshops/${id}/registrations`, {
        attendeeName: attendeeName.trim(),
        attendeeEmail: attendeeEmail.trim(),
      });
      setAttendeeName('');
      setAttendeeEmail('');
      setNotice('Registration saved.');
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to register attendee.');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelRegistration = async (registration: Registration) => {
    if (registration.status !== 'ACTIVE' || !window.confirm(`Cancel ${registration.attendeeName}'s registration?`)) return;
    setCancellingId(registration.id);
    setError(null);
    setNotice(null);
    try {
      await apiPost(`/api/registrations/${registration.id}/cancel`, {});
      setNotice('Registration cancelled. Its history has been retained.');
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to cancel registration.');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading && !workshop) return <main className="feedback" role="status">Loading workshop…</main>;
  if (error && !workshop) {
    return <main className="feedback feedback--error" role="alert"><p>{error}</p><button className="button button--secondary" onClick={refresh}>Retry</button></main>;
  }
  if (!workshop) return <main className="feedback">Workshop not found.</main>;

  return (
    <main className="page-content">
      <div className="page-heading">
        <div>
          <Link className="back-link" to="/workshops">← Workshops</Link>
          <p className="eyebrow">{workshop.code}</p>
          <h1>{workshop.title}</h1>
        </div>
        {canEdit && <Link className="button button--secondary" to={`/workshops/${id}/edit`}>Edit workshop</Link>}
      </div>

      {error && <div className="feedback feedback--error" role="alert">{error}</div>}
      {notice && <p className="feedback feedback--success" role="status">{notice}</p>}

      <dl className="detail-grid">
        <div><dt>Instructor</dt><dd>{workshop.instructor}</dd></div>
        <div><dt>Date and time</dt><dd>{new Date(workshop.scheduledAt).toLocaleString()}</dd></div>
        <div><dt>Status</dt><dd><span className={`status status--${workshop.status.toLowerCase()}`}>{workshop.status}</span></dd></div>
        <div><dt>Capacity</dt><dd>{workshop.capacity}</dd></div>
        <div><dt>Active registrations</dt><dd>{workshop.activeRegistrationCount}</dd></div>
        <div><dt>Remaining seats</dt><dd>{workshop.remainingSeats}</dd></div>
      </dl>

      {canRegister && (
        <section className="section-block">
          <div className="section-heading"><h2>Register attendee</h2><span>{workshop.isAvailable ? `${workshop.remainingSeats} seats available` : 'Registration unavailable'}</span></div>
          <form className="form-grid form-grid--registration" onSubmit={register}>
            <label>Attendee name<input value={attendeeName} onChange={(event) => setAttendeeName(event.target.value)} required maxLength={160} disabled={!workshop.isAvailable || submitting} /></label>
            <label>Attendee email<input type="email" value={attendeeEmail} onChange={(event) => setAttendeeEmail(event.target.value)} required maxLength={254} disabled={!workshop.isAvailable || submitting} /></label>
            <button className="button" type="submit" disabled={!workshop.isAvailable || submitting}>{submitting ? 'Saving…' : 'Register'}</button>
          </form>
        </section>
      )}

      <section className="section-block">
        <div className="section-heading"><h2>Registration history</h2><button className="button button--quiet" type="button" onClick={refresh} disabled={loading}>Refresh</button></div>
        {loading && <p role="status">Updating registration history…</p>}
        {!loading && registrations.length === 0 && <p className="feedback">No registrations yet.</p>}
        {registrations.length > 0 && (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Attendee</th><th>Email</th><th>Status</th><th>Registered</th><th>Cancelled</th><th>Recorded by</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {registrations.map((registration) => (
                  <tr key={registration.id}>
                    <td>{registration.attendeeName}</td>
                    <td>{registration.attendeeEmail}</td>
                    <td><span className={`status status--${registration.status.toLowerCase()}`}>{registration.status}</span></td>
                    <td>{new Date(registration.createdAt).toLocaleString()}</td>
                    <td>{registration.cancelledAt ? new Date(registration.cancelledAt).toLocaleString() : '—'}</td>
                    <td>{registration.createdBy?.email ?? '—'}</td>
                    <td>
                      {canRegister && registration.status === 'ACTIVE' && (
                        <button className="button button--danger" type="button" onClick={() => void cancelRegistration(registration)} disabled={cancellingId !== null}>
                          {cancellingId === registration.id ? 'Cancelling…' : 'Cancel'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
};

export default WorkshopDetailsPage;