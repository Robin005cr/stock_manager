(() => {
  const emailEl = document.getElementById('email');
  const pwdEl = document.getElementById('password');
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');
  const form = document.getElementById('loginForm');
  const message = document.getElementById('message');

  const forgotLink = document.getElementById('forgotLink');
  const resetLink = document.getElementById('resetLink');
  const resetModal = document.getElementById('resetModal');
  const resetForm = document.getElementById('resetForm');
  const cancelReset = document.getElementById('cancelReset');
  const resetError = document.getElementById('resetError');
  const signupLink = document.getElementById('signupLink');
  const signupModal = document.getElementById('signupModal');
  const signupForm = document.getElementById('signupForm');
  const cancelSignup = document.getElementById('cancelSignup');
  const signupError = document.getElementById('signupError');

  const emailRegex = /^\S+@\S+\.\S+$/;
  const passwordRegex = /^(?=.{8,}$)(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]).*$/;

  function clearErrors() {
    emailError.textContent = '';
    passwordError.textContent = '';
    resetError.textContent = '';
    message.textContent = '';
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();
    const email = emailEl.value.trim();
    const pwd = pwdEl.value;
    let ok = true;

    if (!emailRegex.test(email)) {
      emailError.textContent = 'Enter a valid email address';
      ok = false;
    }

    if (!passwordRegex.test(pwd)) {
      passwordError.textContent = 'Password must be 8+ chars, include a number and a special character';
      ok = false;
    }

    if (!ok) return;

    const role = (form.elements['role'].value === 'admin') ? 'Admin' : 'Viewer';
    message.textContent = `Signed in as ${role} (${email}) — simulation only.`;
    message.style.color = '#064e3b';
  });

  forgotLink.addEventListener('click', (e) => {
    e.preventDefault();
    clearErrors();
    const email = prompt('Enter your email to receive a reset link:');
    if (!email) return;
    if (!emailRegex.test(email.trim())) {
      alert('Please enter a valid email address');
      return;
    }
    alert('If an account exists for ' + email.trim() + ', a password reset link has been sent (simulation).');
  });

  resetLink.addEventListener('click', (e) => {
    e.preventDefault();
    resetModal.classList.remove('hidden');
  });

  cancelReset.addEventListener('click', () => {
    resetModal.classList.add('hidden');
    resetForm.reset();
    resetError.textContent = '';
  });

  resetForm.addEventListener('submit', (e) => {
    e.preventDefault();
    resetError.textContent = '';
    const current = document.getElementById('currentPwd').value || '';
    const nw = document.getElementById('newPwd').value || '';
    const conf = document.getElementById('confirmPwd').value || '';

    if (!current.trim()) {
      resetError.textContent = 'Enter your current password';
      return;
    }
    if (!passwordRegex.test(nw)) {
      resetError.textContent = 'New password must be 8+ chars, include a number and a special character';
      return;
    }
    if (nw !== conf) {
      resetError.textContent = 'New password and confirmation do not match';
      return;
    }

    // Simulation only — no backend
    alert('Password updated (simulation). You can now sign in with your new password.');
    resetModal.classList.add('hidden');
    resetForm.reset();
  });

  // Signup flow
  signupLink.addEventListener('click', (e) => {
    e.preventDefault();
    signupModal.classList.remove('hidden');
  });

  cancelSignup.addEventListener('click', () => {
    signupModal.classList.add('hidden');
    signupForm.reset();
    signupError.textContent = '';
  });

  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    signupError.textContent = '';
    const email = document.getElementById('signupEmail').value.trim();
    const pw = document.getElementById('signupPwd').value || '';
    const conf = document.getElementById('signupConfirm').value || '';
    const role = (signupForm.elements['signupRole'].value === 'admin') ? 'admin' : 'viewer';

    if (!emailRegex.test(email)) {
      signupError.textContent = 'Enter a valid email address';
      return;
    }
    if (!passwordRegex.test(pw)) {
      signupError.textContent = 'Password must be 8+ chars, include a number and a special character';
      return;
    }
    if (pw !== conf) {
      signupError.textContent = 'Password and confirmation do not match';
      return;
    }

    // store simulated user in localStorage
    try {
      const users = JSON.parse(localStorage.getItem('sm_users') || '{}');
      if (users[email]) {
        signupError.textContent = 'An account with that email already exists';
        return;
      }
      users[email] = { password: pw, role };
      localStorage.setItem('sm_users', JSON.stringify(users));
      alert('Account created for ' + email + ' (simulation). You may now sign in.');
      signupModal.classList.add('hidden');
      signupForm.reset();
    } catch (err) {
      signupError.textContent = 'Unable to save account locally';
    }
  });
})();
