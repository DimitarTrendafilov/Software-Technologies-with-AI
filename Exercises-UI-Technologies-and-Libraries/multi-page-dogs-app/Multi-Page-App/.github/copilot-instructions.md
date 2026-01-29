# Dog Haven - AI Coding Notes

## Big picture architecture
- Single-page app with client-side routing and clean URLs. Routes are registered in [src/main.js](src/main.js) and resolved by the custom router in [src/router.js](src/router.js).
- Pages are JS modules exporting `{ render(container), init? }` and use HTML fragments via `?raw` imports (see [src/pages/dogs.js](src/pages/dogs.js) and [src/pages/dogs.html](src/pages/dogs.html)). Do not inline full page markup in JS.
- Shared layout is injected via HTML fragments in [src/components/Header/header.html](src/components/Header/header.html) and [src/components/Footer/footer.html](src/components/Footer/footer.html). The router calls `updateActiveNav()` after rendering.
- State is in-memory only via [src/store.js](src/store.js). Pages call store functions directly; no persistence or API layer.

## Data flow & UI patterns
- `store.js` holds `dogDatabase`, `adoptions`, and `purchases`. Updates happen in Admin and Dogs flows; Adoptions/Purchases pages read from these arrays.
- UI actions are wired in each page `init()` (see [src/pages/dogs.js](src/pages/dogs.js) and [src/pages/admin.js](src/pages/admin.js)). Modals depend on the global `bootstrap` bundle from [index.html](index.html).
- Bootstrap modals rely on the global `bootstrap` object loaded in [index.html](index.html) (bundle from CDN). Keep modal IDs in sync with DOM in `render()`.

## Routing conventions
- Links use clean paths (`/dogs`, `/admin`, etc.) and are intercepted by the router in [src/router.js](src/router.js). New pages must be registered in [src/main.js](src/main.js) and added to the nav in [src/components/Header/header.html](src/components/Header/header.html).
- Vite dev server is configured for history fallback in [vite.config.js](vite.config.js) to support clean URLs.

## Styling conventions
- Global styles live in [src/styles.css](src/styles.css). Component/page-specific CSS is imported by each component/page JS file.
- Prefer Bootstrap utility classes for layout; custom classes exist for dog cards and admin tables.

## Developer workflow
- Install and run: `npm install`, `npm run dev`, `npm run build`, `npm run preview` (see [package.json](package.json)).
- No tests or linting configured.

## Adding a page (pattern)
- Create a new HTML fragment + CSS + JS in [src/pages](src/pages); JS should import the HTML with `?raw` and the CSS.
- Register the page in [src/main.js](src/main.js) with `registerRoute('/path', PageComponent)` and update the navbar in [src/components/Header/header.html](src/components/Header/header.html).

## Dogs marketplace patterns
- Cards + modal details live in [src/pages/dogs.html](src/pages/dogs.html) and logic in [src/pages/dogs.js](src/pages/dogs.js).
- Buy/Adopt/Sell actions are handled with Bootstrap modals; sell creates a new listing via `addDog()`.
