import template from './about.html?raw';
import './about.css';

export const AboutPage = {
  render(container) {
    container.innerHTML = template;
  }
};
