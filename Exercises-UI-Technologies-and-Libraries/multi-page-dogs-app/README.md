# Dogs Marketplace - Multi-Page Web Application

A modern, multi-page web application built with Vite, HTML, Bootstrap, and JavaScript that represents a marketplace for dogs.

## Features

### Dog Categories
- **Dogs for Sale**: Browse premium dogs from verified breeders
- **Dogs for Adoption**: Find dogs looking for loving homes (free adoption)
- **Puppies**: Discover adorable puppies ready for adoption or purchase

### Dog Information
Each dog listing includes:
- Breed
- Age
- Gender (Male/Female)
- Description
- Purpose (Sale/Adoption)
- Price (with "Buy" or "Adopt" button)
- Photo

### Pages

1. **Home** (`/`) - Welcome page with hero section and feature overview
2. **Dogs** (`/dogs`) - Browse all dog listings with filters:
   - Search by breed
   - Filter by purpose (sale/adoption)
   - Filter by gender
   - View detailed dog information in modal
3. **About** (`/about`) - Information about the platform
4. **Contact** (`/contact`) - Contact form and contact information
5. **Admin** (`/admin`) - Manage dog listings:
   - View all dogs in table format
   - Add new dogs
   - Edit existing dogs
   - Delete dogs

## Technical Implementation

### Project Structure
```
multi-page-dogs-app/
├── index.html                 # Main HTML entry point
├── package.json               # Project dependencies
├── vite.config.js            # Vite configuration
└── src/
    ├── main.js               # Application entry point
    ├── components/           # Reusable UI components
    │   ├── header/
    │   │   ├── header.html
    │   │   ├── header.css
    │   │   └── header.js
    │   └── footer/
    │       ├── footer.html
    │       ├── footer.css
    │       └── footer.js
    ├── pages/                # Page components
    │   ├── home/
    │   ├── dogs/
    │   ├── about/
    │   ├── contact/
    │   └── admin/
    │       └── (each with .html, .css, .js files)
    ├── services/
    │   └── dogService.js     # Dog data management (localStorage)
    └── utils/
        └── router.js         # Client-side routing
```

### Key Technologies

- **Vite**: Development server and build tool
- **Bootstrap 5**: UI framework and responsive design
- **Bootstrap Icons**: Icon library
- **Vanilla JavaScript**: No framework dependencies
- **LocalStorage**: Data persistence
- **HTML Fragments**: Component-based architecture

### Features

#### Clean URLs (No Hash)
- Uses HTML5 History API
- URLs like `http://localhost:5173/dogs` instead of `#/dogs`
- Browser back/forward button support

#### Component-Based Architecture
- Each component has separate HTML, CSS, and JS files
- Modular and maintainable code structure
- Dynamic component loading

#### Client-Side Routing
- Custom router implementation
- Navigation without page reloads
- Active link highlighting

#### Data Management
- CRUD operations for dog listings
- LocalStorage for data persistence
- Sample data pre-loaded on first run

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Navigate to project directory:
```bash
cd multi-page-dogs-app
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

4. Open browser to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Usage

### Browsing Dogs
1. Navigate to the **Dogs** page
2. Use filters to narrow down results:
   - Search by breed name
   - Filter by purpose (sale/adoption)
   - Filter by gender (male/female)
3. Click on any "Buy Now" or "Adopt" button to view details

### Managing Dogs (Admin)
1. Navigate to the **Admin** page
2. Click "Add New Dog" to create a listing
3. Fill in all required fields:
   - Breed name
   - Age in years
   - Gender
   - Description
   - Purpose (sale/adoption)
   - Price (set to 0 for free adoption)
   - Image URL
4. Use Edit/Delete buttons to manage existing listings

### Sample Data
The application comes with 6 pre-loaded dog listings including:
- Golden Retriever (for sale)
- Labrador (for adoption)
- German Shepherd (for sale)
- Beagle Puppy (for sale)
- Bulldog (for adoption)
- Poodle Puppy (for sale)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development Notes

### Adding New Pages
1. Create a new folder in `src/pages/`
2. Add HTML, CSS, and JS files
3. Export a load function from the JS file
4. Register the route in `src/main.js`

### Modifying Styles
- Global styles are in `index.html`
- Component-specific styles are in their respective folders
- Bootstrap classes are used extensively

### Data Storage
- All data is stored in browser's localStorage
- Key: `dogs-marketplace-data`
- Data persists across sessions
- Clear localStorage to reset data

## License

MIT License - feel free to use for learning and personal projects.

## Credits

- Dog images from Unsplash
- Bootstrap framework
- Bootstrap Icons

---

Built with ❤️ for dog lovers everywhere!
