import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { googleLogin, login, register, saveSession } from '../api/auth';
import ThemeToggle from '../components/ThemeToggle';
import './Login.css';

const emailRegex = /^\S+@\S+\.\S+$/;
const passwordRegex = /^(?=.{8,}$)(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).*$/;

function PasswordToggle({ visible, label, onToggle }) {
  const action = visible ? 'Hide' : 'Show';

  return (
    <button
      type="button"
      className="password-toggle"
      aria-label={`${action} ${label}`}
      aria-pressed={visible}
      title={`${action} ${label}`}
      onClick={onToggle}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M2.2 12s3.6-6.5 9.8-6.5 9.8 6.5 9.8 6.5-3.6 6.5-9.8 6.5S2.2 12 2.2 12Z" />
        <circle cx="12" cy="12" r="3" />
        {!visible && <path d="m3 3 18 18" />}
      </svg>
    </button>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);
  const [googleError, setGoogleError] = useState('');
  const [role, setRole] = useState('viewer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [showResetModal, setShowResetModal] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [resetError, setResetError] = useState('');

  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPwd, setSignupPwd] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [showSignupPwd, setShowSignupPwd] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);
  const [signupError, setSignupError] = useState('');

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const buttonElement = googleButtonRef.current;
    if (!clientId || !buttonElement) return undefined;

    function initializeGoogleSignIn() {
      const identity = window.google?.accounts?.id;
      if (!identity) return;

      identity.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          setGoogleError('');
          try {
            const data = await googleLogin(credential);
            saveSession(data.token, data.user);
            navigate('/search', { replace: true });
          } catch (err) {
            setGoogleError(err.message || 'Google sign-in failed.');
          }
        },
      });
      identity.renderButton(buttonElement, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: 372,
      });
    }

    const scriptUrl = 'https://accounts.google.com/gsi/client';
    let script = document.querySelector(`script[src="${scriptUrl}"]`);
    if (window.google?.accounts?.id) {
      initializeGoogleSignIn();
      return undefined;
    }

    if (!script) {
      script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', initializeGoogleSignIn);
    return () => script.removeEventListener('load', initializeGoogleSignIn);
  }, [navigate]);

  function clearErrors() {
    setEmailError('');
    setPasswordError('');
    setResetError('');
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
      navigate('/search', { replace: true });
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
    setShowCurrentPwd(false);
    setShowNewPwd(false);
    setShowConfirmPwd(false);
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
        role: 'viewer',
      });
      saveSession(data.token, data.user);
      setShowSignupModal(false);
      setSignupEmail('');
      setSignupPwd('');
      setSignupConfirm('');
      setShowSignupPwd(false);
      setShowSignupConfirm(false);
      navigate('/search', { replace: true });
    } catch (err) {
      setSignupError(err.message || 'Could not create account.');
    }
  }

  return (
    <>
      <div className="login-toolbar">
        <ThemeToggle />
      </div>
      <PageHeader title="Sign in" description="User accounts are stored in MongoDB. Password reset is still demo-only." />
      <div className="app-content">
        <div className="page-card login-card">
          <form onSubmit={handleSubmit} noValidate className="login-form">
            <div className="demo-credentials" aria-label="Demo account credentials">
              <button type="button" className="link-btn" onClick={() => {
                setRole('admin');
                setEmail('admin@gmail.com');
                setPassword('Password1@');
              }}>
                Admin: admin@gmail.com / Password1@
              </button>
              <button type="button" className="link-btn" onClick={() => {
                setRole('viewer');
                setEmail('viewer@gmail.com');
                setPassword('Password2@');
              }}>
                Viewer: viewer@gmail.com / Password2@
              </button>
            </div>

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
              <div className="password-input-wrap">
                <input
                  className="ui-input"
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="8+ chars, 1 number, 1 special"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <PasswordToggle
                  visible={showPassword}
                  label="password"
                  onToggle={() => setShowPassword((visible) => !visible)}
                />
              </div>
              {passwordError && <small className="ui-error">{passwordError}</small>}
            </div>

            <button type="submit" className="btn btn-primary login-submit">
              Sign in
            </button>

            {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
              <>
                <div className="login-divider"><span>or continue with</span></div>
                <div className="google-signin-button" ref={googleButtonRef} />
                {googleError && <small className="ui-error">{googleError}</small>}
              </>
            )}

            <div className="login-links">
              <button type="button" className="link-btn" onClick={handleForgotPassword}>
                Forgot password
              </button>
              <button type="button" className="link-btn" onClick={() => {
                setShowCurrentPwd(false);
                setShowNewPwd(false);
                setShowConfirmPwd(false);
                setShowResetModal(true);
              }}>
                Reset password
              </button>
              <button type="button" className="link-btn" onClick={() => {
                setShowSignupPwd(false);
                setShowSignupConfirm(false);
                setShowSignupModal(true);
              }}>
                Create account
              </button>
            </div>
          </form>

        </div>
      </div>

      {showResetModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="reset-title">
          <form className="modal-panel" onSubmit={handleResetSubmit}>
            <h2 id="reset-title">Reset password</h2>
            <div className="field">
              <label htmlFor="currentPwd">Current password</label>
              <div className="password-input-wrap">
                <input
                  className="ui-input"
                  id="currentPwd"
                  type={showCurrentPwd ? 'text' : 'password'}
                  required
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                />
                <PasswordToggle
                  visible={showCurrentPwd}
                  label="current password"
                  onToggle={() => setShowCurrentPwd((visible) => !visible)}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="newPwd">New password</label>
              <div className="password-input-wrap">
                <input
                  className="ui-input"
                  id="newPwd"
                  type={showNewPwd ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                />
                <PasswordToggle
                  visible={showNewPwd}
                  label="new password"
                  onToggle={() => setShowNewPwd((visible) => !visible)}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="confirmPwd">Confirm new password</label>
              <div className="password-input-wrap">
                <input
                  className="ui-input"
                  id="confirmPwd"
                  type={showConfirmPwd ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                />
                <PasswordToggle
                  visible={showConfirmPwd}
                  label="confirm password"
                  onToggle={() => setShowConfirmPwd((visible) => !visible)}
                />
              </div>
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
                  setShowCurrentPwd(false);
                  setShowNewPwd(false);
                  setShowConfirmPwd(false);
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
              <div className="password-input-wrap">
                <input
                  className="ui-input"
                  id="signupPwd"
                  type={showSignupPwd ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="8+ chars, 1 number, 1 special"
                  value={signupPwd}
                  onChange={(e) => setSignupPwd(e.target.value)}
                />
                <PasswordToggle
                  visible={showSignupPwd}
                  label="password"
                  onToggle={() => setShowSignupPwd((visible) => !visible)}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="signupConfirm">Confirm password</label>
              <div className="password-input-wrap">
                <input
                  className="ui-input"
                  id="signupConfirm"
                  type={showSignupConfirm ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={signupConfirm}
                  onChange={(e) => setSignupConfirm(e.target.value)}
                />
                <PasswordToggle
                  visible={showSignupConfirm}
                  label="confirm password"
                  onToggle={() => setShowSignupConfirm((visible) => !visible)}
                />
              </div>
            </div>
            <p>New accounts are created with viewer access.</p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowSignupModal(false);
                  setSignupEmail('');
                  setSignupPwd('');
                  setSignupConfirm('');
                  setShowSignupPwd(false);
                  setShowSignupConfirm(false);
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
