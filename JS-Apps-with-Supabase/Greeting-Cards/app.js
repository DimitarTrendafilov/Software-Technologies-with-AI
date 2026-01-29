const floatingItems = [
  "🎈",
  "🎉",
  "🎁",
  "🎂",
  "🧁",
  "🎊",
  "🎀",
  "✨",
  "🍰",
  "🥳",
  "🎵",
  "🪅",
];

const bgContainer = document.getElementById("bg-animated");

const createFloatingItem = () => {
  const item = document.createElement("div");
  item.className = "floating-item";

  const span = document.createElement("span");
  span.textContent = floatingItems[Math.floor(Math.random() * floatingItems.length)];
  span.style.animationDuration = `${4 + Math.random() * 3}s`;

  item.appendChild(span);
  item.style.left = `${Math.random() * 100}%`;
  item.style.animationDuration = `${18 + Math.random() * 12}s`;
  item.style.fontSize = `${1.8 + Math.random() * 1.8}rem`;
  item.style.animationDelay = `${Math.random() * 6}s`;

  bgContainer.appendChild(item);

  setTimeout(() => {
    item.remove();
  }, 32000);
};

const spawnFloatingItems = () => {
  for (let i = 0; i < 16; i += 1) {
    createFloatingItem();
  }

  setInterval(createFloatingItem, 1200);
};

spawnFloatingItems();
