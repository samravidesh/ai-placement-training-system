import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const interestOptions = ['govt', 'private', 'tech', 'non-tech'];

const getErrorMessage = (error) => {
  return error?.response?.data?.message || error?.message || 'Request failed';
};

function JobRecommendationsPage() {
  const { user } = useAuth();
  const recommendationStorageKey = useMemo(
    () => (user?.id ? `placement-platform:job-recommendations:${user.id}` : ''),
    [user?.id]
  );

  const [interestType, setInterestType] = useState(user?.interest_type || 'tech');
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [jobsError, setJobsError] = useState('');
  const [jobsStatus, setJobsStatus] = useState('');

  const [form, setForm] = useState({
    user_education: user?.education_level || '',
    interest_type: user?.interest_type || 'tech',
    aptitude_score: 70,
    communication_score: 70,
    psychometric_score: 70
  });
  const [recommendations, setRecommendations] = useState(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState('');
  const [scoresReady, setScoresReady] = useState(false);
  const [initialRecommendationsTriggered, setInitialRecommendationsTriggered] = useState(false);

  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    setJobsError('');

    try {
      const response = await api.get('/jobs', {
        params: interestType ? { interest_type: interestType } : {}
      });
      setJobs(response.data.jobs || []);
    } catch (error) {
      setJobsError(getErrorMessage(error));
    } finally {
      setJobsLoading(false);
    }
  }, [interestType]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }
    const interval = setInterval(() => {
      loadJobs();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadJobs, user?.id]);

  useEffect(() => {
    const loadScores = async () => {
      try {
        const response = await api.get('/assessment/profile-analysis');
        const scores = response.data.scores || {};
        setForm((current) => ({
          ...current,
          aptitude_score: Number(scores.aptitude_score || current.aptitude_score),
          communication_score: Number(scores.communication_score || current.communication_score),
          psychometric_score: Number(scores.psychometric_score || current.psychometric_score)
        }));
      } catch (_error) {
        // Assessment may not exist yet.
      } finally {
        setScoresReady(true);
      }
    };

    loadScores();
  }, []);

  useEffect(() => {
    if (!recommendationStorageKey) {
      return;
    }

    try {
      const raw = sessionStorage.getItem(recommendationStorageKey);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        setRecommendations(parsed);
      }
    } catch (_error) {
      // Ignore cache parse failures.
    }
  }, [recommendationStorageKey]);

  useEffect(() => {
    setInitialRecommendationsTriggered(false);
  }, [user?.id]);

  const applyForJob = async (jobId) => {
    setApplyingJobId(jobId);
    setJobsError('');
    setJobsStatus('');

    try {
      await api.post(`/jobs/${jobId}/apply`);
      setJobsStatus('Application submitted successfully.');
    } catch (error) {
      setJobsError(getErrorMessage(error));
    } finally {
      setApplyingJobId(null);
    }
  };

  const onFormChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const requestRecommendations = useCallback(
    async (payload, options = {}) => {
      const { persist = true } = options;
      const response = await api.post('/recommendations/ai', payload);
      const nextRecommendations = response.data.recommendations;
      setRecommendations(nextRecommendations);

      if (persist && recommendationStorageKey) {
        sessionStorage.setItem(recommendationStorageKey, JSON.stringify(nextRecommendations));
      }

      return nextRecommendations;
    },
    [recommendationStorageKey]
  );

  useEffect(() => {
    if (!user?.id || !scoresReady || initialRecommendationsTriggered) {
      return;
    }

    setInitialRecommendationsTriggered(true);
    setRecommendationLoading(true);
    setRecommendationError('');

    const payload = {
      user_education: form.user_education || user?.education_level || 'Undergraduate',
      interest_type: form.interest_type || user?.interest_type || 'tech',
      skill_scores: {
        aptitude_score: Number(form.aptitude_score),
        communication_score: Number(form.communication_score),
        psychometric_score: Number(form.psychometric_score)
      }
    };

    requestRecommendations(payload).catch((error) => {
      setRecommendationError(getErrorMessage(error));
    }).finally(() => {
      setRecommendationLoading(false);
    });
  }, [
    form.aptitude_score,
    form.communication_score,
    form.interest_type,
    form.psychometric_score,
    form.user_education,
    initialRecommendationsTriggered,
    requestRecommendations,
    scoresReady,
    user?.education_level,
    user?.id,
    user?.interest_type
  ]);

  useEffect(() => {
    if (!user?.id || !scoresReady) {
      return undefined;
    }
    const interval = setInterval(() => {
      const payload = {
        user_education: form.user_education || user?.education_level || 'Undergraduate',
        interest_type: form.interest_type || user?.interest_type || 'tech',
        skill_scores: {
          aptitude_score: Number(form.aptitude_score),
          communication_score: Number(form.communication_score),
          psychometric_score: Number(form.psychometric_score)
        }
      };
      requestRecommendations(payload, { persist: false }).catch(() => {
        // Silent polling failures
      });
    }, 45000);
    return () => clearInterval(interval);
  }, [
    form.aptitude_score,
    form.communication_score,
    form.interest_type,
    form.psychometric_score,
    form.user_education,
    requestRecommendations,
    scoresReady,
    user?.education_level,
    user?.id,
    user?.interest_type
  ]);

  const generateRecommendations = async (event) => {
    event.preventDefault();
    setRecommendationLoading(true);
    setRecommendationError('');

    try {
      const payload = {
        user_education: form.user_education,
        interest_type: form.interest_type,
        skill_scores: {
          aptitude_score: Number(form.aptitude_score),
          communication_score: Number(form.communication_score),
          psychometric_score: Number(form.psychometric_score)
        }
      };

      await requestRecommendations(payload);
    } catch (error) {
      setRecommendationError(getErrorMessage(error));
    } finally {
      setRecommendationLoading(false);
    }
  };

  const hasJobs = jobs.length > 0;

  return (
    <section className="space-y-6">
      <div className="glass-panel rounded-3xl p-6">
        <h1 className="text-2xl font-semibold text-white">Job Recommendations</h1>
        <p className="mt-2 text-sm text-slate-300">
          Filter jobs by interest type, apply directly, and generate AI-driven recommendation bundles.
        </p>
      </div>

      <div className={`grid gap-6 ${hasJobs ? 'lg:grid-cols-[1.25fr_1fr]' : 'grid-cols-1'}`}>
        {hasJobs && (
          <div className="glass-panel rounded-2xl p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Available Jobs</h2>
              <p className="text-sm text-slate-300">Showing opportunities for selected interest type.</p>
            </div>
            <label className="text-sm text-slate-200">
              Interest
              <select
                value={interestType}
                onChange={(event) => setInterestType(event.target.value)}
                className="ml-2 rounded-lg border border-white/15 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-cyan-300"
              >
                {interestOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {jobsError && <p className="mt-4 rounded-xl bg-rose-400/15 px-3 py-2 text-sm text-rose-200">{jobsError}</p>}
          {jobsStatus && <p className="mt-4 rounded-xl bg-emerald-400/15 px-3 py-2 text-sm text-emerald-200">{jobsStatus}</p>}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {jobsLoading && <p className="text-sm text-slate-300">Loading jobs...</p>}
            {jobs.map((job) => (
              <article key={job.id} className="rounded-xl border border-white/10 bg-slate-900/45 p-4">
                <h3 className="text-base font-semibold text-slate-100">{job.job_role}</h3>
                <p className="mt-1 text-sm text-slate-300">
                  {job.company_name} | {job.location} | {job.job_type}
                </p>
                <p className="mt-1 text-sm text-slate-300">Package: {job.package} LPA</p>
                <p className="mt-2 text-sm text-slate-400">Skills: {job.required_skills}</p>
                <button
                  type="button"
                  onClick={() => applyForJob(job.id)}
                  disabled={applyingJobId === job.id}
                  className="mt-3 rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {applyingJobId === job.id ? 'Applying...' : 'Apply'}
                </button>
              </article>
            ))}
          </div>
          </div>
        )}

        {!hasJobs && !jobsLoading && (
          <div className="glass-panel rounded-2xl p-6 text-center">
            <h2 className="text-lg font-semibold text-white">No Jobs Available</h2>
            <p className="mt-2 text-sm text-slate-300">
              No matching jobs exist currently. You can still generate full AI recommendations below.
            </p>
          </div>
        )}

        <form onSubmit={generateRecommendations} className={`glass-panel rounded-2xl p-5 ${hasJobs ? '' : 'w-full'}`}>
          <h2 className="text-lg font-semibold text-white">AI Recommendations</h2>
          <p className="mt-1 text-sm text-slate-300">
            Generate ML-ranked courses, trainings, internships, placements, and strategy guidance.
          </p>

          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-sm text-slate-200">Education</span>
              <input
                type="text"
                name="user_education"
                required
                value={form.user_education}
                onChange={onFormChange}
                className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-cyan-300"
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-200">Interest Type</span>
              <select
                name="interest_type"
                required
                value={form.interest_type}
                onChange={onFormChange}
                className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-cyan-300"
              >
                {interestOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm text-slate-200">Aptitude Score</span>
              <input
                type="number"
                min="0"
                max="100"
                name="aptitude_score"
                required
                value={form.aptitude_score}
                onChange={onFormChange}
                className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-cyan-300"
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-200">Communication Score</span>
              <input
                type="number"
                min="0"
                max="100"
                name="communication_score"
                required
                value={form.communication_score}
                onChange={onFormChange}
                className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-cyan-300"
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-200">Psychometric Score</span>
              <input
                type="number"
                min="0"
                max="100"
                name="psychometric_score"
                required
                value={form.psychometric_score}
                onChange={onFormChange}
                className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-cyan-300"
              />
            </label>
          </div>

          {recommendationError && (
            <p className="mt-4 rounded-xl bg-rose-400/15 px-3 py-2 text-sm text-rose-200">{recommendationError}</p>
          )}

          <button
            type="submit"
            disabled={recommendationLoading}
            className="mt-4 w-full rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {recommendationLoading ? 'Generating...' : 'Generate Recommendations'}
          </button>

          {recommendations && (
            <div className="mt-5 space-y-4 rounded-xl border border-white/10 bg-slate-900/45 p-4">
              {recommendations.assistant_answer && (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-200">Assistant Answer</h3>
                  <p className="mt-1 text-sm text-slate-200 whitespace-pre-wrap">{recommendations.assistant_answer}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-200">Profile Summary</h3>
                <p className="mt-1 text-sm text-slate-200">{recommendations.profile_summary}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-200">Placement Suggestions</h3>
                <ul className="mt-2 space-y-2 text-sm text-slate-200">
                  {(recommendations.placement_recommendation || recommendations.job_recommendation || []).map((item, index) => (
                    <li key={`${item.title}-${index}`}>
                      {item.title}
                      {item.company ? ` (${item.company})` : ''}: {item.reason}
                      {item.match_ratio ? ` Match Ratio: ${item.match_ratio}.` : ''}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-200">Internship Suggestions</h3>
                <ul className="mt-2 space-y-2 text-sm text-slate-200">
                  {(recommendations.internship_recommendation || []).map((item, index) => (
                    <li key={`${item.title}-${index}`}>
                      {item.title}
                      {item.company ? ` (${item.company})` : ''}: {item.reason}
                      {item.match_ratio ? ` Match Ratio: ${item.match_ratio}.` : ''}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-200">Course Suggestions</h3>
                <ul className="mt-2 space-y-2 text-sm text-slate-200">
                  {(recommendations.course_recommendation || []).map((item, index) => (
                    <li key={`${item.name}-${index}`}>
                      {item.name} ({item.platform}{item.category ? `, ${item.category}` : ''}): {item.reason}
                      {item.match_ratio ? ` Match Ratio: ${item.match_ratio}.` : ''}
                      {item.link ? ` Link: ${item.link}` : ''}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-200">Training Suggestions</h3>
                <ul className="mt-2 space-y-2 text-sm text-slate-200">
                  {(recommendations.training_recommendation || []).map((item, index) => (
                    <li key={`${item.title}-${index}`}>
                      {item.title} ({item.type}{item.duration ? `, ${item.duration}` : ''}): {item.reason}
                      {item.match_ratio ? ` Match Ratio: ${item.match_ratio}.` : ''}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-200">Certification Suggestions</h3>
                <ul className="mt-2 space-y-2 text-sm text-slate-200">
                  {(recommendations.certification_recommendation || []).map((item, index) => (
                    <li key={`${item.name}-${index}`}>
                      {item.name} ({item.provider}): {item.reason}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-200">Higher Education</h3>
                <ul className="mt-2 space-y-2 text-sm text-slate-200">
                  {(recommendations.higher_education_suggestion || []).map((item, index) => (
                    <li key={`${item.program}-${index}`}>
                      {item.program}: {item.reason}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-200">Startup Ideas</h3>
                <ul className="mt-2 space-y-2 text-sm text-slate-200">
                  {(recommendations.startup_idea_suggestion || []).map((item, index) => (
                    <li key={`${item.idea}-${index}`}>
                      {item.idea}: {item.reason}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-200">Company Targets</h3>
                <ul className="mt-2 space-y-2 text-sm text-slate-200">
                  {(recommendations.company_target_suggestion || []).map((item, index) => (
                    <li key={`${item.company_type}-${index}`}>
                      {item.company_type} ({item.role_focus}): {item.reason}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-200">Skill Gap Analysis</h3>
                <ul className="mt-2 space-y-2 text-sm text-slate-200">
                  {(recommendations.skill_gap_analysis || []).map((item, index) => (
                    <li key={`${item.skill}-${index}`}>
                      {item.skill}: {item.current_level} {'->'} {item.target_level}. {item.action}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-200">Interview Preparation Plan</h3>
                <ul className="mt-2 space-y-2 text-sm text-slate-200">
                  {(recommendations.interview_preparation_plan || []).map((item, index) => (
                    <li key={`${item.phase}-${index}`}>
                      {item.phase}: {item.focus}. {item.action}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-200">RAG Retrieval Context</h3>
                <p className="mt-2 text-sm text-slate-200">
                  Strategy: {recommendations.retrieval_context?.strategy || 'N/A'}
                </p>
                <p className="mt-1 text-sm text-slate-200">
                  Indexed: {recommendations.retrieval_context?.indexed_documents || 0},
                  Embedded: {recommendations.retrieval_context?.embedded_documents || 0},
                  Matched: {recommendations.retrieval_context?.matched_documents || 0}
                </p>
                <ul className="mt-2 space-y-2 text-sm text-slate-300">
                  {(recommendations.retrieval_context?.top_contexts || []).slice(0, 5).map((item, index) => (
                    <li key={`${item.type}-${item.source_id}-${index}`}>
                      {item.type}: {item.title} ({item.relevance_score})
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-200">Placement Probability</h3>
                <p className="mt-2 text-sm text-slate-200">
                  Next 3 months: {recommendations.placement_probability?.next_3_months || 'N/A'}
                </p>
                <p className="mt-1 text-sm text-slate-200">
                  Next 6 months: {recommendations.placement_probability?.next_6_months || 'N/A'}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {recommendations.placement_probability?.reason || ''}
                </p>
              </div>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}

export default JobRecommendationsPage;
