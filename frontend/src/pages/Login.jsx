import { useState } from 'react';
import { Link } from 'react-router-dom';
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

  function handleSubmit(event) {
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

    const roleLabel = role === 'admin' ? 'Admin' : 'Viewer';
    setMessage(`Signed in as ${roleLabel} (${email.trim()}) — simulation only.`);
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

  function handleSignupSubmit(event) {
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
      const users = JSON.parse(localStorage.getItem('sm_users') || '{}');
      if (users[signupEmail.trim()]) {
        setSignupError('An account with that email already exists');
        return;
      }
      users[signupEmail.trim()] = { password: signupPwd, role: signupRole };
      localStorage.setItem('sm_users', JSON.stringify(users));
      alert(`Account created for ${signupEmail.trim()} (simulation). You may now sign in.`);
      setShowSignupModal(false);
      setSignupEmail('');
      setSignupPwd('');
      setSignupConfirm('');
      setSignupRole('viewer');
    } catch {
      setSignupError('Unable to save account locally');
    }
  }

  return (
    <main className="login-page">
      <div className="container">
        <nav className="page-nav">
          <Link to="/">Update</Link>
          <Link to="/search">Search</Link>
        </nav>
        <h1>Sign In</h1>

        <form onSubmit={handleSubmit} noValidate>
          <div className="role-group">
            <label>
              <input
                type="radio"
                name="role"
                value="admin"
                checked={role === 'admin'}
                onChange={() => setRole('admin')}
              />{' '}
              Admin
            </label>
            <label>
              <input
                type="radio"
                name="role"
                value="viewer"
                checked={role === 'viewer'}
                onChange={() => setRole('viewer')}
              />{' '}
              View
            </label>
          </div>

          <label className="field">
            <span>Email</span>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <small className="error">{emailError}</small>
          </label>

          <label className="field">
            <span>Password</span>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="8+ chars, 1 number, 1 special"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <small className="error">{passwordError}</small>
          </label>

          <div className="actions">
            <button type="submit">Sign in</button>
          </div>

          <div className="links">
            <a href="#" onClick={handleForgotPassword}>
              Forgot password
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setShowResetModal(true);
              }}
            >
              Reset password
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setShowSignupModal(true);
              }}
            >
              Sign up
            </a>
          </div>
        </form>

        {message && (
          <div className="message" aria-live="polite">
            {message}
          </div>
        )}

        {showResetModal && (
          <div className="modal">
            <form className="modal-content" onSubmit={handleResetSubmit}>
              <h2>Reset Password</h2>
              <label className="field">
                <span>Current Password</span>
                <input
                  id="currentPwd"
                  type="password"
                  required
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                />
              </label>
              <label className="field">
                <span>New Password</span>
                <input
                  id="newPwd"
                  type="password"
                  required
                  minLength={8}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Confirm New Password</span>
                <input
                  id="confirmPwd"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                />
              </label>
              <div className="modal-actions">
                <button type="submit">Save</button>
                <button
                  type="button"
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
              </div>
              <small className="error">{resetError}</small>
            </form>
          </div>
        )}

        {showSignupModal && (
          <div className="modal">
            <form className="modal-content" onSubmit={handleSignupSubmit}>
              <h2>Create Account</h2>
              <label className="field">
                <span>Email</span>
                <input
                  id="signupEmail"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  id="signupPwd"
                  type="password"
                  required
                  minLength={8}
                  placeholder="8+ chars, 1 number, 1 special"
                  value={signupPwd}
                  onChange={(e) => setSignupPwd(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Confirm Password</span>
                <input
                  id="signupConfirm"
                  type="password"
                  required
                  minLength={8}
                  value={signupConfirm}
                  onChange={(e) => setSignupConfirm(e.target.value)}
                />
              </label>
              <div className="role-group">
                <label>
                  <input
                    type="radio"
                    name="signupRole"
                    value="admin"
                    checked={signupRole === 'admin'}
                    onChange={() => setSignupRole('admin')}
                  />{' '}
                  Admin
                </label>
                <label>
                  <input
                    type="radio"
                    name="signupRole"
                    value="viewer"
                    checked={signupRole === 'viewer'}
                    onChange={() => setSignupRole('viewer')}
                  />{' '}
                  View
                </label>
              </div>
              <div className="modal-actions">
                <button type="submit">Create</button>
                <button
                  type="button"
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
              </div>
              <small className="error">{signupError}</small>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
