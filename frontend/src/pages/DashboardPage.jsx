import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  createSpeechRecognition,
  getSpeechSupport,
  speakText,
  stopSpeaking
} from '../utils/speech';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const defaultScores = {
  aptitude_score: 70,
  communication_score: 70,
  psychometric_score: 70
};

const getErrorMessage = (error) => {
  return error?.response?.data?.message || error?.message || 'Request failed';
};

const buildAssistantReply = (question, recommendations) => {
  if (recommendations?.assistant_answer) {
    return recommendations.assistant_answer;
  }

  const profileSummary = recommendations?.profile_summary || 'Here is your dashboard guidance.';
  const topPlacements = (
    recommendations?.placement_recommendation ||
    recommendations?.job_recommendation ||
    []
  ).slice(0, 2);
  const topCourses = (recommendations?.course_recommendation || []).slice(0, 2);
  const placementChance = recommendations?.placement_probability?.next_6_months || 'N/A';

  const jobText = topPlacements.map((item) => item.title).join(', ') || 'No specific role suggestions';
  const courseText = topCourses.map((item) => item.name).join(', ') || 'No specific course suggestions';

  return `${profileSummary}\n\nFor "${question}", focus on placements like ${jobText} and courses like ${courseText}. Estimated 6-month placement chance: ${placementChance}.`;
};

const buildLocalFallbackRecommendations = ({ interestType, jobs, courses }) => {
  const placementFromJobs = (jobs || []).slice(0, 3).map((job) => ({
    title: job.job_role,
    company: job.company_name,
    location: job.location,
    reason: 'Suggested from available job catalog while live AI recommendations are unavailable.'
  }));

  const courseFromCatalog = (courses || []).slice(0, 3).map((course) => ({
    name: course.course_name,
    platform: 'Placement Platform',
    reason: 'Suggested from available course catalog while live AI recommendations are unavailable.'
  }));

  const fallbackPlacements = placementFromJobs.length > 0
    ? placementFromJobs
    : [
        { title: 'Entry-Level Role', company: 'Partner Company', location: 'Hybrid', reason: 'Default placement recommendation. Generate AI picks after backend is reachable.' },
        { title: 'Graduate Trainee', company: 'Partner Company', location: 'On-site', reason: 'Default placement recommendation. Generate AI picks after backend is reachable.' },
        { title: 'Associate Role', company: 'Partner Company', location: 'Remote', reason: 'Default placement recommendation. Generate AI picks after backend is reachable.' }
      ];

  const fallbackCourses = courseFromCatalog.length > 0
    ? courseFromCatalog
    : [
        { name: 'Core Aptitude Track', platform: 'Placement Platform', reason: 'Default course recommendation.' },
        { name: 'Interview Communication Track', platform: 'Placement Platform', reason: 'Default course recommendation.' },
        { name: 'Career Readiness Track', platform: 'Placement Platform', reason: 'Default course recommendation.' }
      ];

  return {
    profile_summary: `Showing fallback suggestions for ${interestType} while live recommendations are unavailable.`,
    placement_recommendation: fallbackPlacements,
    internship_recommendation: fallbackPlacements.map((item) => ({
      title: `${item.title} Intern`,
      company: item.company,
      location: item.location,
      reason: item.reason
    })),
    course_recommendation: fallbackCourses,
    training_recommendation: fallbackCourses.map((item) => ({
      title: item.name,
      type: 'course',
      duration: '4-8 weeks',
      reason: item.reason
    })),
    placement_probability: {
      next_3_months: '55%',
      next_6_months: '68%',
      reason: 'Fallback estimate shown because live model response is currently unavailable.'
    },
    skill_gap_analysis: [],
    assistant_answer: ''
  };
};

function DashboardPage() {
  const { user } = useAuth();
  const recognitionRef = useRef(null);
  const speechSupport = useMemo(() => getSpeechSupport(), []);

  const [analysis, setAnalysis] = useState(null);
  const [progress, setProgress] = useState(null);
  const [profileCompletion, setProfileCompletion] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [courses, setCourses] = useState([]);
  const [scores, setScores] = useState(defaultScores);
  const [recommendations, setRecommendations] = useState(null);

  const [loading, setLoading] = useState(true);
  const [savingAssessment, setSavingAssessment] = useState(false);
  const [generatingRecommendations, setGeneratingRecommendations] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [recommendationError, setRecommendationError] = useState('');

  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [voiceError, setVoiceError] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      content: 'Ask me anything about placements, roles, or upskilling.'
    }
  ]);

  useEffect(() => {
    if (!speechSupport.recognition) {
      return undefined;
    }

    recognitionRef.current = createSpeechRecognition({
      onTranscript: (transcript) => {
        setChatInput((current) => {
          if (!current) {
            return transcript;
          }
          return `${current} ${transcript}`.trim();
        });
      },
      onStart: () => {
        setIsListening(true);
        setVoiceError('');
      },
      onEnd: () => {
        setIsListening(false);
      },
      onError: (event) => {
        setIsListening(false);
        setVoiceError(event?.error ? `Voice input error: ${event.error}` : 'Voice input failed.');
      }
    });

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_error) {
          // Ignore stop failures during unmount.
        }
      }
      stopSpeaking();
    };
  }, [speechSupport.recognition]);

  const fetchRecommendations = useCallback(
    async (scorePayload, options = {}) => {
      const { question = '' } = options;
      if (!user) {
        return null;
      }

      const payload = {
        user_education: user.education_level || 'Undergraduate',
        interest_type: user.interest_type || 'tech',
        question,
        skill_scores: {
          aptitude_score: Number(scorePayload.aptitude_score),
          communication_score: Number(scorePayload.communication_score),
          psychometric_score: Number(scorePayload.psychometric_score)
        }
      };

      const response = await api.post('/recommendations/ai', payload);
      const nextRecommendations = response.data.recommendations;
      setRecommendations(nextRecommendations);
      return nextRecommendations;
    },
    [user]
  );

  const loadDashboard = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setStatus('');
    setRecommendationError('');

    const requests = await Promise.allSettled([
      api.get('/assessment/profile-analysis'),
      api.get('/profile/completion'),
      api.get(`/training/progress/${user.id}`),
      api.get('/jobs', { params: { interest_type: user.interest_type } }),
      api.get('/training/courses')
    ]);

    const [analysisResult, completionResult, progressResult, jobsResult, coursesResult] = requests;
    let nextScores = { ...defaultScores };

    if (analysisResult.status === 'fulfilled') {
      const data = analysisResult.value.data;
      nextScores = {
        aptitude_score: Number(data.scores?.aptitude_score || 70),
        communication_score: Number(data.scores?.communication_score || 70),
        psychometric_score: Number(data.scores?.psychometric_score || 70)
      };
      setAnalysis(data);
      setScores(nextScores);
    } else if (analysisResult.reason?.response?.status !== 404) {
      setError(getErrorMessage(analysisResult.reason));
    }

    if (completionResult.status === 'fulfilled') {
      setProfileCompletion(completionResult.value.data.completion || null);
    } else {
      setError((current) => current || getErrorMessage(completionResult.reason));
    }

    if (progressResult.status === 'fulfilled') {
      setProgress(progressResult.value.data);
    } else {
      setError((current) => current || getErrorMessage(progressResult.reason));
    }

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

    setGeneratingRecommendations(true);
    try {
      await fetchRecommendations(nextScores);
    } catch (recommendationLoadError) {
      setRecommendationError(getErrorMessage(recommendationLoadError));
      setRecommendations(
        buildLocalFallbackRecommendations({
          interestType: user?.interest_type || 'tech',
          jobs: jobsResult.status === 'fulfilled' ? jobsResult.value.data.jobs || [] : [],
          courses: coursesResult.status === 'fulfilled' ? coursesResult.value.data.courses || [] : []
        })
      );
    } finally {
      setGeneratingRecommendations(false);
      setLoading(false);
    }
  }, [fetchRecommendations, user?.id, user?.interest_type]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }
    const interval = setInterval(() => {
      loadDashboard();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadDashboard, user?.id]);

  const graphData = useMemo(() => {
    const overallRating = Number(
      (
        (Number(scores.aptitude_score) +
          Number(scores.communication_score) +
          Number(scores.psychometric_score)) /
        3
      ).toFixed(2)
    );

    return {
      labels: ['Aptitude', 'Communication', 'Psychometric', 'Overall'],
      datasets: [
        {
          label: 'Profile Score',
          data: [
            Number(scores.aptitude_score),
            Number(scores.communication_score),
            Number(scores.psychometric_score),
            overallRating
          ],
          borderColor: '#22d3ee',
          backgroundColor: 'rgba(34, 211, 238, 0.2)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 5
        }
      ]
    };
  }, [scores.aptitude_score, scores.communication_score, scores.psychometric_score]);

  const graphOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#cbd5e1' }
        }
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: { color: '#94a3b8' },
          grid: { color: 'rgba(148, 163, 184, 0.2)' }
        },
        x: {
          ticks: { color: '#94a3b8' },
          grid: { color: 'rgba(148, 163, 184, 0.2)' }
        }
      }
    }),
    []
  );

  const onScoreChange = (event) => {
    const { name, value } = event.target;
    setScores((current) => ({ ...current, [name]: value }));
  };

  const saveAssessment = async (event) => {
    event.preventDefault();
    setSavingAssessment(true);
    setError('');
    setStatus('');

    try {
      const payload = {
        aptitude_score: Number(scores.aptitude_score),
        communication_score: Number(scores.communication_score),
        psychometric_score: Number(scores.psychometric_score)
      };
      const response = await api.post('/assessment', payload);
      setAnalysis({
        ...analysis,
        ...response.data.analysis,
        scores: {
          aptitude_score: payload.aptitude_score,
          communication_score: payload.communication_score,
          psychometric_score: payload.psychometric_score
        }
      });
      setStatus('Assessment updated.');
      setGeneratingRecommendations(true);
      setRecommendationError('');
      try {
        await fetchRecommendations(payload);
      } catch (recommendationLoadError) {
        setRecommendationError(getErrorMessage(recommendationLoadError));
      } finally {
        setGeneratingRecommendations(false);
      }
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSavingAssessment(false);
    }
  };

  const refreshRecommendations = async () => {
    setGeneratingRecommendations(true);
    setRecommendationError('');
    try {
      await fetchRecommendations(scores);
      setStatus('Recommendations refreshed.');
    } catch (recommendationLoadError) {
      setRecommendationError(getErrorMessage(recommendationLoadError));
      if (!recommendations) {
        setRecommendations(
          buildLocalFallbackRecommendations({
            interestType: user?.interest_type || 'tech',
            jobs,
            courses
          })
        );
      }
    } finally {
      setGeneratingRecommendations(false);
    }
  };

  const sendChatMessage = async (event) => {
    event.preventDefault();
    const question = chatInput.trim();
    if (!question || sendingChat) {
      return;
    }

    setChatInput('');
    setSendingChat(true);
    setChatMessages((current) => [...current, { role: 'user', content: question }]);

    try {
      const nextRecommendations = await fetchRecommendations(scores, { question });
      const answer = buildAssistantReply(question, nextRecommendations);
      setChatMessages((current) => [...current, { role: 'assistant', content: answer }]);
      if (autoSpeak && speechSupport.synthesis) {
        speakText(answer);
      }
    } catch (chatError) {
      const fallbackReply = recommendations
        ? `${buildAssistantReply(question, recommendations)}\n\nLive AI answer is temporarily unavailable, so this response is based on your latest generated recommendations.`
        : `Unable to fetch AI response right now: ${getErrorMessage(chatError)}`;
      setChatMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: fallbackReply
        }
      ]);
      if (autoSpeak && speechSupport.synthesis) {
        speakText(fallbackReply);
      }
    } finally {
      setSendingChat(false);
    }
  };

  const startVoiceInput = () => {
    setVoiceError('');
    if (!speechSupport.recognition || !recognitionRef.current) {
      setVoiceError('Voice input is not supported in this browser.');
      return;
    }

    try {
      recognitionRef.current.start();
    } catch (_error) {
      setVoiceError('Unable to start microphone. Check browser mic permissions.');
    }
  };

  const stopVoiceInput = () => {
    if (!recognitionRef.current) {
      return;
    }

    try {
      recognitionRef.current.stop();
      setIsListening(false);
    } catch (_error) {
      // Ignore stop errors.
    }
  };

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-slate-200">
        Loading dashboard...
      </div>
    );
  }

  const recommendedJobs = recommendations?.placement_recommendation || recommendations?.job_recommendation || [];
  const recommendedInternships = recommendations?.internship_recommendation || [];
  const recommendedCourses = recommendations?.course_recommendation || [];
  const recommendedTrainings = recommendations?.training_recommendation || [];

  return (
    <section className="space-y-6">
      <div className="glass-panel rounded-3xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Dashboard</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">
              Welcome, {user?.name || 'Student'}
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Branch: <span className="text-slate-100">{user?.branch}</span> | Education:{' '}
              <span className="text-slate-100">{user?.education_level}</span> | Interest:{' '}
              <span className="text-slate-100">{user?.interest_type}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={refreshRecommendations}
            disabled={generatingRecommendations}
            className="rounded-xl border border-cyan-300/40 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generatingRecommendations ? 'Refreshing AI...' : 'Refresh AI Picks'}
          </button>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-slate-200">
            <span>Profile Completion</span>
            <span>
              {Number(profileCompletion?.percentage || 0)}% ({profileCompletion?.strength_label || 'Beginner'})
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-cyan-400 transition-all"
              style={{ width: `${Number(profileCompletion?.percentage || 0)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-panel rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white">Profile Rating Graph</h2>
          <p className="mt-1 text-sm text-slate-300">
            Profile rating: {analysis?.profile_rating_percentage ?? 0}% ({analysis?.rating_band || 'Pending'})
          </p>
          <div className="mt-4 h-72">
            <Line data={graphData} options={graphOptions} />
          </div>
        </div>

        <form onSubmit={saveAssessment} className="glass-panel rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white">Skill Scores Display</h2>
          <div className="mt-4 space-y-3">
            {[
              ['aptitude_score', 'Aptitude'],
              ['communication_score', 'Communication'],
              ['psychometric_score', 'Psychometric']
            ].map(([key, label]) => (
              <div key={key} className="rounded-xl border border-white/10 bg-slate-900/50 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-200">{label}</span>
                  <span className="font-semibold text-cyan-200">{scores[key]}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-cyan-400" style={{ width: `${scores[key]}%` }} />
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  name={key}
                  value={scores[key]}
                  onChange={onScoreChange}
                  className="mt-3 w-full rounded-lg border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300"
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={savingAssessment}
            className="mt-4 w-full rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingAssessment ? 'Saving...' : 'Save Scores'}
          </button>
        </form>
      </div>

      {(error || status || recommendationError) && (
        <div className="space-y-2">
          {error && <p className="rounded-xl bg-rose-400/15 px-3 py-2 text-sm text-rose-200">{error}</p>}
          {recommendationError && (
            <p className="rounded-xl bg-amber-400/15 px-3 py-2 text-sm text-amber-200">{recommendationError}</p>
          )}
          {status && <p className="rounded-xl bg-emerald-400/15 px-3 py-2 text-sm text-emerald-200">{status}</p>}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="glass-panel rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white">Recommended Jobs</h2>
          <div className="mt-4 space-y-3">
            {recommendedJobs.length > 0 &&
              recommendedJobs.map((job, index) => (
                <article key={`${job.title}-${index}`} className="rounded-xl border border-white/10 bg-slate-900/45 p-4">
                  <p className="font-medium text-slate-100">{job.title}</p>
                  {job.company && (
                    <p className="mt-1 text-sm text-slate-300">
                      {job.company} {job.location ? `| ${job.location}` : ''}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-slate-300">{job.reason}</p>
                </article>
              ))}

            {recommendedJobs.length === 0 &&
              jobs.slice(0, 4).map((job) => (
                <article key={job.id} className="rounded-xl border border-white/10 bg-slate-900/45 p-4">
                  <p className="font-medium text-slate-100">{job.job_role}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {job.company_name} | {job.location}
                  </p>
                </article>
              ))}

            {recommendedJobs.length === 0 && jobs.length === 0 && (
              <p className="text-sm text-slate-300">No recommendations yet.</p>
            )}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white">Recommended Courses</h2>
          <div className="mt-4 space-y-3">
            {recommendedCourses.length > 0 &&
              recommendedCourses.map((course, index) => (
                <article key={`${course.name}-${index}`} className="rounded-xl border border-white/10 bg-slate-900/45 p-4">
                  <p className="font-medium text-slate-100">{course.name}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    Platform: {course.platform} {course.category ? `| Category: ${course.category}` : ''}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">{course.reason}</p>
                  {course.link && (
                    <a
                      href={course.link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-sm font-medium text-cyan-200 hover:text-cyan-100"
                    >
                      Open Course
                    </a>
                  )}
                </article>
              ))}

            {recommendedCourses.length === 0 &&
              courses.slice(0, 4).map((course) => (
                <article key={course.id} className="rounded-xl border border-white/10 bg-slate-900/45 p-4">
                  <p className="font-medium text-slate-100">{course.course_name}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {course.duration_weeks} weeks | Level: {course.level}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">{course.description}</p>
                </article>
              ))}

            {recommendedCourses.length === 0 && courses.length === 0 && (
              <p className="text-sm text-slate-300">No course suggestions available.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="glass-panel rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white">Recommended Internships</h2>
          <div className="mt-4 space-y-3">
            {recommendedInternships.map((internship, index) => (
              <article key={`${internship.title}-${index}`} className="rounded-xl border border-white/10 bg-slate-900/45 p-4">
                <p className="font-medium text-slate-100">{internship.title}</p>
                <p className="mt-1 text-sm text-slate-300">
                  {internship.company} {internship.location ? `| ${internship.location}` : ''}
                </p>
                <p className="mt-1 text-sm text-slate-400">{internship.reason}</p>
              </article>
            ))}
            {recommendedInternships.length === 0 && (
              <p className="text-sm text-slate-300">No internship-specific picks available yet.</p>
            )}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white">Recommended Trainings</h2>
          <div className="mt-4 space-y-3">
            {recommendedTrainings.map((training, index) => (
              <article key={`${training.title}-${index}`} className="rounded-xl border border-white/10 bg-slate-900/45 p-4">
                <p className="font-medium text-slate-100">{training.title}</p>
                <p className="mt-1 text-sm text-slate-300">
                  {training.type} {training.duration ? `| ${training.duration}` : ''}
                </p>
                <p className="mt-1 text-sm text-slate-400">{training.reason}</p>
              </article>
            ))}
            {recommendedTrainings.length === 0 && (
              <p className="text-sm text-slate-300">No training tracks available yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="glass-panel rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white">Placement Probability</h2>
          <p className="mt-3 text-sm text-slate-200">
            Next 3 months: {recommendations?.placement_probability?.next_3_months || 'N/A'}
          </p>
          <p className="mt-1 text-sm text-slate-200">
            Next 6 months: {recommendations?.placement_probability?.next_6_months || 'N/A'}
          </p>
          <p className="mt-2 text-sm text-slate-300">
            {recommendations?.placement_probability?.reason || 'Generate AI recommendations to view prediction reasoning.'}
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white">Skill Gap Analysis</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-200">
            {(recommendations?.skill_gap_analysis || []).map((item, index) => (
              <p key={`${item.skill}-${index}`}>
                {item.skill}: {item.current_level} {'->'} {item.target_level}. {item.action}
              </p>
            ))}
            {(recommendations?.skill_gap_analysis || []).length === 0 && (
              <p className="text-slate-300">No skill-gap prediction available yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <h2 className="text-lg font-semibold text-white">AI Assistant Chat Widget</h2>
        <p className="mt-1 text-sm text-slate-300">
          Ask profile-specific questions and get recommendation-backed answers.
        </p>

        <div className="mt-4 max-h-64 space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-slate-900/45 p-3">
          {chatMessages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`rounded-lg px-3 py-2 text-sm ${
                message.role === 'assistant'
                  ? 'bg-slate-800/80 text-slate-100'
                  : 'ml-8 bg-cyan-400/20 text-cyan-100'
              }`}
            >
              <p className="mb-1 text-xs uppercase tracking-wide opacity-70">{message.role}</p>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ))}
        </div>

        <form onSubmit={sendChatMessage} className="mt-3 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Ask about jobs, courses, interview prep..."
              className="flex-1 rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-cyan-300"
            />
            <button
              type="submit"
              disabled={sendingChat}
              className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sendingChat ? 'Sending...' : 'Send'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={isListening ? stopVoiceInput : startVoiceInput}
              disabled={!speechSupport.recognition}
              className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isListening ? 'Stop Mic' : 'Voice Input'}
            </button>

            <label className="flex items-center gap-2 text-xs text-slate-200">
              <input
                type="checkbox"
                checked={autoSpeak}
                onChange={(event) => setAutoSpeak(event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-slate-900 text-cyan-400"
              />
              Auto speak response
            </label>

            <button
              type="button"
              onClick={stopSpeaking}
              disabled={!speechSupport.synthesis}
              className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Stop Speech
            </button>
          </div>
        </form>

        {!speechSupport.recognition && (
          <p className="mt-3 rounded-xl bg-amber-400/15 px-3 py-2 text-sm text-amber-200">
            Voice input is not supported in this browser.
          </p>
        )}
        {voiceError && <p className="mt-3 rounded-xl bg-rose-400/15 px-3 py-2 text-sm text-rose-200">{voiceError}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="glass-panel rounded-2xl p-5">
          <h3 className="text-sm uppercase tracking-wide text-slate-300">Aptitude Ratio</h3>
          <p className="mt-2 text-2xl font-semibold text-white">
            {analysis?.scores?.aptitude_score ?? 0}%
          </p>
        </article>
        <article className="glass-panel rounded-2xl p-5">
          <h3 className="text-sm uppercase tracking-wide text-slate-300">Course Completion</h3>
          <p className="mt-2 text-2xl font-semibold text-white">
            {progress?.course_stats?.completion_percentage ?? 0}%
          </p>
        </article>
        <article className="glass-panel rounded-2xl p-5">
          <h3 className="text-sm uppercase tracking-wide text-slate-300">Workshop Completion</h3>
          <p className="mt-2 text-2xl font-semibold text-white">
            {progress?.workshop_stats?.completion_percentage ?? 0}%
          </p>
        </article>
        <article className="glass-panel rounded-2xl p-5">
          <h3 className="text-sm uppercase tracking-wide text-slate-300">Overall Progress</h3>
          <p className="mt-2 text-2xl font-semibold text-white">
            {progress?.overall_completion_percentage ?? 0}%
          </p>
        </article>
      </div>
    </section>
  );
}

export default DashboardPage;
