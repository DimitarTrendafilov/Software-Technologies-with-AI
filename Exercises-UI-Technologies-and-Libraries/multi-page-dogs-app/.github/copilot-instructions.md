# GitHub Copilot Instructions for Dogs Marketplace App

## Project Overview
This is a multi-page web application for a Dogs Marketplace built with Vite, HTML, Bootstrap 5, and vanilla JavaScript. The app uses a component-based architecture with clean URLs (no hashes).

## Architecture & Structure

### Core Principles
- **Component-Based**: Each UI component has its own folder with separate `.html`, `.css`, and `.js` files
- **Page Fragments**: Components export HTML fragments, not full HTML documents
- **Clean URLs**: Use HTML5 History API for routing (e.g., `/dogs` not `#/dogs`)
- **LocalStorage**: All data persists in browser's localStorage
- **No Framework**: Pure vanilla JavaScript with ES6 modules

### Project Structure
```
multi-page-dogs-app/
├── index.html                    # Main HTML entry point (contains Bootstrap CDN)
├── src/
│   ├── main.js                   # App initialization & routing setup
│   ├── components/               # Reusable UI components (header, footer)
│   │   ├── header/
│   │   │   ├── header.html      # HTML fragment (no DOCTYPE, just content)
│   │   │   ├── header.css       # Component-specific styles
│   │   │   └── header.js        # Exports loadHeader() function
│   │   └── footer/
│   │       └── (same structure)
│   ├── pages/                    # Page components
│   │   ├── home/
│   │   ├── dogs/
│   │   ├── about/
│   │   ├── contact/
│   │   └── admin/
│   │       └── (each has .html, .css, .js)
│   ├── services/
│   │   └── dogService.js        # Data management (CRUD with localStorage)
│   └── utils/
│       └── router.js            # Client-side routing
```

## Component Guidelines

### HTML Fragments
- **DO NOT** include `<!DOCTYPE>`, `<html>`, `<head>`, or `<body>` tags
- **DO** create only the component's content (e.g., `<nav>` for header, `<footer>` for footer)
- **Example**:
  ```html
  <!-- Good: header.html -->
  <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
    <!-- navigation content -->
  </nav>
  
  <!-- Bad: DO NOT DO THIS -->
  <!DOCTYPE html>
  <html>
    <head>...</head>
    <body>
      <nav>...</nav>
    </body>
  </html>
  ```

### JavaScript Components
- Each component exports a load function that:
  1. Fetches the HTML fragment
  2. Inserts it into the appropriate container
  3. Loads the component's CSS
  4. Sets up event listeners

**Example Pattern**:
```javascript
export async function loadComponentName() {
  const container = document.getElementById('containerId');
  
  // Load HTML fragment
  const response = await fetch('/src/path/to/component.html');
  const html = await response.text();
  container.innerHTML = html;
  
  // Load CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/src/path/to/component.css';
  document.head.appendChild(link);
  
  // Setup event listeners if needed
  setupEventListeners();
}
```

### Page Components
- Pages follow the same structure as other components
- Export a `loadPageName()` function
- Insert content into `#content` container
- Pages should be complete views (not fragments of pages)

## Routing

### Navigation Links
- Use `data-link` attribute on navigation links:
  ```html
  <a href="/dogs" data-link>Dogs</a>
  ```
- Router intercepts clicks and prevents page reload
- Updates browser URL using `history.pushState()`

### Adding New Routes
1. Create page component folder in `src/pages/`
2. Create HTML, CSS, and JS files
3. Export load function from JS file
4. Register route in `src/main.js`:
   ```javascript
   const routes = [
     { path: '/new-page', component: loadNewPage }
   ];
   ```

## Data Management

### Dog Service (dogService.js)
- Manages all dog data using localStorage
- Key: `'dogs-marketplace-data'`
- Available methods:
  - `getAllDogs()` - Get all dogs
  - `getDogById(id)` - Get single dog
  - `addDog(dogData)` - Add new dog
  - `updateDog(id, dogData)` - Update existing dog
  - `deleteDog(id)` - Delete dog
  - `filterDogs(filters)` - Filter by purpose, gender, search term

### Dog Data Model
```javascript
{
  id: number,
  breed: string,
  age: number,        // in years (0.5 for 6 months)
  gender: 'male' | 'female',
  description: string,
  purpose: 'sale' | 'adoption',
  price: number,      // 0 for free adoption
  image: string       // URL
}
```

## Bootstrap & Styling

### Bootstrap Usage
- Bootstrap 5.3.0 loaded via CDN in `index.html`
- Bootstrap Icons also available
- Use Bootstrap classes for responsive design
- Component-specific styles in separate CSS files

### Modal Dialogs
- Use Bootstrap modals for:
  - Dog details view
  - Buy/Adopt forms
  - Delete confirmations (in admin)
  - Success messages
- Initialize with: `new bootstrap.Modal(element)`

## Page-Specific Guidelines

### Dogs Page (`/dogs`)
- Display dogs as cards with filters
- Filter by: search term, purpose, gender
- Click card to view details in modal
- "Buy Now" / "Adopt" button opens purchase form modal
- Purchase form collects: name, email, phone, address, message

### Admin Page (`/admin`)
- CRUD operations for dog management
- Display dogs in table format
- Add/Edit: Open modal with form
- Delete: Show confirmation dialog before deletion
- Forms validate all required fields

### Home Page (`/`)
- Hero section with welcome message
- Feature cards highlighting marketplace benefits
- Call-to-action buttons linking to other pages

## Common Patterns

### Global Functions
When functions need to be called from HTML onclick attributes:
```javascript
window.functionName = function() {
  // implementation
};
```

### Form Handling
1. Prevent default form submission
2. Validate using `form.checkValidity()`
3. Use `form.reportValidity()` to show validation errors
4. Process data and update localStorage
5. Show success feedback
6. Close modal and refresh view

### Confirmation Dialogs
For destructive actions (delete):
1. Store item ID in variable
2. Show confirmation modal
3. On confirm: perform action, close modal, refresh view
4. On cancel: just close modal

## Do's and Don'ts

### DO:
✅ Create HTML fragments (not full HTML documents)
✅ Use Bootstrap classes for styling
✅ Add `data-link` to navigation links
✅ Use localStorage for data persistence
✅ Show modals for forms and confirmations
✅ Validate forms before submission
✅ Update active navigation link when route changes
✅ Use semantic HTML and proper accessibility attributes

### DON'T:
❌ Generate full HTML pages with DOCTYPE for components
❌ Use hash-based routing (`#/page`)
❌ Make actual HTTP requests (app is client-side only)
❌ Use jQuery or other libraries (vanilla JS only)
❌ Hard-code data (use dogService for all dog data)
❌ Skip form validation
❌ Delete data without confirmation
❌ Forget to close modals after actions

## Testing Checklist

When modifying the app, ensure:
- [ ] Navigation works with clean URLs
- [ ] Browser back/forward buttons work correctly
- [ ] Data persists after page refresh
- [ ] Forms validate properly
- [ ] Modals open and close correctly
- [ ] Filters work on Dogs page
- [ ] CRUD operations work in Admin panel
- [ ] Responsive design works on mobile
- [ ] No console errors

## Development Commands

```bash
npm install       # Install dependencies
npm run dev       # Start dev server (http://localhost:5173)
npm run build     # Build for production
npm run preview   # Preview production build
```

## Key Dependencies

- **Vite**: Dev server and build tool
- **Bootstrap 5**: UI framework (loaded via CDN)
- **Bootstrap Icons**: Icon library (loaded via CDN)

---

Remember: This is a **component-based** architecture where components are **HTML fragments**, not full pages. Always maintain this pattern when creating or modifying components.
