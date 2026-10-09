import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiGet, apiPatch, apiPost } from '../api';

interface WorkshopFormData {
  code: string;
  title: string;
  instructor: string;
  scheduledAt: string;
  capacity: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
}

interface Workshop extends Omit<WorkshopFormData, 'capacity' | 'scheduledAt'> {
  id: string;
  capacity: number;
  scheduledAt: string;
}

const blankForm: WorkshopFormData = {
  code: '',
  title: '',
  instructor: '',
  scheduledAt: '',
  capacity: '',
  status: 'SCHEDULED',
};

const toLocalDateTime = (value: string) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const WorkshopFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [form, setForm] = useState<WorkshopFormData>(blankForm);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return undefined;
    const controller = new AbortController();
    apiGet<{ workshop: Workshop }>(`/api/workshops/${id}`, { signal: controller.signal })
      .then(({ workshop }) => setForm({
        code: workshop.code,
        title: workshop.title,
        instructor: workshop.instructor,
        scheduledAt: toLocalDateTime(workshop.scheduledAt),
        capacity: String(workshop.capacity),
        status: workshop.status,
      }))
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Unable to load workshop.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id]);

  const updateField = (field: keyof WorkshopFormData, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const capacity = Number(form.capacity);
    const scheduledDate = new Date(form.scheduledAt);
    if (!Number.isInteger(capacity) || capacity <= 0) {
      setError('Capacity must be a positive whole number.');
      return;
    }
    if (!form.scheduledAt || Number.isNaN(scheduledDate.getTime())) {
      setError('Enter a valid date and time.');
      return;
    }

    setSaving(true);
    setError(null);
    const payload = {
      code: form.code.trim(),
      title: form.title.trim(),
      instructor: form.instructor.trim(),
      scheduledAt: scheduledDate.toISOString(),
      capacity,
      status: form.status,
    };
    try {
      const response = editing
        ? await apiPatch<{ workshop: Workshop }>(`/api/workshops/${id}`, payload)
        : await apiPost<{ workshop: Workshop }>('/api/workshops', payload);
      navigate(`/workshops/${response.workshop.id}`, {
        replace: true,
        state: { notice: editing ? 'Workshop updated.' : 'Workshop created.' },
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save workshop.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main className="feedback" role="status">Loading workshop…</main>;

  return (
    <main className="page-content page-content--narrow">
      <Link className="back-link" to={id ? `/workshops/${id}` : '/workshops'}>← Cancel</Link>
      <p className="eyebrow">Manager</p>
      <h1>{editing ? 'Edit workshop' : 'Create workshop'}</h1>
      {error && <div className="feedback feedback--error" role="alert">{error}</div>}
      <form className="stacked-form" onSubmit={save}>
        <label>Workshop code<input value={form.code} onChange={(event) => updateField('code', event.target.value)} required maxLength={40} disabled={saving} /></label>
        <label>Title<input value={form.title} onChange={(event) => updateField('title', event.target.value)} required maxLength={200} disabled={saving} /></label>
        <label>Instructor<input value={form.instructor} onChange={(event) => updateField('instructor', event.target.value)} required maxLength={160} disabled={saving} /></label>
        <label>Date and time<input type="datetime-local" value={form.scheduledAt} onChange={(event) => updateField('scheduledAt', event.target.value)} required disabled={saving} /></label>
        <label>Capacity<input type="number" value={form.capacity} onChange={(event) => updateField('capacity', event.target.value)} required min="1" step="1" disabled={saving} /></label>
        <label>Status<select value={form.status} onChange={(event) => updateField('status', event.target.value)} disabled={saving}>
          <option value="SCHEDULED">Scheduled</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option>
        </select></label>
        <div className="button-row">
          <button className="button" type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create workshop'}</button>
          <Link className="button button--secondary" to={id ? `/workshops/${id}` : '/workshops'}>Cancel</Link>
        </div>
      </form>
    </main>
  );
};

export default WorkshopFormPage;