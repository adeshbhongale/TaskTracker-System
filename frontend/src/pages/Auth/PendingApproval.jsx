import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutSuccess, loginSuccess } from '../../redux/slices/authSlice';
import apiService from '../../services/api';

const PendingApproval = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState('');

  const checkStatusSilent = async () => {
    try {
      const token = localStorage.getItem('refreshToken');
      if (!token) return;
      
      const data = await apiService('/refresh-token', { method: 'POST', body: JSON.stringify({ token }) });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);

      const payloadBase64 = data.accessToken.split('.')[1];
      const decodedPayload = JSON.parse(atob(payloadBase64));
      
      if (decodedPayload.role !== 'NORMAL_USER') {
        const updatedUser = {
          ...user,
          role: decodedPayload.role,
          department: decodedPayload.department,
          approvalStatus: 'APPROVED'
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        dispatch(loginSuccess(updatedUser));
        
        const defaultPaths = {
          SUPER_ADMIN: '/admin/dashboard',
          MANAGEMENT: '/management/dashboard',
          TEAM_LEAD: '/lead/dashboard',
          CONTRIBUTOR: '/contributor/dashboard'
        };
        navigate(defaultPaths[decodedPayload.role] || '/');
      }
    } catch (err) {
      console.error('Silent status check failed:', err);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      checkStatusSilent();
    }, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const checkStatus = async () => {
    setChecking(true);
    setMsg('');
    try {
      const token = localStorage.getItem('refreshToken');
      if (!token) return handleLogout();
      
      const data = await apiService('/refresh-token', { method: 'POST', body: JSON.stringify({ token }) });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);

      const payloadBase64 = data.accessToken.split('.')[1];
      const decodedPayload = JSON.parse(atob(payloadBase64));
      
      if (decodedPayload.role !== 'NORMAL_USER') {
        const updatedUser = {
          ...user,
          role: decodedPayload.role,
          department: decodedPayload.department,
          approvalStatus: 'APPROVED'
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        dispatch(loginSuccess(updatedUser));
        
        const defaultPaths = {
          SUPER_ADMIN: '/admin/dashboard',
          MANAGEMENT: '/management/dashboard',
          TEAM_LEAD: '/lead/dashboard',
          CONTRIBUTOR: '/contributor/dashboard'
        };
        navigate(defaultPaths[decodedPayload.role] || '/');
      } else {
        setMsg('Your account is still pending approval.');
      }
    } catch (err) {
      setMsg('Your account is still pending approval.');
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    dispatch(logoutSuccess());
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)] p-5">
      <style>{`
        .tc-auth-card {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
      `}</style>
      <div className="tc-card tc-auth-card text-center">
        <div className="mb-6 flex justify-center">
          <svg viewBox="0 0 24 24" width="60" height="60" fill="none" stroke="var(--color-warning)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
          </svg>
        </div>
        
        <h1 className="tc-heading-lg mb-4">Account Pending Approval</h1>
        
        <p className="tc-body mb-6">
          Your account (ID: <strong>{user?.employeeId}</strong>) has been submitted. Please wait for Super Admin approval.
        </p>

        {msg && (
          <div className={`p-3 px-4 rounded-lg text-sm mb-6 border ${
            msg.includes('approved') 
              ? 'bg-[var(--color-success-bg)] text-[#047857] border-[rgba(16,185,129,0.2)]' 
              : 'bg-[var(--color-info-bg)] text-[#1d4ed8] border-[rgba(59,130,246,0.2)]'
          }`}>
            {msg}
          </div>
        )}

        <div className="flex gap-4 justify-center">
          <button className="tc-btn tc-btn-primary" onClick={checkStatus} disabled={checking}>
            {checking ? <div className="tc-spinner w-4 h-4 border-2 border-[rgba(255,255,255,0.3)] border-t-white" /> : 'Refresh Status'}
          </button>
          
          <button className="tc-btn tc-btn-secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;
