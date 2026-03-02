import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const aptitudeQuestions = [
  {
    id: 'q1',
    question: 'If 15% of a number is 45, what is the number?',
    options: ['150', '300', '225', '275'],
    correctIndex: 1
  },
  {
    id: 'q2',
    question: 'Find the next number: 2, 6, 12, 20, ?',
    options: ['26', '28', '30', '32'],
    correctIndex: 2
  },
  {
    id: 'q3',
    question: 'If CAT = 3120, DOG = ?',
    options: ['4157', '4715', '4158', '4716'],
    correctIndex: 0
  },
  {
    id: 'q4',
    question: 'A train travels 180 km in 3 hours. Speed is:',
    options: ['40 km/h', '50 km/h', '60 km/h', '70 km/h'],
    correctIndex: 2
  },
  {
    id: 'q5',
    question: 'What is 25% of 320?',
    options: ['75', '80', '85', '90'],
    correctIndex: 1
  },
  {
    id: 'q6',
    question: 'Choose the odd one out: Java, Python, HTML, C++',
    options: ['Java', 'Python', 'HTML', 'C++'],
    correctIndex: 2
  },
  {
    id: 'q7',
    question: 'If 8 workers finish a task in 12 days, 6 workers finish it in:',
    options: ['14 days', '16 days', '18 days', '20 days'],
    correctIndex: 1
  },
  {
    id: 'q8',
    question: 'Which is the largest fraction?',
    options: ['5/8', '7/10', '3/5', '9/16'],
    correctIndex: 1
  }
];

const initialProfile = {
  phone: '',
  date_of_birth: '',
  gender: '',
  current_address: '',
  permanent_address: '',
  city: '',
  state: '',
  country: '',
  postal_code: '',
  guardian_name: '',
  guardian_contact: '',
  college_name: '',
  university_name: '',
  course_name: '',
  specialization: '',
  current_semester: '',
  graduation_year: '',
  cgpa: '',
  tenth_percentage: '',
  twelfth_percentage: '',
  backlog_count: '0',
  skills: '',
  certifications: '',
  internships: '',
  projects: '',
  preferred_roles: '',
  preferred_locations: '',
  languages: '',
  extracurriculars: '',
  linkedin_url: '',
  github_url: '',
  resume_url: '',
  objective: '',
  extra_notes: ''
};

const getErrorMessage = (error) => {
  return error?.response?.data?.message || error?.message || 'Failed to save onboarding data';
};

const splitList = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

function OnboardingPage() {
  const navigate = useNavigate();
  const { updateUser, user } = useAuth();

  const [profile, setProfile] = useState(initialProfile);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const totalQuestions = aptitudeQuestions.length;
  const answeredCount = Object.keys(answers).length;
  const aptitudeRatio = useMemo(() => {
    if (answeredCount === 0) {
      return 0;
    }
    const correct = aptitudeQuestions.reduce((count, question) => {
      return count + (answers[question.id] === question.correctIndex ? 1 : 0);
    }, 0);
    return Number(((correct / totalQuestions) * 100).toFixed(2));
  }, [answers, answeredCount, totalQuestions]);

  const onProfileChange = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  };

  const onAnswerChange = (questionId, optionIndex) => {
    setAnswers((current) => ({ ...current, [questionId]: optionIndex }));
  };

  const submitOnboarding = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');

    if (answeredCount !== totalQuestions) {
      setError('Please complete all aptitude questions before submitting.');
      return;
    }

    setSaving(true);

    try {
      const profilePayload = {
        ...profile,
        backlog_count: Number(profile.backlog_count || 0),
        skills: splitList(profile.skills),
        certifications: splitList(profile.certifications),
        internships: splitList(profile.internships),
        projects: splitList(profile.projects),
        preferred_roles: splitList(profile.preferred_roles),
        preferred_locations: splitList(profile.preferred_locations),
        languages: splitList(profile.languages),
        extracurriculars: splitList(profile.extracurriculars),
        basicInfo: {
          full_name: user?.name || '',
          phone: profile.phone,
          education_level: profile.course_name || '',
          branch: user?.branch || '',
          city: profile.city
        },
        resume: profile.resume_url || '',
        targetRole: splitList(profile.preferred_roles)[0] || profile.specialization || '',
        target_role: splitList(profile.preferred_roles)[0] || profile.specialization || '',
        aptitudeScore: aptitudeRatio,
        aptitude_test: {
          ratio: aptitudeRatio,
          total_questions: totalQuestions,
          answers
        }
      };

      await api.put('/profile/me', profilePayload);
      await api.post('/assessment', { aptitude_score: aptitudeRatio });
      const completeResponse = await api.patch('/profile/onboarding-complete');

      updateUser(completeResponse.data.user);
      setStatus('Onboarding completed successfully.');
      navigate('/dashboard', { replace: true });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="glass-panel rounded-3xl p-6">
        <h1 className="text-2xl font-semibold text-white">Complete Educational Profile</h1>
        <p className="mt-2 text-sm text-slate-300">
          Fill detailed educational information and finish aptitude test. Your aptitude ratio will appear on dashboard.
        </p>
        <p className="mt-2 text-sm text-cyan-200">
          Logged in as: {user?.name} ({user?.email})
        </p>
      </div>

      <form onSubmit={submitOnboarding} className="space-y-6">
        <div className="glass-panel rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white">Personal and Educational Details</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input required name="phone" value={profile.phone} onChange={onProfileChange} placeholder="Phone number" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <input required type="date" name="date_of_birth" value={profile.date_of_birth} onChange={onProfileChange} className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <input required name="gender" value={profile.gender} onChange={onProfileChange} placeholder="Gender" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <input required name="guardian_name" value={profile.guardian_name} onChange={onProfileChange} placeholder="Parent / guardian name" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <input required name="guardian_contact" value={profile.guardian_contact} onChange={onProfileChange} placeholder="Parent / guardian contact" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <input required name="postal_code" value={profile.postal_code} onChange={onProfileChange} placeholder="Postal code" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <input required name="city" value={profile.city} onChange={onProfileChange} placeholder="City" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <input required name="state" value={profile.state} onChange={onProfileChange} placeholder="State" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <input required name="country" value={profile.country} onChange={onProfileChange} placeholder="Country" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <input required name="college_name" value={profile.college_name} onChange={onProfileChange} placeholder="College name" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <input required name="university_name" value={profile.university_name} onChange={onProfileChange} placeholder="University name" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <input required name="course_name" value={profile.course_name} onChange={onProfileChange} placeholder="Course name" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <input required name="specialization" value={profile.specialization} onChange={onProfileChange} placeholder="Specialization" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <input name="current_semester" value={profile.current_semester} onChange={onProfileChange} placeholder="Current semester" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <input required type="number" name="graduation_year" value={profile.graduation_year} onChange={onProfileChange} placeholder="Graduation year" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <input required type="number" step="0.01" min="0" max="10" name="cgpa" value={profile.cgpa} onChange={onProfileChange} placeholder="CGPA" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <input required type="number" step="0.01" min="0" max="100" name="tenth_percentage" value={profile.tenth_percentage} onChange={onProfileChange} placeholder="10th percentage" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <input required type="number" step="0.01" min="0" max="100" name="twelfth_percentage" value={profile.twelfth_percentage} onChange={onProfileChange} placeholder="12th percentage" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <input type="number" min="0" name="backlog_count" value={profile.backlog_count} onChange={onProfileChange} placeholder="Backlog count" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <input name="linkedin_url" value={profile.linkedin_url} onChange={onProfileChange} placeholder="LinkedIn URL" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <input name="github_url" value={profile.github_url} onChange={onProfileChange} placeholder="GitHub URL" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <input name="resume_url" value={profile.resume_url} onChange={onProfileChange} placeholder="Resume URL" className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />

            <textarea required name="current_address" value={profile.current_address} onChange={onProfileChange} placeholder="Current address" className="sm:col-span-2 min-h-20 rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <textarea name="permanent_address" value={profile.permanent_address} onChange={onProfileChange} placeholder="Permanent address" className="sm:col-span-2 min-h-20 rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <textarea name="skills" value={profile.skills} onChange={onProfileChange} placeholder="Skills (comma separated)" className="sm:col-span-2 min-h-20 rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <textarea name="certifications" value={profile.certifications} onChange={onProfileChange} placeholder="Certifications (comma separated)" className="sm:col-span-2 min-h-20 rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <textarea name="internships" value={profile.internships} onChange={onProfileChange} placeholder="Internships (comma separated)" className="sm:col-span-2 min-h-20 rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <textarea name="projects" value={profile.projects} onChange={onProfileChange} placeholder="Projects (comma separated)" className="sm:col-span-2 min-h-20 rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <textarea name="preferred_roles" value={profile.preferred_roles} onChange={onProfileChange} placeholder="Preferred roles (comma separated)" className="sm:col-span-2 min-h-20 rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <textarea name="preferred_locations" value={profile.preferred_locations} onChange={onProfileChange} placeholder="Preferred locations (comma separated)" className="sm:col-span-2 min-h-20 rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <textarea name="languages" value={profile.languages} onChange={onProfileChange} placeholder="Languages (comma separated)" className="sm:col-span-2 min-h-20 rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <textarea name="extracurriculars" value={profile.extracurriculars} onChange={onProfileChange} placeholder="Extra curricular activities (comma separated)" className="sm:col-span-2 min-h-20 rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <textarea name="objective" value={profile.objective} onChange={onProfileChange} placeholder="Career objective" className="sm:col-span-2 min-h-20 rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
            <textarea name="extra_notes" value={profile.extra_notes} onChange={onProfileChange} placeholder="Any additional minor details" className="sm:col-span-2 min-h-20 rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" />
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">Aptitude Test</h2>
            <p className="text-sm text-cyan-200">
              Ratio: <span className="font-semibold">{aptitudeRatio}%</span> ({answeredCount}/{totalQuestions} answered)
            </p>
          </div>
          <div className="mt-4 space-y-4">
            {aptitudeQuestions.map((item, index) => (
              <article key={item.id} className="rounded-xl border border-white/10 bg-slate-900/45 p-4">
                <p className="text-sm font-medium text-slate-100">
                  Q{index + 1}. {item.question}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {item.options.map((option, optionIndex) => (
                    <label key={option} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200">
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
        </div>

        {error && <p className="rounded-xl bg-rose-400/15 px-3 py-2 text-sm text-rose-200">{error}</p>}
        {status && <p className="rounded-xl bg-emerald-400/15 px-3 py-2 text-sm text-emerald-200">{status}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Saving Details and Test...' : 'Submit Details and Complete Onboarding'}
        </button>
      </form>
    </section>
  );
}

export default OnboardingPage;
