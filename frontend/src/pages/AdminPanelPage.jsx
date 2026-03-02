import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';

const interestOptions = ['govt', 'private', 'tech', 'non-tech'];

const initialJobForm = {
  company_name: '',
  job_role: '',
  package: '',
  job_type: '',
  required_skills: '',
  location: '',
  interest_type: 'tech'
};

const initialCourseForm = {
  course_name: '',
  description: '',
  duration_weeks: '',
  level: 'beginner',
  provider: 'Striver',
  category: 'DSA',
  course_link: ''
};

const initialWorkshopForm = {
  title: '',
  description: '',
  scheduled_date: '',
  duration_hours: '',
  mode: 'offline'
};

const initialAnalyticsForm = {
  company_name: '',
  total_hires_last_3_years: '',
  average_package: '',
  roles_offered: ''
};

const initialAssignmentForm = {
  user_id: '',
  course_id: '',
  workshop_id: ''
};

const getErrorMessage = (error) => {
  return error?.response?.data?.message || error?.message || 'Request failed';
};

function AdminPanelPage() {
  const [jobForm, setJobForm] = useState(initialJobForm);
  const [courseForm, setCourseForm] = useState(initialCourseForm);
  const [workshopForm, setWorkshopForm] = useState(initialWorkshopForm);
  const [analyticsForm, setAnalyticsForm] = useState(initialAnalyticsForm);
  const [assignmentForm, setAssignmentForm] = useState(initialAssignmentForm);
  const [planUserId, setPlanUserId] = useState('');

  const [jobs, setJobs] = useState([]);
  const [courses, setCourses] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [stats, setStats] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [ragStatus, setRagStatus] = useState(null);
  const [ragReindexResult, setRagReindexResult] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ragSubmitting, setRagSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError('');

    const requests = await Promise.allSettled([
      api.get('/jobs'),
      api.get('/training/courses'),
      api.get('/training/workshops'),
      api.get('/company-analytics/summary'),
      api.get('/company-analytics/statistics'),
      api.get('/profile/all'),
      api.get('/recommendations/reindex/status')
    ]);

    const [jobsResult, coursesResult, workshopsResult, summaryResult, statsResult, profilesResult, ragStatusResult] = requests;

    if (jobsResult.status === 'fulfilled') {
      setJobs(jobsResult.value.data.jobs || []);
    } else {
      setError((current) => current || getErrorMessage(jobsResult.reason));
    }

    if (coursesResult.status === 'fulfilled') {
      setCourses(coursesResult.value.data.courses || []);
    } else {
      setError((current) => current || getErrorMessage(coursesResult.reason));
    }

    if (workshopsResult.status === 'fulfilled') {
      setWorkshops(workshopsResult.value.data.workshops || []);
    } else {
      setError((current) => current || getErrorMessage(workshopsResult.reason));
    }

    if (summaryResult.status === 'fulfilled') {
      setAnalytics(summaryResult.value.data.companies || []);
    } else {
      setError((current) => current || getErrorMessage(summaryResult.reason));
    }

    if (statsResult.status === 'fulfilled') {
      setStats(statsResult.value.data.statistics || null);
    } else {
      setError((current) => current || getErrorMessage(statsResult.reason));
    }

    if (profilesResult.status === 'fulfilled') {
      setProfiles(profilesResult.value.data.profiles || []);
    } else {
      setError((current) => current || getErrorMessage(profilesResult.reason));
    }

    if (ragStatusResult.status === 'fulfilled') {
      setRagStatus(ragStatusResult.value.data || null);
    } else {
      setError((current) => current || getErrorMessage(ragStatusResult.reason));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const onInput = (setter) => (event) => {
    const { name, value } = event.target;
    setter((current) => ({ ...current, [name]: value }));
  };

  const withSubmit = async (action, successMessage) => {
    setSubmitting(true);
    setError('');
    setStatus('');
    try {
      await action();
      setStatus(successMessage);
      await loadAdminData();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const addJob = async (event) => {
    event.preventDefault();
    await withSubmit(async () => {
      await api.post('/jobs', {
        ...jobForm,
        package: Number(jobForm.package),
        required_skills: jobForm.required_skills
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      });
      setJobForm(initialJobForm);
    }, 'Job created successfully.');
  };

  const addCourse = async (event) => {
    event.preventDefault();
    await withSubmit(async () => {
      await api.post('/training/courses', {
        ...courseForm,
        duration_weeks: Number(courseForm.duration_weeks)
      });
      setCourseForm(initialCourseForm);
    }, 'Course added successfully.');
  };

  const addWorkshop = async (event) => {
    event.preventDefault();
    await withSubmit(async () => {
      await api.post('/training/workshops', {
        ...workshopForm,
        scheduled_date: workshopForm.scheduled_date || null,
        duration_hours: workshopForm.duration_hours ? Number(workshopForm.duration_hours) : null
      });
      setWorkshopForm(initialWorkshopForm);
    }, 'Workshop added successfully.');
  };

  const addAnalytics = async (event) => {
    event.preventDefault();
    await withSubmit(async () => {
      await api.post('/company-analytics', {
        ...analyticsForm,
        total_hires_last_3_years: Number(analyticsForm.total_hires_last_3_years),
        average_package: Number(analyticsForm.average_package),
        roles_offered: analyticsForm.roles_offered
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      });
      setAnalyticsForm(initialAnalyticsForm);
    }, 'Company analytics record added.');
  };

  const assignCourse = async (event) => {
    event.preventDefault();
    await withSubmit(async () => {
      await api.post('/training/courses/assign', {
        user_id: Number(assignmentForm.user_id),
        course_id: Number(assignmentForm.course_id)
      });
    }, 'Course assigned successfully.');
  };

  const assignWorkshop = async (event) => {
    event.preventDefault();
    await withSubmit(async () => {
      await api.post('/training/workshops/assign', {
        user_id: Number(assignmentForm.user_id),
        workshop_id: Number(assignmentForm.workshop_id)
      });
    }, 'Workshop assigned successfully.');
  };

  const generatePlan = async (event) => {
    event.preventDefault();
    await withSubmit(async () => {
      await api.post(`/training/plans/${Number(planUserId)}/generate`);
    }, '6-month training plan generated.');
  };

  const reindexRagCorpus = async ({ force }) => {
    setRagSubmitting(true);
    setError('');
    setStatus('');
    try {
      const response = await api.post('/recommendations/reindex', { force });
      setRagReindexResult(response.data || null);
      setStatus(force ? 'RAG reindex (force) completed.' : 'RAG reindex completed.');
      await loadAdminData();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setRagSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-slate-200">
        Loading admin panel...
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="glass-panel rounded-3xl p-6">
        <h1 className="text-2xl font-semibold text-white">Admin Panel</h1>
        <p className="mt-2 text-sm text-slate-300">
          Manage jobs, training resources, assignments, and company analytics.
        </p>
      </div>

      {error && <p className="rounded-xl bg-rose-400/15 px-3 py-2 text-sm text-rose-200">{error}</p>}
      {status && <p className="rounded-xl bg-emerald-400/15 px-3 py-2 text-sm text-emerald-200">{status}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={addJob} className="glass-panel rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white">Add Job</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input name="company_name" value={jobForm.company_name} onChange={onInput(setJobForm)} required placeholder="Company name" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <input name="job_role" value={jobForm.job_role} onChange={onInput(setJobForm)} required placeholder="Job role" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <input name="package" type="number" min="0" value={jobForm.package} onChange={onInput(setJobForm)} required placeholder="Package (LPA)" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <input name="job_type" value={jobForm.job_type} onChange={onInput(setJobForm)} required placeholder="Job type" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <input name="location" value={jobForm.location} onChange={onInput(setJobForm)} required placeholder="Location" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <select name="interest_type" value={jobForm.interest_type} onChange={onInput(setJobForm)} className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300">
              {interestOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <textarea name="required_skills" value={jobForm.required_skills} onChange={onInput(setJobForm)} required placeholder="Required skills (comma separated)" className="sm:col-span-2 min-h-20 rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
          </div>
          <button type="submit" disabled={submitting} className="mt-4 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60">
            Add Job
          </button>
        </form>

        <form onSubmit={addCourse} className="glass-panel rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white">Add Course</h2>
          <div className="mt-4 grid gap-3">
            <input name="course_name" value={courseForm.course_name} onChange={onInput(setCourseForm)} required placeholder="Course name" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <textarea name="description" value={courseForm.description} onChange={onInput(setCourseForm)} required placeholder="Description" className="min-h-20 rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="duration_weeks" type="number" min="1" value={courseForm.duration_weeks} onChange={onInput(setCourseForm)} required placeholder="Duration (weeks)" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
              <input name="level" value={courseForm.level} onChange={onInput(setCourseForm)} placeholder="Level" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="provider" value={courseForm.provider} onChange={onInput(setCourseForm)} placeholder="Provider (Striver/Love Babbar/Gate Smashers)" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
              <input name="category" value={courseForm.category} onChange={onInput(setCourseForm)} placeholder="Category (DSA/Aptitude/CS Fundamentals/System Design)" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            </div>
            <input name="course_link" value={courseForm.course_link} onChange={onInput(setCourseForm)} placeholder="Course link" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
          </div>
          <button type="submit" disabled={submitting} className="mt-4 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60">
            Add Course
          </button>
        </form>

        <form onSubmit={addWorkshop} className="glass-panel rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white">Add Workshop</h2>
          <div className="mt-4 grid gap-3">
            <input name="title" value={workshopForm.title} onChange={onInput(setWorkshopForm)} required placeholder="Workshop title" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <textarea name="description" value={workshopForm.description} onChange={onInput(setWorkshopForm)} required placeholder="Description" className="min-h-20 rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <div className="grid gap-3 sm:grid-cols-3">
              <input name="scheduled_date" type="date" value={workshopForm.scheduled_date} onChange={onInput(setWorkshopForm)} className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
              <input name="duration_hours" type="number" min="0" step="0.5" value={workshopForm.duration_hours} onChange={onInput(setWorkshopForm)} placeholder="Duration hours" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
              <input name="mode" value={workshopForm.mode} onChange={onInput(setWorkshopForm)} placeholder="Mode" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            </div>
          </div>
          <button type="submit" disabled={submitting} className="mt-4 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60">
            Add Workshop
          </button>
        </form>

        <form onSubmit={addAnalytics} className="glass-panel rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white">Add Company Analytics</h2>
          <div className="mt-4 grid gap-3">
            <input name="company_name" value={analyticsForm.company_name} onChange={onInput(setAnalyticsForm)} required placeholder="Company name" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="total_hires_last_3_years" type="number" min="0" value={analyticsForm.total_hires_last_3_years} onChange={onInput(setAnalyticsForm)} required placeholder="Total hires (3 years)" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
              <input name="average_package" type="number" min="0" step="0.01" value={analyticsForm.average_package} onChange={onInput(setAnalyticsForm)} required placeholder="Average package" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            </div>
            <textarea name="roles_offered" value={analyticsForm.roles_offered} onChange={onInput(setAnalyticsForm)} required placeholder="Roles offered (comma separated)" className="min-h-20 rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
          </div>
          <button type="submit" disabled={submitting} className="mt-4 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60">
            Add Analytics
          </button>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={assignCourse} className="glass-panel rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white">Assign Course</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input name="user_id" type="number" min="1" value={assignmentForm.user_id} onChange={onInput(setAssignmentForm)} required placeholder="User ID" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <input name="course_id" type="number" min="1" value={assignmentForm.course_id} onChange={onInput(setAssignmentForm)} required placeholder="Course ID" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
          </div>
          <button type="submit" disabled={submitting} className="mt-4 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">
            Assign Course
          </button>
        </form>

        <form onSubmit={assignWorkshop} className="glass-panel rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white">Assign Workshop</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input name="user_id" type="number" min="1" value={assignmentForm.user_id} onChange={onInput(setAssignmentForm)} required placeholder="User ID" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <input name="workshop_id" type="number" min="1" value={assignmentForm.workshop_id} onChange={onInput(setAssignmentForm)} required placeholder="Workshop ID" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
          </div>
          <button type="submit" disabled={submitting} className="mt-4 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">
            Assign Workshop
          </button>
        </form>

        <form onSubmit={generatePlan} className="glass-panel rounded-2xl p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold text-white">Generate 6-Month Plan</h2>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              type="number"
              min="1"
              required
              value={planUserId}
              onChange={(event) => setPlanUserId(event.target.value)}
              placeholder="User ID"
              className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
            />
            <button type="submit" disabled={submitting} className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60">
              Generate Plan
            </button>
          </div>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-panel rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white">RAG Index Manager</h2>
          <p className="mt-2 text-sm text-slate-300">
            Monitor and rebuild vector index for recommendation retrieval quality.
          </p>
          <div className="mt-4 space-y-1 text-sm text-slate-200">
            <p>RAG Enabled: {ragStatus?.rag_enabled ? 'Yes' : 'No'}</p>
            <p>Embedding Key Configured: {ragStatus?.openai_embedding_key_configured ? 'Yes' : 'No'}</p>
            <p>Embedding Model: {ragStatus?.embedding_model || 'N/A'}</p>
            <p>Sync on Request: {ragStatus?.sync_on_request ? 'Yes' : 'No'}</p>
            <p>
              Total Vectors: {ragStatus?.index_summary?.totals?.total_vectors ?? 0} | Embedded:{' '}
              {ragStatus?.index_summary?.totals?.embedded_vectors ?? 0}
            </p>
            <p>Last Updated: {ragStatus?.index_summary?.totals?.last_updated_at || 'N/A'}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => reindexRagCorpus({ force: false })}
              disabled={ragSubmitting}
              className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {ragSubmitting ? 'Reindexing...' : 'Reindex RAG Corpus'}
            </button>
            <button
              type="button"
              onClick={() => reindexRagCorpus({ force: true })}
              disabled={ragSubmitting}
              className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Force Reindex
            </button>
          </div>
          {ragReindexResult && (
            <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/45 p-3 text-sm text-slate-200">
              <p>Synced Documents: {ragReindexResult.indexing?.synced_documents ?? 0}</p>
              <p>Embeddings Generated: {ragReindexResult.indexing?.embeddings_generated ?? 0}</p>
              <p>Reused Embeddings: {ragReindexResult.indexing?.reused_embeddings ?? 0}</p>
              <p>Skipped (No Embedding API): {ragReindexResult.indexing?.skipped_without_embedding_api ?? 0}</p>
              <p>Duration: {ragReindexResult.indexing?.duration_ms ?? 0} ms</p>
            </div>
          )}
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white">Catalog Snapshot</h2>
          <p className="mt-2 text-sm text-slate-300">
            Jobs: {jobs.length} | Courses: {courses.length} | Workshops: {workshops.length} | Profiles: {profiles.length}
          </p>
          <div className="mt-4 space-y-2 text-sm text-slate-200">
            {jobs.slice(0, 5).map((job) => (
              <p key={job.id}>
                #{job.id} {job.company_name} - {job.job_role}
              </p>
            ))}
            {jobs.length === 0 && <p className="text-slate-300">No jobs added yet.</p>}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white">Company Analytics Snapshot</h2>
          <p className="mt-2 text-sm text-slate-300">
            Total Companies: {stats?.overview?.total_companies ?? 0}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Avg Package: {stats?.overview?.average_package_across_companies ?? 0}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Top Company: {stats?.top_company_by_package?.company_name || 'N/A'}
          </p>
          <div className="mt-4 space-y-2 text-sm text-slate-200">
            {analytics.slice(0, 5).map((item) => (
              <p key={item.id}>
                {item.company_name}: {item.total_hires_last_3_years} hires
              </p>
            ))}
            {analytics.length === 0 && <p className="text-slate-300">No analytics data yet.</p>}
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <h2 className="text-lg font-semibold text-white">User Educational Profiles (Neon DB)</h2>
        <p className="mt-1 text-sm text-slate-300">
          These details are stored in database and used as context for AI recommendations.
        </p>
        <div className="mt-4 space-y-3">
          {profiles.slice(0, 20).map((item) => (
            <article key={item.user_id} className="rounded-xl border border-white/10 bg-slate-900/45 p-4">
              <p className="font-medium text-slate-100">
                #{item.user_id} {item.name} ({item.email})
              </p>
              <p className="mt-1 text-sm text-slate-300">
                {item.education_level} | {item.branch} | Interest: {item.interest_type} | Onboarding:{' '}
                {item.onboarding_completed ? 'Completed' : 'Pending'}
              </p>
              <p className="mt-1 text-sm text-cyan-200">
                Aptitude: {item.aptitude_score ?? 'N/A'} | Communication: {item.communication_score ?? 'N/A'} |
                Psychometric: {item.psychometric_score ?? 'N/A'} | Profile Ratio:{' '}
                {item.profile_rating_percentage ?? 'N/A'}%
              </p>
              <p className="mt-2 text-sm text-slate-400">
                College: {item.profile?.college_name || 'N/A'} | Course: {item.profile?.course_name || 'N/A'} |
                Specialization: {item.profile?.specialization || 'N/A'} | CGPA: {item.profile?.cgpa || 'N/A'}
              </p>
            </article>
          ))}
          {profiles.length === 0 && <p className="text-sm text-slate-300">No user profiles saved yet.</p>}
        </div>
      </div>
    </section>
  );
}

export default AdminPanelPage;
