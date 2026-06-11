import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiService from '../../services/api';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
);
const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
);

const Register = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', phone: '', designation: '', employeeId: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [passwordFocused, setPasswordFocused] = useState(false);

  const hasMinLength = form.password.length >= 8;
  const hasUppercase = /[A-Z]/.test(form.password);
  const hasLowercase = /[a-z]/.test(form.password);
  const hasNumber = /\d/.test(form.password);
  const hasSpecialChar = /[@$!%*?&#]/.test(form.password);
  const allMet = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;

  const handleChange = e => {
    const { name, value } = e.target;
    if (name === 'phone') {
      const digits = value.replace(/\D/g, '');
      if (digits.length <= 10) {
        setForm(prev => ({ ...prev, phone: digits }));
      }
    } else if (name === 'email') {
      if (value.length < 30) {
        setForm(prev => ({ ...prev, email: value }));
      }
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, phone, designation, employeeId, password, confirmPassword } = form;

    if (!name || !email || !phone || !designation || !employeeId || !password || !confirmPassword) return setErrorMsg('All fields are required.');
    if (password !== confirmPassword) return setErrorMsg('Passwords do not match.');
    if (!PASSWORD_REGEX.test(password)) return setErrorMsg('Password must be 8+ chars, with upper, lower, number, & special char.');

    setLoading(true); setErrorMsg(''); setSuccessMsg('');

    try {
      await apiService('/register', {
        method: 'POST',
        body: JSON.stringify({ name, email: email.toLowerCase().trim(), phone: phone.trim(), designation: designation.trim(), employeeId: employeeId.toUpperCase().trim(), password, confirmPassword })
      });
      setSuccessMsg('Account registered! Please wait for administrator verification.');
      setForm({ name: '', email: '', phone: '', designation: '', employeeId: '', password: '', confirmPassword: '' });
    } catch (err) { setErrorMsg(err.message || 'Registration failed. Check your connection or unique fields.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)] py-10 px-5">
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
          font-size: 1.75rem;
          margin-bottom: 8px;
        }
        .tc-auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-width: 900px;
          margin: 0 auto;
        }
      `}</style>
      <div className="tc-card tc-auth-card">
        <div className="tc-auth-header">
          <img src="/Logo.jpeg" alt="Tasktrack System" className="tc-auth-logo" />
          <h1 className="tc-heading-xl mb-2">Create Account</h1>
          <p className="tc-body">Register as a new employee for TOPD Access</p>
        </div>

        {errorMsg && (
          <div className="p-3 px-4 bg-[var(--color-danger-bg)] text-[#dc2626] rounded-lg text-sm mb-6 border border-[rgba(239,68,68,0.2)]">
            {errorMsg}
          </div>
        )}

        {successMsg ? (
          <div className="text-center">
            <div className="p-4 bg-[var(--color-success-bg)] text-[#047857] rounded-lg text-sm mb-6 border border-[rgba(16,185,129,0.2)]">
              {successMsg}
            </div>
            <p className="tc-body mb-6">Your account approval request has been sent to the Super Admin.</p>
            <button className="tc-btn tc-btn-primary w-full justify-center p-3" onClick={() => navigate('/login')}>
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="tc-auth-form">
            <div className="tc-form-group">
              <label className="tc-form-label">Full Name *</label>
              <input type="text" className="tc-form-input" name="name" placeholder="enter your full name" value={form.name} onChange={handleChange} disabled={loading} required />
            </div>

            <div className="tc-grid-2">
              <div className="tc-form-group">
                <label className="tc-form-label">Email Address *</label>
                <input type="email" className="tc-form-input" name="email" placeholder="enter email address" value={form.email} onChange={handleChange} disabled={loading} required />
              </div>
              <div className="tc-form-group">
                <label className="tc-form-label">Phone Number *</label>
                <input type="text" className="tc-form-input" name="phone" placeholder="enter phone number" value={form.phone} onChange={handleChange} disabled={loading} required />
              </div>
            </div>

            <div className="tc-grid-2">
              <div className="tc-form-group">
                <label className="tc-form-label">Designation *</label>
                <input type="text" className="tc-form-input" name="designation" placeholder="enter designation" value={form.designation} onChange={handleChange} disabled={loading} required />
              </div>
              <div className="tc-form-group">
                <label className="tc-form-label">Employee ID *</label>
                <input type="text" className="tc-form-input" name="employeeId" placeholder="enter employee id" value={form.employeeId} onChange={handleChange} disabled={loading} required />
              </div>
            </div>

            <div className="tc-form-group">
              <label className="tc-form-label">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="tc-form-input pr-10"
                  name="password"
                  placeholder="Minimum 8 characters"
                  value={form.password}
                  onChange={handleChange}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  disabled={loading}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-none border-none text-[var(--color-text-secondary)] cursor-pointer flex">
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {(passwordFocused || form.password.length > 0) && !allMet && (
                <div className="border border-[var(--color-border)] bg-[var(--color-bg-subtle)] rounded-lg text-xs p-3 mt-2 flex flex-col gap-1.5">
                  <div className="font-semibold text-[var(--color-text-primary)] mb-0.5">Password requirements:</div>
                  <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-500 font-semibold' : 'text-[var(--color-text-secondary)] opacity-60'}`}>
                    <span>{hasMinLength ? '✓' : '•'}</span> Min 8 characters
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-500 font-semibold' : 'text-[var(--color-text-secondary)] opacity-60'}`}>
                    <span>{hasUppercase ? '✓' : '•'}</span> One uppercase letter (A-Z)
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasLowercase ? 'text-emerald-500 font-semibold' : 'text-[var(--color-text-secondary)] opacity-60'}`}>
                    <span>{hasLowercase ? '✓' : '•'}</span> One lowercase letter (a-z)
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-500 font-semibold' : 'text-[var(--color-text-secondary)] opacity-60'}`}>
                    <span>{hasNumber ? '✓' : '•'}</span> One number (0-9)
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasSpecialChar ? 'text-emerald-500 font-semibold' : 'text-[var(--color-text-secondary)] opacity-60'}`}>
                    <span>{hasSpecialChar ? '✓' : '•'}</span> One special character (@$!%*?&#)
                  </div>
                </div>
              )}
            </div>

            <div className="tc-form-group">
              <label className="tc-form-label">Confirm Password *</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="tc-form-input pr-10"
                  name="confirmPassword"
                  placeholder="Re-enter password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  disabled={loading}
                  required
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-none border-none text-[var(--color-text-secondary)] cursor-pointer flex">
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {form.confirmPassword && (
                <span className={`text-xs mt-1.5 block font-medium ${form.password === form.confirmPassword ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {form.password === form.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                </span>
              )}
            </div>

            <button type="submit" className="tc-btn tc-btn-primary w-full justify-center mt-3 p-3" disabled={loading}>
              {loading ? <div className="tc-spinner w-5 h-5 border-2 border-[rgba(255,255,255,0.3)] border-t-white" /> : 'Register'}
            </button>
          </form>
        )}

        {!successMsg && (
          <div className="text-center mt-8 text-sm text-[var(--color-text-secondary)]">
            Already registered? <Link to="/login" className="text-[var(--color-brand-primary)] font-semibold no-underline">Login here</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;
