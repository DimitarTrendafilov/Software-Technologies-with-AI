import './login.css';
import { loadHtml } from '../../utils/loaders.js';
import { getCurrentUser, signInWithPassword, signUpWithPassword } from '../../services/auth.js';
import { setHidden, setText } from '../../utils/dom.js';
import { navigateTo } from '../../utils/navigation.js';
import { showSuccess, showError } from '../../services/toast.js';

export async function render() {
  const html = await loadHtml(new URL('./login.html', import.meta.url));
  return {
    html,
    onMount() {
      const form = document.getElementById('login-form');
      if (!form) {
        return;
      }

      const title = document.querySelector('[data-auth-title]');
      const subtitle = document.querySelector('[data-auth-subtitle]');
      const helper = document.querySelector('[data-auth-helper]');
      const submit = document.querySelector('[data-auth-submit]');
      const success = document.querySelector('[data-auth-success]');
      const errorBox = document.querySelector('[data-auth-error]');
      const modeButtons = document.querySelectorAll('[data-auth-mode]');

      let mode = 'signin';

      const setMode = (nextMode) => {
        mode = nextMode;
        modeButtons.forEach((button) => {
          button.classList.toggle('active', button.dataset.authMode === mode);
        });

        const isSignUp = mode === 'signup';
        setText(title, isSignUp ? 'Create your account' : 'Welcome back');
        setText(
          subtitle,
          isSignUp
            ? 'Start your workspace with a new team login.'
            : 'Sign in to continue to your boards.'
        );
        setText(submit, isSignUp ? 'Create account' : 'Sign in');
        setText(helper, isSignUp ? 'Already have an account? Switch to sign in.' : 'New here? Create a board in minutes.');
        setHidden(success, true);
        setHidden(errorBox, true);
      };

      modeButtons.forEach((button) => {
        button.addEventListener('click', () => setMode(button.dataset.authMode));
      });

      setMode(mode);

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        setHidden(success, true);
        setHidden(errorBox, true);

        const email = form.querySelector('#email')?.value?.trim()?.toLowerCase();
        const password = form.querySelector('#password')?.value?.trim();

        if (!email || !password) {
          showError('Email and password are required.');
          return;
        }

        try {
          if (mode === 'signup') {
            await signUpWithPassword(email, password);
            showSuccess('Account created successfully! You can now sign in.');
            // Switch to sign-in mode
            setMode('signin');
            form.reset();
          } else {
            await signInWithPassword(email, password);
            navigateTo('/dashboard');
          }
        } catch (error) {
          const message = error?.message ?? 'Authentication failed.';
          if (message.includes('Invalid login credentials')) {
            showError('Invalid login credentials. Check keyboard layout (EN/BG) and try again. Test users password: 123456');
            return;
          }

          showError(message);
        }
      });

      getCurrentUser().then((user) => {
        if (user) {
          setText(success, `Signed in as ${user.email}.`);
          setHidden(success, false);
        }
      });
    }
  };
}
