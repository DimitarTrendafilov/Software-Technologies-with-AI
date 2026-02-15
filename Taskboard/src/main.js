import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './styles/base.css';
import './styles/toast.css';
import { initRouter } from './router.js';
import { initAuthEvents } from './services/auth.js';

initAuthEvents();
initRouter();
