import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  createSpeechRecognition,
  getSpeechSupport,
  speakText,
  stopSpeaking
} from '../utils/speech';

const interestOptions = ['govt', 'private', 'tech', 'non-tech'];

const getErrorMessage = (error) => {
  return error?.response?.data?.message || error?.message || 'Request failed';
};

const buildOfflineReply = ({ question, scores, interestType }) => {
  return `I could not reach the live AI service right now. Based on your ${interestType} profile and scores (Aptitude ${scores.aptitude_score}, Communication ${scores.communication_score}, Psychometric ${scores.psychometric_score}), continue with one placement-focused role, one internship application, and one course/training module this week. Question noted: "${question}". Retry in a few moments for live personalized ranking.`;
};

const formatAssistantReply = (question, recommendations) => {
  if (recommendations?.assistant_answer) {
    return recommendations.assistant_answer;
  }

  const jobs = recommendations?.placement_recommendation || recommendations?.job_recommendation || [];
  const internships = recommendations?.internship_recommendation || [];
  const courses = recommendations?.course_recommendation || [];
  const trainings = recommendations?.training_recommendation || [];
  const profileSummary = recommendations?.profile_summary || 'Here is your personalized guidance.';
  const placementChance = recommendations?.placement_probability?.next_6_months || 'N/A';

  const topJobs = jobs.slice(0, 2).map((item) => item.title).join(', ') || 'No job suggestions';
  const topInternships = internships.slice(0, 1).map((item) => item.title).join(', ') || 'No internship suggestions';
  const topCourses = courses.slice(0, 2).map((item) => item.name).join(', ') || 'No course suggestions';
  const topTrainings = trainings.slice(0, 1).map((item) => item.title).join(', ') || 'No training suggestions';

  return `${profileSummary}\n\nFor your question "${question}", start with placements: ${topJobs}. Internship track: ${topInternships}. Upskill via courses: ${topCourses} and training: ${topTrainings}. 6-month placement probability: ${placementChance}.`;
};

function AiAssistantChatPage() {
  const { user } = useAuth();

  const recognitionRef = useRef(null);
  const speechSupport = useMemo(() => getSpeechSupport(), []);

  const [interestType, setInterestType] = useState(user?.interest_type || 'tech');
  const [scores, setScores] = useState({
    aptitude_score: 70,
    communication_score: 70,
    psychometric_score: 70
  });
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Ask your career query and I will return AI-backed recommendations from your profile.'
    }
  ]);
  const [sending, setSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [error, setError] = useState('');
  const [voiceError, setVoiceError] = useState('');

  useEffect(() => {
    const loadScores = async () => {
      try {
        const response = await api.get('/assessment/profile-analysis');
        const profileScores = response.data.scores || {};
        setScores({
          aptitude_score: Number(profileScores.aptitude_score || 70),
          communication_score: Number(profileScores.communication_score || 70),
          psychometric_score: Number(profileScores.psychometric_score || 70)
        });
      } catch (_error) {
        // Assessment might not be saved yet; defaults are fine.
      }
    };

    loadScores();
  }, []);

  useEffect(() => {
    if (!speechSupport.recognition) {
      return undefined;
    }

    recognitionRef.current = createSpeechRecognition({
      onTranscript: (transcript) => {
        setQuery((current) => {
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

  const canSend = useMemo(() => query.trim().length > 0 && !sending, [query, sending]);

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

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!canSend) {
      return;
    }

    const question = query.trim();
    setError('');
    setVoiceError('');
    setSending(true);
    setQuery('');
    setMessages((current) => [...current, { role: 'user', content: question }]);

    try {
      const response = await api.post('/recommendations/ai', {
        user_education: user?.education_level || 'Undergraduate',
        interest_type: interestType,
        question,
        skill_scores: {
          aptitude_score: Number(scores.aptitude_score),
          communication_score: Number(scores.communication_score),
          psychometric_score: Number(scores.psychometric_score)
        }
      });

      const assistantReply = formatAssistantReply(question, response.data.recommendations);
      setMessages((current) => [...current, { role: 'assistant', content: assistantReply }]);
      if (autoSpeak && speechSupport.synthesis) {
        speakText(assistantReply);
      }
    } catch (sendError) {
      const message = getErrorMessage(sendError);
      setError(message);
      const fallbackReply = buildOfflineReply({
        question,
        scores,
        interestType
      });
      setMessages((current) => [...current, { role: 'assistant', content: fallbackReply }]);
      if (autoSpeak && speechSupport.synthesis) {
        speakText(fallbackReply);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="glass-panel rounded-3xl p-6">
        <h1 className="text-2xl font-semibold text-white">AI Assistant Chat</h1>
        <p className="mt-2 text-sm text-slate-300">
          Chat-style interface powered by recommendation APIs using your profile and score inputs.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="glass-panel rounded-2xl p-5">
          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-xl px-4 py-3 text-sm ${
                  message.role === 'assistant'
                    ? 'bg-slate-900/70 text-slate-100'
                    : 'ml-8 bg-cyan-400/20 text-cyan-100'
                }`}
              >
                <p className="mb-1 text-xs uppercase tracking-wide opacity-70">{message.role}</p>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            ))}
          </div>

          <form onSubmit={sendMessage} className="mt-4 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="flex-1 rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-cyan-300"
                placeholder="Ask career guidance..."
              />
              <button
                type="submit"
                disabled={!canSend}
                className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? 'Sending...' : 'Send'}
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
          {error && <p className="mt-3 rounded-xl bg-rose-400/15 px-3 py-2 text-sm text-rose-200">{error}</p>}
        </div>

        <aside className="glass-panel rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white">Assistant Inputs</h2>
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-sm text-slate-200">Interest Type</span>
              <select
                value={interestType}
                onChange={(event) => setInterestType(event.target.value)}
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
              <span className="text-sm text-slate-200">Aptitude</span>
              <input
                type="number"
                min="0"
                max="100"
                value={scores.aptitude_score}
                onChange={(event) =>
                  setScores((current) => ({ ...current, aptitude_score: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-cyan-300"
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-200">Communication</span>
              <input
                type="number"
                min="0"
                max="100"
                value={scores.communication_score}
                onChange={(event) =>
                  setScores((current) => ({ ...current, communication_score: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-cyan-300"
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-200">Psychometric</span>
              <input
                type="number"
                min="0"
                max="100"
                value={scores.psychometric_score}
                onChange={(event) =>
                  setScores((current) => ({ ...current, psychometric_score: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-cyan-300"
              />
            </label>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default AiAssistantChatPage;
