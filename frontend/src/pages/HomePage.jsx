import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const features = [
  {
    title: 'Career Dashboard',
    description: 'Track profile strength, skills, and completion progress in one place.'
  },
  {
    title: 'Job Recommendations',
    description: 'Discover jobs mapped to your interest type and apply instantly.'
  },
  {
    title: 'Training and Workshops',
    description: 'Follow a structured six-month plan with courses and workshop modules.'
  },
  {
    title: 'AI Assistant',
    description: 'Generate tailored career suggestions based on your assessment scores.'
  }
];

function HomePage() {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <section className="space-y-8">
      <div className="glass-panel rounded-3xl p-8 sm:p-10">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Placement and Training Platform</p>
        <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
          Build your profile, train with structure, and move toward placements faster.
        </h1>
        <p className="mt-4 max-w-3xl text-slate-300">
          This platform combines assessments, recommendations, jobs, workshops, and admin workflows into one frontend.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {!isAuthenticated && (
            <>
              <Link
                to="/register"
                className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
              >
                Create Account
              </Link>
              <Link
                to="/login"
                className="rounded-xl border border-cyan-300/40 px-5 py-2.5 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/10"
              >
                Login
              </Link>
            </>
          )}
          {isAuthenticated && (
            <Link
              to="/dashboard"
              className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Open Dashboard
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/admin"
              className="rounded-xl border border-emerald-300/40 px-5 py-2.5 text-sm font-semibold text-emerald-100 hover:bg-emerald-300/10"
            >
              Go to Admin Panel
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {features.map((feature) => (
          <article key={feature.title} className="glass-panel rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-white">{feature.title}</h2>
            <p className="mt-2 text-sm text-slate-300">{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default HomePage;
