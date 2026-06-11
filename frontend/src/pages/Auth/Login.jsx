import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { loginFailure, loginStart, loginSuccess } from '../../redux/slices/authSlice';
import apiService from '../../services/api';

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
);
const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
);

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return setErrorMsg('Please enter both email and password.');

    setLoading(true); setErrorMsg(''); dispatch(loginStart());

    try {
      const data = await apiService('/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      dispatch(loginSuccess(data.user));

      if (data.user.approvalStatus === 'PENDING') navigate('/pending-approval');
      else {
        const defaultPaths = { SUPER_ADMIN: '/admin/dashboard', MANAGEMENT: '/management/dashboard', TEAM_LEAD: '/lead/dashboard', CONTRIBUTOR: '/contributor/dashboard' };
        navigate(defaultPaths[data.user.role] || '/');
      }
    } catch (err) { setErrorMsg(err.message || 'Invalid email or password.'); dispatch(loginFailure(err.message)); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)] p-5">
      <style>{`
        .tc-auth-logo {
          height: 72px;
          width: auto;
          margin: 0 auto 32px;
          display: block;
          object-fit: contain;
        }
        .tc-auth-header {
          text-align: center;
          margin-bottom: 40px;
        }
        .tc-auth-header h1 {
          font-size: 2.5rem;
          margin-bottom: 8px;
        }
        .tc-auth-header p {
          font-size: 1.125rem;
        }
        .tc-auth-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
          max-width: 700px;
          margin: 0 auto;
        }
        .tc-auth-form .tc-form-label {
          font-size: 16px;
        }
        .tc-auth-form .tc-form-input {
          font-size: 16px;
          padding: 14px 16px;
        }
        .tc-auth-form .tc-btn {
          font-size: 16px;
          padding: 14px;
        }
        .tc-auth-card .text-center {
          font-size: 16px;
        }
      `}</style>
      <div className="tc-card tc-auth-card">
        <div className="tc-auth-header">
          <img src="/Logo.jpeg" alt="Tasktrack System" className="tc-auth-logo" />
          <h1 className="tc-heading-xl mb-2">Welcome Back</h1>
          <p className="tc-body">Sign in to access your workspace</p>
        </div>

        {errorMsg && (
          <div className="p-3 px-4 bg-[var(--color-danger-bg)] text-[#dc2626] rounded-lg text-sm mb-6 border border-[rgba(239,68,68,0.2)]">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="tc-auth-form">
          <div className="tc-form-group">
            <label className="tc-form-label">Email Address</label>
            <input type="email" className="tc-form-input" placeholder="enter email address" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} required />
          </div>

          <div className="tc-form-group">
            <label className="tc-form-label">Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} className="tc-form-input pr-10" placeholder="Enter password" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-none border-none text-[var(--color-text-secondary)] cursor-pointer flex">
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <button type="submit" className="tc-btn tc-btn-primary w-full justify-center mt-2 p-3" disabled={loading}>
            {loading ? <div className="tc-spinner w-5 h-5 border-2 border-[rgba(255,255,255,0.3)] border-t-white" /> : 'Sign In'}
          </button>
        </form>

        <div className="text-center mt-8 text-sm text-[var(--color-text-secondary)]">
          New employee? <Link to="/register" className="text-[var(--color-brand-primary)] font-semibold no-underline">Register here</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
