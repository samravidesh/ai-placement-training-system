import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const aptitudeQuestions = [
  { id: 'q1', question: 'If 15% of a number is 45, what is the number?', options: ['150', '300', '225', '275'], correctIndex: 1 },
  { id: 'q2', question: 'Find the next number: 2, 6, 12, 20, ?', options: ['26', '28', '30', '32'], correctIndex: 2 },
  { id: 'q3', question: 'If CAT = 3120, DOG = ?', options: ['4157', '4715', '4158', '4716'], correctIndex: 0 },
  { id: 'q4', question: 'A train travels 180 km in 3 hours. Speed is:', options: ['40 km/h', '50 km/h', '60 km/h', '70 km/h'], correctIndex: 2 },
  { id: 'q5', question: 'What is 25% of 320?', options: ['75', '80', '85', '90'], correctIndex: 1 }
];

const getErrorMessage = (error) => {
  return error?.response?.data?.message || error?.message || 'Request failed';
};

const toCommaText = (value) => {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return String(value || '');
};

function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAptitude, setSavingAptitude] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [completion, setCompletion] = useState(null);
  const [assessmentScore, setAssessmentScore] = useState(0);
  const [answers, setAnswers] = useState({});
  const [liveRecommendations, setLiveRecommendations] = useState(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    education_level: '',
    branch: '',
    city: '',
    skills: '',
    resume: '',
    target_role: ''
  });

  const completionPercentage = useMemo(() => Number(completion?.percentage || 0), [completion?.percentage]);
  const aptitudeRatio = useMemo(() => {
    const answeredCount = Object.keys(answers).length;
    if (answeredCount === 0) {
      return 0;
    }
    const correct = aptitudeQuestions.reduce((count, question) => {
      return count + (answers[question.id] === question.correctIndex ? 1 : 0);
    }, 0);
    return Number(((correct / aptitudeQuestions.length) * 100).toFixed(2));
  }, [answers]);

  const loadProfileData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [profileResponse, assessmentResponse] = await Promise.allSettled([
        api.get('/profile/me'),
        api.get('/assessment/profile-analysis')
      ]);

      if (profileResponse.status === 'fulfilled') {
        const profile = profileResponse.value.data.profile?.profile || {};
        const basicInfo = profile.basicInfo || {};
        setForm({
          full_name: basicInfo.full_name || '',
          phone: basicInfo.phone || profile.phone || '',
          education_level: basicInfo.education_level || profile.education_level || user?.education_level || '',
          branch: basicInfo.branch || profile.branch || user?.branch || '',
          city: basicInfo.city || profile.city || '',
          skills: toCommaText(profile.skills),
          resume: profile.resume || profile.resume_url || '',
          target_role: profile.targetRole || profile.target_role || ''
        });
        setCompletion(profileResponse.value.data.completion || null);
      } else {
        setError(getErrorMessage(profileResponse.reason));
      }

      if (assessmentResponse.status === 'fulfilled') {
        setAssessmentScore(Number(assessmentResponse.value.data.scores?.aptitude_score || 0));
      }
    } finally {
      setLoading(false);
    }
  }, [user?.education_level, user?.branch]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const fetchRealtimeRecommendations = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    setLiveLoading(true);
    setLiveError('');
    try {
      const response = await api.post('/recommendations/ai', {
        user_education: form.education_level || user.education_level || 'Undergraduate',
        interest_type: user.interest_type || 'tech',
        question: `Real-time guidance for target role "${form.target_role}" with skills ${form.skills}.`,
        skill_scores: {
          aptitude_score: Number(assessmentScore || 0),
          communication_score: Number(assessmentScore || 0),
          psychometric_score: Number(assessmentScore || 0)
        }
      });
      setLiveRecommendations(response.data.recommendations || null);
    } catch (recommendationError) {
      setLiveError(getErrorMessage(recommendationError));
    } finally {
      setLiveLoading(false);
    }
  }, [assessmentScore, form.education_level, form.skills, form.target_role, user?.education_level, user?.id, user?.interest_type]);

  useEffect(() => {
    if (loading || !user?.id) {
      return undefined;
    }

    const debounce = setTimeout(() => {
      fetchRealtimeRecommendations();
    }, 900);

    return () => clearTimeout(debounce);
  }, [loading, user?.id, form.skills, form.target_role, form.education_level, assessmentScore, fetchRealtimeRecommendations]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const onAnswerChange = (questionId, optionIndex) => {
    setAnswers((current) => ({ ...current, [questionId]: optionIndex }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setStatus('');
    try {
      const payload = {
        basicInfo: {
          full_name: form.full_name,
          phone: form.phone,
          education_level: form.education_level,
          branch: form.branch,
          city: form.city
        },
        skills: form.skills
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        resume: form.resume,
        targetRole: form.target_role,
        target_role: form.target_role
      };

      const response = await api.put('/profile/me', payload);
      setCompletion(response.data.completion || null);
      setStatus('Profile saved successfully.');
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  };

  const saveAptitude = async () => {
    if (Object.keys(answers).length !== aptitudeQuestions.length) {
      setError('Please answer all aptitude questions before saving.');
      return;
    }

    setSavingAptitude(true);
    setError('');
    setStatus('');
    try {
      const response = await api.post('/assessment', {
        aptitude_score: aptitudeRatio,
        communication_score: aptitudeRatio,
        psychometric_score: aptitudeRatio
      });
      setAssessmentScore(aptitudeRatio);
      setCompletion(response.data.completion || completion);
      setStatus(`Aptitude test saved. Current score: ${aptitudeRatio}%`);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSavingAptitude(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-slate-200">
        Loading profile...
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="glass-panel rounded-3xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">Profile</h1>
            <p className="mt-2 text-sm text-slate-300">
              Update profile sections and aptitude test. Suggestions refresh automatically in real-time.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Profile Completion</h2>
          <p className="text-sm text-cyan-200">
            {completionPercentage}% ({completion?.strength_label || 'Beginner'})
          </p>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${completionPercentage}%` }} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <form onSubmit={saveProfile} className="glass-panel rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white">Edit Profile</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input name="full_name" value={form.full_name} onChange={onChange} placeholder="Full name" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-cyan-300" />
            <input name="phone" value={form.phone} onChange={onChange} placeholder="Phone" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-cyan-300" />
            <input name="education_level" value={form.education_level} onChange={onChange} placeholder="Education level" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-cyan-300" />
            <input name="branch" value={form.branch} onChange={onChange} placeholder="Branch" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-cyan-300" />
            <input name="city" value={form.city} onChange={onChange} placeholder="City" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-cyan-300" />
            <input name="target_role" value={form.target_role} onChange={onChange} placeholder="Target role (e.g. Backend Developer)" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-cyan-300" />
            <textarea name="skills" value={form.skills} onChange={onChange} placeholder="Skills (comma separated)" className="sm:col-span-2 min-h-24 rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-cyan-300" />
            <input name="resume" value={form.resume} onChange={onChange} placeholder="Resume URL" className="sm:col-span-2 rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-cyan-300" />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-4 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>

        <div className="glass-panel rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">Aptitude Test (Profile Section)</h2>
            <p className="text-sm text-cyan-200">
              Live Score: {aptitudeRatio}% | Saved Score: {assessmentScore || 0}%
            </p>
          </div>
          <div className="mt-4 space-y-3">
            {aptitudeQuestions.map((item, index) => (
              <article key={item.id} className="rounded-xl border border-white/10 bg-slate-900/45 p-3">
                <p className="text-sm font-medium text-slate-100">
                  Q{index + 1}. {item.question}
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {item.options.map((option, optionIndex) => (
                    <label key={option} className="flex items-center gap-2 rounded-lg border border-white/10 px-2 py-2 text-sm text-slate-200">
                      <input
                        type="radio"
                        name={item.id}
                        checked={answers[item.id] === optionIndex}
                        onChange={() => onAnswerChange(item.id, optionIndex)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </article>
            ))}
          </div>
          <button
            type="button"
            onClick={saveAptitude}
            disabled={savingAptitude}
            className="mt-4 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingAptitude ? 'Saving Aptitude...' : 'Save Aptitude Score'}
          </button>
        </div>
      </div>

      {(error || status) && (
        <div className="space-y-2">
          {error && <p className="rounded-xl bg-rose-400/15 px-3 py-2 text-sm text-rose-200">{error}</p>}
          {status && <p className="rounded-xl bg-emerald-400/15 px-3 py-2 text-sm text-emerald-200">{status}</p>}
        </div>
      )}

      <div className="glass-panel rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Real-time AI Suggestions</h2>
          <button
            type="button"
            onClick={fetchRealtimeRecommendations}
            disabled={liveLoading}
            className="rounded-xl border border-cyan-300/40 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {liveLoading ? 'Refreshing...' : 'Refresh Now'}
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-300">
          This section updates automatically when you change profile fields or aptitude score.
        </p>
        {liveError && <p className="mt-3 rounded-xl bg-rose-400/15 px-3 py-2 text-sm text-rose-200">{liveError}</p>}
        {!liveRecommendations && !liveLoading && (
          <p className="mt-3 text-sm text-slate-300">No live recommendations yet. Update your profile fields to trigger results.</p>
        )}
        {liveRecommendations && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-slate-900/45 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-200">Placements</h3>
              <ul className="mt-2 space-y-2 text-sm text-slate-200">
                {(liveRecommendations.placement_recommendation || []).slice(0, 3).map((item, index) => (
                  <li key={`${item.title}-${index}`}>{item.title} ({item.match_ratio || 'N/A'})</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/45 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-200">Courses</h3>
              <ul className="mt-2 space-y-2 text-sm text-slate-200">
                {(liveRecommendations.course_recommendation || []).slice(0, 3).map((item, index) => (
                  <li key={`${item.name}-${index}`}>{item.name} ({item.platform})</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/45 p-4 md:col-span-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-200">Assistant Guidance</h3>
              <p className="mt-2 text-sm text-slate-200">
                {liveRecommendations.assistant_answer || liveRecommendations.profile_summary || 'No assistant message yet.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default ProfilePage;
