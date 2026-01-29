import template from './home.html?raw';
import './home.css';

export const HomePage = {
  render(container) {
    container.innerHTML = template;
  }
};
