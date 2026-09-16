import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import { login, register, saveSession } from '../api/auth';
import './Login.css';

const emailRegex = /^\S+@\S+\.\S+$/;
const passwordRegex = /^(?=.{8,}$)(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).*$/;

export default function Login() {
  const [role, setRole] = useState('viewer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [message, setMessage] = useState('');

  const [showResetModal, setShowResetModal] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [resetError, setResetError] = useState('');

  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPwd, setSignupPwd] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [signupRole, setSignupRole] = useState('viewer');
  const [signupError, setSignupError] = useState('');

  function clearErrors() {
    setEmailError('');
    setPasswordError('');
    setResetError('');
    setMessage('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    clearErrors();

    let ok = true;
    if (!emailRegex.test(email.trim())) {
      setEmailError('Enter a valid email address');
      ok = false;
    }
    if (!passwordRegex.test(password)) {
      setPasswordError('Password must be 8+ chars, include a number and a special character');
      ok = false;
    }
    if (!ok) return;

    try {
      const data = await login({ email: email.trim(), password, role });
      saveSession(data.token, data.user);
      const roleLabel = data.user.role === 'admin' ? 'Admin' : 'Viewer';
      setMessage(`Signed in as ${roleLabel} (${data.user.email}).`);
    } catch (err) {
      setPasswordError(err.message || 'Sign in failed.');
    }
  }

  function handleForgotPassword(event) {
    event.preventDefault();
    clearErrors();
    const forgotEmail = prompt('Enter your email to receive a reset link:');
    if (!forgotEmail) return;
    if (!emailRegex.test(forgotEmail.trim())) {
      alert('Please enter a valid email address');
      return;
    }
    alert(`If an account exists for ${forgotEmail.trim()}, a password reset link has been sent (simulation).`);
  }

  function handleResetSubmit(event) {
    event.preventDefault();
    setResetError('');

    if (!currentPwd.trim()) {
      setResetError('Enter your current password');
      return;
    }
    if (!passwordRegex.test(newPwd)) {
      setResetError('New password must be 8+ chars, include a number and a special character');
      return;
    }
    if (newPwd !== confirmPwd) {
      setResetError('New password and confirmation do not match');
      return;
    }

    alert('Password updated (simulation). You can now sign in with your new password.');
    setShowResetModal(false);
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
  }

  async function handleSignupSubmit(event) {
    event.preventDefault();
    setSignupError('');

    if (!emailRegex.test(signupEmail.trim())) {
      setSignupError('Enter a valid email address');
      return;
    }
    if (!passwordRegex.test(signupPwd)) {
      setSignupError('Password must be 8+ chars, include a number and a special character');
      return;
    }
    if (signupPwd !== signupConfirm) {
      setSignupError('Password and confirmation do not match');
      return;
    }

    try {
      const data = await register({
        email: signupEmail.trim(),
        password: signupPwd,
        role: signupRole,
      });
      saveSession(data.token, data.user);
      setShowSignupModal(false);
      setSignupEmail('');
      setSignupPwd('');
      setSignupConfirm('');
      setSignupRole('viewer');
      setMessage(`Account created for ${data.user.email}. You are signed in.`);
    } catch (err) {
      setSignupError(err.message || 'Could not create account.');
    }
  }

  return (
    <>
      <PageHeader title="Sign in" description="User accounts are stored in MongoDB. Password reset is still demo-only." />
      <div className="app-content">
        <div className="page-card login-card">
          <form onSubmit={handleSubmit} noValidate className="login-form">
            <div className="role-group" role="radiogroup" aria-label="Account role">
              <label className="role-chip">
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={role === 'admin'}
                  onChange={() => setRole('admin')}
                />
                Admin
              </label>
              <label className="role-chip">
                <input
                  type="radio"
                  name="role"
                  value="viewer"
                  checked={role === 'viewer'}
                  onChange={() => setRole('viewer')}
                />
                Viewer
              </label>
            </div>

            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                className="ui-input"
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {emailError && <small className="ui-error">{emailError}</small>}
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                className="ui-input"
                id="password"
                name="password"
                type="password"
                placeholder="8+ chars, 1 number, 1 special"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {passwordError && <small className="ui-error">{passwordError}</small>}
            </div>

            <button type="submit" className="btn btn-primary login-submit">
              Sign in
            </button>

            <div className="login-links">
              <button type="button" className="link-btn" onClick={handleForgotPassword}>
                Forgot password
              </button>
              <button type="button" className="link-btn" onClick={() => setShowResetModal(true)}>
                Reset password
              </button>
              <button type="button" className="link-btn" onClick={() => setShowSignupModal(true)}>
                Create account
              </button>
            </div>
          </form>

          {message && (
            <div className="alert-banner success login-message" role="status">
              {message}
            </div>
          )}
        </div>
      </div>

      {showResetModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="reset-title">
          <form className="modal-panel" onSubmit={handleResetSubmit}>
            <h2 id="reset-title">Reset password</h2>
            <div className="field">
              <label htmlFor="currentPwd">Current password</label>
              <input
                className="ui-input"
                id="currentPwd"
                type="password"
                required
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="newPwd">New password</label>
              <input
                className="ui-input"
                id="newPwd"
                type="password"
                required
                minLength={8}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="confirmPwd">Confirm new password</label>
              <input
                className="ui-input"
                id="confirmPwd"
                type="password"
                required
                minLength={8}
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowResetModal(false);
                  setCurrentPwd('');
                  setNewPwd('');
                  setConfirmPwd('');
                  setResetError('');
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save
              </button>
            </div>
            {resetError && <small className="ui-error">{resetError}</small>}
          </form>
        </div>
      )}

      {showSignupModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="signup-title">
          <form className="modal-panel" onSubmit={handleSignupSubmit}>
            <h2 id="signup-title">Create account</h2>
            <div className="field">
              <label htmlFor="signupEmail">Email</label>
              <input
                className="ui-input"
                id="signupEmail"
                type="email"
                required
                placeholder="you@example.com"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="signupPwd">Password</label>
              <input
                className="ui-input"
                id="signupPwd"
                type="password"
                required
                minLength={8}
                placeholder="8+ chars, 1 number, 1 special"
                value={signupPwd}
                onChange={(e) => setSignupPwd(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="signupConfirm">Confirm password</label>
              <input
                className="ui-input"
                id="signupConfirm"
                type="password"
                required
                minLength={8}
                value={signupConfirm}
                onChange={(e) => setSignupConfirm(e.target.value)}
              />
            </div>
            <div className="role-group" role="radiogroup" aria-label="Signup role">
              <label className="role-chip">
                <input
                  type="radio"
                  name="signupRole"
                  value="admin"
                  checked={signupRole === 'admin'}
                  onChange={() => setSignupRole('admin')}
                />
                Admin
              </label>
              <label className="role-chip">
                <input
                  type="radio"
                  name="signupRole"
                  value="viewer"
                  checked={signupRole === 'viewer'}
                  onChange={() => setSignupRole('viewer')}
                />
                Viewer
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowSignupModal(false);
                  setSignupEmail('');
                  setSignupPwd('');
                  setSignupConfirm('');
                  setSignupRole('viewer');
                  setSignupError('');
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create
              </button>
            </div>
            {signupError && <small className="ui-error">{signupError}</small>}
          </form>
        </div>
      )}
    </>
  );
}
