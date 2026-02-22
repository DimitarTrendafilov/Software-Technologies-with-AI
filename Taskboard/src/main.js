import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './styles/base.css';
import './styles/toast.css';
import { initRouter } from './router.js';
import { initAuthEvents } from './services/auth.js';
import { hasSupabaseConfig } from './services/supabase.js';

if (!hasSupabaseConfig) {
	const app = document.getElementById('app');
	if (app) {
		app.innerHTML = `
			<main class="container py-5">
				<div class="alert alert-danger" role="alert">
					<h4 class="alert-heading mb-2">Supabase configuration is missing</h4>
					<p class="mb-2">Set <strong>VITE_SUPABASE_URL</strong> and <strong>VITE_SUPABASE_ANON_KEY</strong> in your environment variables and redeploy.</p>
					<hr>
					<p class="mb-0">On Netlify: Site settings → Environment variables.</p>
				</div>
			</main>
		`;
	}
} else {
	initAuthEvents();
	initRouter();
}
