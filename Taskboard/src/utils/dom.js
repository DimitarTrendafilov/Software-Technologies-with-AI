export function setText(element, value) {
  if (!element) {
    return;
  }

  element.textContent = value;
}

export function setHidden(element, shouldHide) {
  if (!element) {
    return;
  }

  element.classList.toggle('d-none', shouldHide);
}
