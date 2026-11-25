/* ==========================================================
   Bish Creatives webinar page: registration form

   What this file does:
   1. Checks the name, email and reCAPTCHA box before sending.
   2. Sends the registration to MailerLite (the same address your
      MailerLite embed code uses, read from the form's "action"
      attribute in index.html).
   3. Shows the success message only when MailerLite confirms it
      saved the subscriber. Errors are shown if it does not.
   ========================================================== */

(() => {
  'use strict';

  // ---------- Page elements ----------
  const form = document.getElementById('signup-form');
  const signupContent = document.getElementById('signup-content');
  const successBox = document.getElementById('success');
  const successText = document.getElementById('success-text');
  const submitBtn = document.getElementById('submit-btn');
  const statusEl = document.getElementById('form-status');

  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const nameError = document.getElementById('name-error');
  const emailError = document.getElementById('email-error');
  const captchaError = document.getElementById('captcha-error');

  // Footer year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  if (!form) return;

  // ---------- MailerLite addresses ----------
  // Taken from the form's action in index.html:
  // https://assets.mailerlite.com/jsonp/<ACCOUNT_ID>/forms/<FORM_ID>/subscribe
  const SUBSCRIBE_URL = form.getAttribute('action');
  const VIEW_URL = SUBSCRIBE_URL.replace(/\/subscribe$/, '/takel');

  // Tells MailerLite the form was viewed (this is in your embed code too).
  // If it fails, nothing breaks.
  fetch(VIEW_URL).catch(() => {});

  // ---------- Validation ----------
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function validateName() {
    const value = nameInput.value.trim();
    if (!value) return 'Enter your name.';
    if (value.length < 2) return 'Your name needs at least 2 characters.';
    return '';
  }

  function validateEmail() {
    const value = emailInput.value.trim();
    if (!value) return 'Enter your email address.';
    if (!EMAIL_PATTERN.test(value)) return 'Enter a valid email address, like name@example.com.';
    return '';
  }

  // reCAPTCHA token: null = not loaded, '' = box not ticked, text = ticked
  function getCaptchaToken() {
    try {
      return window.grecaptcha.getResponse();
    } catch (error) {
      return null;
    }
  }

  function validateCaptcha() {
    const token = getCaptchaToken();
    if (token === null) return 'The security check did not load. Refresh the page and try again.';
    if (!token) return 'Tick the box to confirm you are not a robot.';
    return '';
  }

  function resetCaptcha() {
    try {
      window.grecaptcha.reset();
    } catch (error) {
      /* ignore */
    }
  }

  // ---------- Showing and clearing messages ----------
  function showFieldError(input, errorEl, message) {
    errorEl.textContent = message;
    if (input) input.setAttribute('aria-invalid', 'true');
  }

  function clearFieldError(input, errorEl) {
    errorEl.textContent = '';
    if (input) input.removeAttribute('aria-invalid');
  }

  function setStatus(message) {
    statusEl.textContent = message;
  }

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading ? 'Registering...' : 'Register';
  }

  // Runs all checks. Returns true only if everything is valid.
  function validateForm() {
    let firstInvalid = null;

    const nameMessage = validateName();
    if (nameMessage) {
      showFieldError(nameInput, nameError, nameMessage);
      firstInvalid = firstInvalid || nameInput;
    } else {
      clearFieldError(nameInput, nameError);
    }

    const emailMessage = validateEmail();
    if (emailMessage) {
      showFieldError(emailInput, emailError, emailMessage);
      firstInvalid = firstInvalid || emailInput;
    } else {
      clearFieldError(emailInput, emailError);
    }

    const captchaMessage = validateCaptcha();
    if (captchaMessage) {
      showFieldError(null, captchaError, captchaMessage);
    } else {
      clearFieldError(null, captchaError);
    }

    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid && !captchaMessage;
  }

  // Check a field when the person leaves it, and clear its error once it is fixed
  nameInput.addEventListener('blur', () => {
    const message = validateName();
    if (message) showFieldError(nameInput, nameError, message);
    else clearFieldError(nameInput, nameError);
  });

  emailInput.addEventListener('blur', () => {
    const message = validateEmail();
    if (message) showFieldError(emailInput, emailError, message);
    else clearFieldError(emailInput, emailError);
  });

  nameInput.addEventListener('input', () => {
    if (nameInput.hasAttribute('aria-invalid') && !validateName()) {
      clearFieldError(nameInput, nameError);
    }
  });

  emailInput.addEventListener('input', () => {
    if (emailInput.hasAttribute('aria-invalid') && !validateEmail()) {
      clearFieldError(emailInput, emailError);
    }
  });

  // ---------- Results ----------
  function showSuccess(name, email) {
    const firstName = name.split(/\s+/)[0];
    successText.textContent =
      'Thanks, ' + firstName + '. Your registration is saved, and we will send the webinar details to ' + email + '.';
    signupContent.hidden = true;
    successBox.hidden = false;
    successBox.focus();
  }

  // MailerLite sends errors back like: { success: false, errors: { fields: { email: ["..."] } } }
  function showServerErrors(result) {
    const fieldErrors = result && result.errors && result.errors.fields;
    let shown = false;

    const firstMessage = (value) => (Array.isArray(value) ? value[0] : String(value));

    if (fieldErrors && fieldErrors.email) {
      showFieldError(emailInput, emailError, firstMessage(fieldErrors.email));
      emailInput.focus();
      shown = true;
    }
    if (fieldErrors && fieldErrors.name) {
      showFieldError(nameInput, nameError, firstMessage(fieldErrors.name));
      shown = true;
    }
    if (!shown) {
      setStatus('Something went wrong and your registration was not saved. Please try again in a moment.');
    }
  }

  // ---------- Submit ----------
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('');

    // Remove accidental spaces before checking and sending
    nameInput.value = nameInput.value.trim();
    emailInput.value = emailInput.value.trim();

    if (!validateForm()) return;

    const data = new FormData(form);
    data.set('g-recaptcha-response', getCaptchaToken());

    setLoading(true);
    try {
      const response = await fetch(SUBSCRIBE_URL, { method: 'POST', body: data });

      let result = null;
      try {
        result = await response.json();
      } catch (parseError) {
        /* the reply was not JSON */
      }

      if (response.ok && result && result.success) {
        showSuccess(nameInput.value, emailInput.value);
      } else {
        // Open the browser console (F12) to see exactly what MailerLite said
        console.error('MailerLite did not accept the registration:', response.status, result);
        showServerErrors(result);
        resetCaptcha();
      }
    } catch (networkError) {
      console.error('Could not reach MailerLite:', networkError);
      setStatus('We could not reach the registration service. Check your internet connection and try again.');
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  });
})();