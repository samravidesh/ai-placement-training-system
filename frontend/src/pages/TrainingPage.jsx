import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const getErrorMessage = (error) => {
  return error?.response?.data?.message || error?.message || 'Request failed';
};

function TrainingPage() {
  const { user, isAdmin } = useAuth();

  const [courses, setCourses] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [plan, setPlan] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTrainingData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const requests = await Promise.allSettled([
      api.get('/training/courses'),
      api.get('/training/workshops'),
      api.get(`/training/plans/${user.id}`),
      api.get(`/training/progress/${user.id}`)
    ]);

    const [coursesResult, workshopsResult, planResult, progressResult] = requests;

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

    if (planResult.status === 'fulfilled') {
      setPlan(planResult.value.data.plan || []);
    } else if (planResult.reason?.response?.status !== 404) {
      setError((current) => current || getErrorMessage(planResult.reason));
    }

    if (progressResult.status === 'fulfilled') {
      setProgress(progressResult.value.data);
    } else {
      setError((current) => current || getErrorMessage(progressResult.reason));
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadTrainingData();
  }, [loadTrainingData]);

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }
    const interval = setInterval(() => {
      loadTrainingData();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadTrainingData, user?.id]);

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-slate-200">
        Loading training data...
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="glass-panel rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">Training</h1>
            <p className="mt-1 text-sm text-slate-300">
              Explore courses and workshops, and monitor your structured six-month plan.
            </p>
          </div>
          <button
            type="button"
            onClick={loadTrainingData}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-white/10"
          >
            Refresh
          </button>
        </div>
        {isAdmin && (
          <p className="mt-3 text-xs text-emerald-200">
            Admin actions like assigning courses/workshops and generating plans are available in Admin Panel.
          </p>
        )}
      </div>

      {error && <p className="rounded-xl bg-rose-400/15 px-3 py-2 text-sm text-rose-200">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <article className="glass-panel rounded-2xl p-5">
          <h2 className="text-sm uppercase tracking-wide text-slate-300">Course Completion</h2>
          <p className="mt-2 text-3xl font-semibold text-white">
            {progress?.course_stats?.completion_percentage ?? 0}%
          </p>
        </article>
        <article className="glass-panel rounded-2xl p-5">
          <h2 className="text-sm uppercase tracking-wide text-slate-300">Workshop Completion</h2>
          <p className="mt-2 text-3xl font-semibold text-white">
            {progress?.workshop_stats?.completion_percentage ?? 0}%
          </p>
        </article>
        <article className="glass-panel rounded-2xl p-5">
          <h2 className="text-sm uppercase tracking-wide text-slate-300">Overall Completion</h2>
          <p className="mt-2 text-3xl font-semibold text-white">
            {progress?.overall_completion_percentage ?? 0}%
          </p>
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-panel rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white">Course Catalog</h2>
          <div className="mt-4 space-y-3">
            {courses.map((course) => (
              <article key={course.id} className="rounded-xl border border-white/10 bg-slate-900/45 p-4">
                <p className="font-medium text-slate-100">{course.course_name}</p>
                <p className="mt-1 text-sm text-slate-300">
                  {course.duration_weeks} weeks | Level: {course.level} | Provider: {course.provider || 'Internal'}
                </p>
                <p className="mt-1 text-sm text-slate-300">Category: {course.category || 'General'}</p>
                <p className="mt-1 text-sm text-slate-400">{course.description}</p>
                {course.course_link && (
                  <a
                    href={course.course_link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm font-medium text-cyan-200 hover:text-cyan-100"
                  >
                    Open Course
                  </a>
                )}
              </article>
            ))}
            {courses.length === 0 && <p className="text-sm text-slate-300">No courses added yet.</p>}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white">Workshop Catalog</h2>
          <div className="mt-4 space-y-3">
            {workshops.map((workshop) => (
              <article key={workshop.id} className="rounded-xl border border-white/10 bg-slate-900/45 p-4">
                <p className="font-medium text-slate-100">{workshop.title}</p>
                <p className="mt-1 text-sm text-slate-300">
                  {workshop.mode} | {workshop.duration_hours ?? 'N/A'} hours
                </p>
                <p className="mt-1 text-sm text-slate-400">{workshop.description}</p>
              </article>
            ))}
            {workshops.length === 0 && <p className="text-sm text-slate-300">No workshops added yet.</p>}
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <h2 className="text-lg font-semibold text-white">Six-Month Training Plan</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {plan.map((month) => (
            <article key={month.month_no} className="rounded-xl border border-white/10 bg-slate-900/45 p-4">
              <p className="text-sm uppercase tracking-wide text-cyan-200">Month {month.month_no}</p>
              <p className="mt-1 font-medium text-slate-100">{month.module_title}</p>
              <p className="mt-2 text-sm text-slate-300">{month.key_outcomes}</p>
              <p className="mt-2 text-sm text-slate-400">Workshop: {month.workshop_module}</p>
            </article>
          ))}
          {plan.length === 0 && (
            <p className="text-sm text-slate-300">
              No plan generated yet. Ask an admin to generate your six-month plan.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default TrainingPage;
