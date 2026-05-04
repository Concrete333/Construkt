# Dan's Handoff - Construkt Project

## Project Overview
Construkt is a Django web application for construction project management with a sophisticated JavaScript frontend. The application features:
- Dashboard 2 with contractor dial and payment bar charts
- Project management pages
- Work package tracking and detail views
- Task management system
- Payment tracking (spent, pending, unspent)

## Recent Work Completed

### 1. Projects Page Redesign
**Files Modified:**
- `/Users/danielprice/Documents/GitHub/Construkt/web/templates/projects/construkt.html` (lines 783-790)
- `/Users/danielprice/Documents/GitHub/Construkt/web/static/projects/css/construkt.css` (lines 3333-3426)
- `/Users/danielprice/Documents/GitHub/Construkt/web/static/projects/js/construkt.js` (lines 677-726)

**What Was Done:**
- Completely redesigned projects page to be simple yet professional
- Shows only: project title and days until next task due
- Uses card-based design matching website's color scheme
- Color-coded urgency indicators:
  - Red dot: 0-1 days (urgent)
  - Orange dot: 2-3 days (soon)
  - Gray dot: 4+ days (normal)
- Projects sorted by urgency (soonest tasks first)
- Clicking project navigates to existing project detail page

**Key CSS Classes:**
- `.projects-simple-container` - Main container
- `.projects-simple-list` - Card container with borders
- `.project-simple-item` - Individual project row (clickable)
- `.project-simple-due` - Due date with color coding

### 2. Clickable Bar Chart Project Names
**Files Modified:**
- `/Users/danielprice/Documents/GitHub/Construkt/web/static/projects/css/construkt.css` (lines 2707-2715)
- `/Users/danielprice/Documents/GitHub/Construkt/web/static/projects/js/construkt.js` (lines 1024, 1489)

**What Was Done:**
- Made project names in bar charts clickable (both dashboard and fullscreen views)
- Added hover effects (color change to primary, underline)
- Clicking navigates to existing project detail page using `showProjectDetail()`

**Key CSS Classes:**
- `.chart-label-clickable` - Applied to clickable project names
- Hover state changes color to `var(--color-primary)` and adds underline

### 3. Work Package View Page (NEW FEATURE)
**Files Modified:**
- `/Users/danielprice/Documents/GitHub/Construkt/web/templates/projects/construkt.html` (lines 792-910)
- `/Users/danielprice/Documents/GitHub/Construkt/web/static/projects/css/construkt.css` (lines 3428-3598)
- `/Users/danielprice/Documents/GitHub/Construkt/web/static/projects/js/construkt.js` (lines 1799-1833, 2021-2041)

**What Was Done:**
Created complete page to view individual work packages (bar chart segments) including:

**HTML Structure:**
- Package Information card with 6 grid items:
  - Project name
  - Amount (GBP)
  - Status (completed/in progress/not started)
  - Payment Date
  - Contractor
  - Type (spent/pending/unspent)
- Timeline card showing 5 events with colored dots (green for completed, orange for pending)
- Documents card with 3 sample documents (invoices, certificates, photos)
- Back button for navigation

**JavaScript Functions:**
- `renderWorkPackageView()` (lines 1799-1833): Loads package data from sessionStorage and populates page
- `showWorkPackage(projectName, packageName, amount, type, event)` (lines 2021-2041): Navigation handler

**Navigation Flow:**
1. User clicks bar chart segment (spent/pending/unspent)
2. `showWorkPackage()` is called with package details
3. Package data stored in sessionStorage as JSON
4. Previous page stored for back navigation
5. Navigate to `#work-package-view`
6. `renderWorkPackageView()` loads data from sessionStorage
7. Back button returns to previous page (dashboard2 or fullscreen-chart)

**Key CSS Classes:**
- `.work-package-view-container` - Main container
- `.work-package-info-card` - Package information card
- `.work-package-info-grid` - 6-column grid for info items
- `.work-package-timeline-card` - Timeline card
- `.timeline-event` - Individual timeline event
- `.work-package-documents-card` - Documents card
- `.document-item` - Individual document row

### 4. Clickable Bar Chart Segments
**Files Modified:**
- `/Users/danielprice/Documents/GitHub/Construkt/web/static/projects/js/construkt.js` (lines 1009-1020, 1474-1485)

**What Was Done:**
- Added onclick handlers to all bar chart segments (spent, pending, unspent)
- Works in both dashboard and fullscreen chart views
- Each segment calls `showWorkPackage()` with appropriate parameters
- Event propagation stopped to prevent triggering project name click

**Example onclick handler:**
```javascript
onclick="showWorkPackage('${project.name}', '${packageName}', '${formatGBP(payment)}', 'Spent', event)"
```

## Architecture & Patterns

### Routing
- Hash-based routing: `window.location.hash`
- Routes defined at line 233 in construkt.js:
  ```javascript
  'work-package-view': { layout: 'app', page: 'work-package-view', nav: 'dashboard2' }
  ```

### Data Flow
- Uses `sessionStorage` for passing data between pages
- Pattern: Store as JSON string, retrieve and parse
- Example:
  ```javascript
  sessionStorage.setItem('currentWorkPackage', JSON.stringify(data));
  const data = JSON.parse(sessionStorage.getItem('currentWorkPackage'));
  ```

### Navigation Functions
Located in `frontend-prototype/web/static/projects/js/construkt.js`:
- `showProjectDetail(id)` - Navigate to project detail page
- `openWorkPackageView(projectId, packageId, event)` - Navigate to the current work package view from stored project/package IDs
- `showWorkPackage(projectName, packageName, amount, type, event)` - Navigate to the current work package view from chart/dashboard display data

### Design System
The application uses CSS custom properties (CSS variables) for consistent styling:
- `var(--color-surface-2)` - Card backgrounds
- `var(--color-border)` - Borders
- `var(--color-primary)` - Primary accent color
- `var(--color-text-primary)` - Main text
- `var(--space-*)` - Spacing scale
- `var(--radius-lg)` - Border radius

### Payment/Status Types
- **Spent** - Completed payments (green in timeline)
- **Pending** - In-progress payments (orange in timeline)
- **Unspent** - Not started/future payments (gray)

## Important File Locations

### Core Application Files
- **HTML Template:** `/Users/danielprice/Documents/GitHub/Construkt/web/templates/projects/construkt.html`
- **CSS Stylesheet:** `/Users/danielprice/Documents/GitHub/Construkt/web/static/projects/css/construkt.css`
- **JavaScript:** `/Users/danielprice/Documents/GitHub/Construkt/web/static/projects/js/construkt.js`

### Key Sections in construkt.js
- Line 233: Routes configuration
- Lines 677-726: Projects list rendering
- Lines 1799-1833: Work package view rendering
- Lines 2010-2041: Navigation functions

### Key Sections in construkt.html
- Lines 783-790: Projects page
- Lines 792-910: Work package view page

### Key Sections in construkt.css
- Lines 2707-2715: Clickable chart labels
- Lines 3333-3426: Projects page styling
- Lines 3428-3598: Work package view styling

## Git Information
- **Current Branch:** mar
- **Main Branch:** main
- **Status:** Clean (no uncommitted changes)
- **Recent Commits:**
  - 679f14d: Add Django web app split
  - 88cf031: Add website UI prototype
  - c4f90b1: Add Final Web static UI (construkt.html)

## Known Patterns & Conventions

### Event Handling
- Use onclick attributes in HTML for navigation
- Pass `event` parameter to stop propagation when needed
- Example: `onclick="showWorkPackage(..., event)"`

### Data Storage
- sessionStorage for page-to-page data transfer
- store object for application state (lines vary)
- Pattern: Always check if data exists before using

### Rendering Pattern
1. Read data from store/sessionStorage
2. Generate HTML string using template literals
3. Set innerHTML of container element
4. Attach event handlers if needed

### CSS Class Naming
- BEM-like naming: `.block-element-modifier`
- Example: `.work-package-view-container`, `.project-simple-item`
- Clickable elements: Add `-clickable` suffix

## Future Considerations

### Potential Enhancements
1. **Dynamic Work Package Data**: Currently uses hardcoded sample data in `showWorkPackage()`. Could be enhanced to fetch real package data from backend or store.

2. **Document Upload/Management**: Documents section currently shows sample documents. Could add actual document management functionality.

3. **Timeline Events**: Timeline shows hardcoded events. Could be dynamic based on actual package history.

4. **Contractor Information**: Currently hardcoded as "BuildTech Solutions Ltd". Should be dynamic based on actual contractor data.

5. **Payment Dates**: Currently generated based on type. Should come from actual payment schedule data.

### Code Quality Notes
- The application uses a mix of modern JavaScript (template literals, arrow functions)
- CSS uses modern features (custom properties, flexbox, grid)
- No build system detected - vanilla JavaScript, CSS, HTML
- Uses Django templating but most rendering happens client-side with JavaScript

## Testing Recommendations

### Test Scenarios
1. **Projects Page:**
   - Verify projects sort by urgency
   - Test color coding (red/orange/gray dots)
   - Click project to navigate to detail page

2. **Bar Charts:**
   - Click project name to navigate to project detail
   - Click spent segment to view work package
   - Click pending segment to view work package
   - Click unspent segment to view work package
   - Test in both dashboard and fullscreen views

3. **Work Package View:**
   - Verify all data displays correctly
   - Test back button navigation
   - Verify returns to correct previous page

4. **Navigation Flow:**
   - Dashboard → Click segment → Work package view → Back → Dashboard
   - Fullscreen chart → Click segment → Work package view → Back → Fullscreen chart

## Common Issues & Solutions

### Issue: onclick not working
**Solution:** Check that function is defined in global scope (not inside another function). Navigation functions should be around line 2010-2041.

### Issue: Data not showing in work package view
**Solution:** Check sessionStorage has 'currentWorkPackage' key. Verify JSON structure matches expected format in `renderWorkPackageView()`.

### Issue: Back button navigates to wrong page
**Solution:** Verify 'workPackagePreviousPage' is set in sessionStorage before navigation. Check it's set in `showWorkPackage()` function.

### Issue: Styles not applying
**Solution:** Check CSS variables are defined. Most styles use `var(--color-*)` and `var(--space-*)`. These should be defined in root CSS.

## Dependencies

### Package.json
- **Anchor Framework:** Solana blockchain development (@coral-xyz/anchor: ^0.32.1)
- **Solana SPL Token:** Token program (@solana/spl-token: ^0.4.14)
- **Testing:** mocha, chai, ts-mocha
- **Code Quality:** prettier, typescript

Note: The web frontend appears to be separate from the Solana/Anchor dependencies. The JavaScript/CSS/HTML files are standalone.

## Final Notes

This handoff covers all work completed in the most recent session focused on:
1. Projects page redesign (simple, professional, color-coded)
2. Clickable project names in bar charts
3. Complete work package view feature (NEW)
4. Clickable bar chart segments

All features are fully functional and integrated. The code follows existing patterns and conventions in the codebase. No breaking changes were made to existing functionality.

**Key Achievement:** Users can now click any segment in the bar charts to view detailed information about that specific work package, including status, timeline, and associated documents.
