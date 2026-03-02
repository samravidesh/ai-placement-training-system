import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const getErrorMessage = (error) => {
  return error?.response?.data?.message || error?.message || 'Registration failed';
};

const initialForm = {
  email: '',
  password: ''
};

function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/register', form);
      login(response.data);
      navigate('/onboarding', { replace: true });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl">
      <div className="glass-panel rounded-3xl p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-white">Register</h1>
        <p className="mt-1 text-sm text-slate-300">Create your account with email and password.</p>

        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          <label className="block">
            <span className="text-sm text-slate-200">Email</span>
            <input
              type="email"
              name="email"
              required
              value={form.email}
              onChange={onChange}
              className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-cyan-300"
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-200">Password</span>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              value={form.password}
              onChange={onChange}
              className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-cyan-300"
            />
          </label>

          {error && <p className="rounded-xl bg-rose-400/15 px-3 py-2 text-sm text-rose-200">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-300">
          Already registered?{' '}
          <Link to="/login" className="font-medium text-cyan-200 hover:text-cyan-100">
            Login here
          </Link>
        </p>
      </div>
    </section>
  );
}

export default RegisterPage;
