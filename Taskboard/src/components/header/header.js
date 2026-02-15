import './header.css';
import { loadHtml } from '../../utils/loaders.js';
import { getCurrentUser, signOut } from '../../services/auth.js';
import { setHidden, setText } from '../../utils/dom.js';
import { showError } from '../../services/toast.js';

export async function renderHeader() {
  return loadHtml(new URL('./header.html', import.meta.url));
}

let authListenerAttached = false;

export async function mountHeader() {
  await updateAuthUI();

  if (!authListenerAttached) {
    window.addEventListener('auth:changed', updateAuthUI);
    authListenerAttached = true;
  }

  const signOutButton = document.querySelector('[data-sign-out]');
  if (signOutButton) {
    signOutButton.addEventListener('click', async () => {
      try {
        await signOut();
      } catch (error) {
        showError(error?.message ?? 'Failed to sign out.');
      }
    });
  }
}

async function updateAuthUI() {
  const user = await getCurrentUser();
  const guestItems = document.querySelectorAll('[data-auth-guest]');
  const userItems = document.querySelectorAll('[data-auth-user]');
  const emailLabel = document.querySelector('[data-auth-email]');

  guestItems.forEach((item) => setHidden(item, Boolean(user)));
  userItems.forEach((item) => setHidden(item, !user));
  setText(emailLabel, user?.email ?? '');
}
