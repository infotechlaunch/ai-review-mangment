# AI Review Management Dashboard - Layout Guide

## Overview

Clean, enterprise-grade SaaS dashboard with fixed sidebar navigation and scrollable main content area.

## Layout Structure

### 1. App Container (`App.jsx`)

```jsx
<div className="app-container">
  <Sidebar />
  <main className="main-content">
    <AppRoute />
  </main>
</div>
```

### 2. Fixed Sidebar

- **Width:** 260px (desktop), 80px (tablet), 70px (mobile)
- **Position:** Fixed left
- **Behavior:** Remains visible while content scrolls
- **Components:**
  - Logo/Title at top
  - Vertical navigation menu
  - Active state highlighting (blue background)
  - Hover effects with smooth transitions

### 3. Main Content Area

- **Position:** Flex container with left margin
- **Scroll:** Independent vertical scrolling
- **Max Width:** 1400px (centered)
- **Padding:** 48px (desktop), adjusts for smaller screens

## Page Structure

Every page follows this consistent structure:

```jsx
<div className="page-container">
  {/* Page Header - Fixed top section */}
  <div className="page-header">
    <h1 className="page-title">Page Title</h1>
    <p className="page-subtitle">Descriptive subtitle</p>
  </div>

  {/* Scrollable Content */}
  <div className="page-content">{/* Your content here */}</div>
</div>
```

## Grid System

### 12-Column Responsive Grid

Use the grid system for laying out widgets and content:

```jsx
<div className="grid-container">
  <div className="grid-col-4">...</div>
  <div className="grid-col-4">...</div>
  <div className="grid-col-4">...</div>
</div>
```

### Grid Classes

- `.grid-col-1` through `.grid-col-12` (spans 1-12 columns)
- **Gap:** 24px between items (16px on mobile)
- **Mobile Behavior:** All columns become full-width on screens < 768px

### Common Layouts

**Three Equal Columns:**

```jsx
<div className="grid-col-4">Widget 1</div>
<div className="grid-col-4">Widget 2</div>
<div className="grid-col-4">Widget 3</div>
```

**2/3 and 1/3 Split:**

```jsx
<div className="grid-col-8">Main Content</div>
<div className="grid-col-4">Sidebar</div>
```

**Full Width:**

```jsx
<div className="grid-col-12">Full Width Content</div>
```

## Widget Cards

Standardized card component for content:

```jsx
<div className="widget-card">
  <h3 className="widget-title">Card Title</h3>
  <p>Card content...</p>
</div>
```

**Features:**

- White background with subtle border
- 8px border radius
- Hover effect (slight shadow increase)
- 24px internal padding

## Responsive Breakpoints

### Desktop (Default)

- Sidebar: 260px wide
- Main content: Full margin adjustment
- Grid: 12 columns
- Padding: 48px

### Tablet (≤ 1024px)

- Sidebar: 80px (icons only)
- Labels hidden
- Grid: Maintains columns
- Padding: 32px

### Mobile (≤ 768px)

- Sidebar: 70px
- Grid: Single column (all widgets stack)
- Padding: 24px
- Reduced font sizes

## Color Palette

### Primary Colors

- **Sidebar Background:** `#1a202c` (Dark blue-gray)
- **Sidebar Border:** `#2d3748`
- **Active Item:** `#2563eb` (Blue)
- **Hover Background:** `#2d3748`

### Content Colors

- **Page Background:** `#f8f9fa` (Light gray)
- **Card Background:** `#ffffff` (White)
- **Card Border:** `#e9ecef`
- **Title Text:** `#1a202c` (Dark)
- **Subtitle/Body Text:** `#6c757d` (Gray)

## Typography

### Page Headers

- **Title:** 28px, weight 600, color `#1a202c`
- **Subtitle:** 15px, weight 400, color `#6c757d`

### Widget Cards

- **Title:** 16px, weight 600, color `#2d3748`
- **Body:** 14-15px, color `#6c757d`

### Sidebar

- **Logo/Title:** 22px, weight 700
- **Menu Items:** 14px, weight 500

## Navigation

### Active State

- Blue background (`#2563eb`)
- White text
- Subtle shadow
- Smooth transitions

### Hover State

- Dark gray background (`#2d3748`)
- Slight transform (2px right)
- 0.2s ease transition

## Best Practices

### 1. **Consistent Spacing**

- Use the grid system for layout
- Maintain 24px gaps between widgets
- Keep consistent page padding

### 2. **Clear Hierarchy**

- Page title → Subtitle → Content
- Use widget cards to group related content
- Leave whitespace for readability

### 3. **Responsive Design**

- Test at all breakpoints
- Ensure content remains accessible on mobile
- Icons-only sidebar on smaller screens

### 4. **Performance**

- Fixed sidebar prevents reflow
- Independent scrolling areas
- Smooth CSS transitions

### 5. **Accessibility**

- Semantic HTML (`<aside>`, `<main>`, `<nav>`)
- Clear focus states
- Proper heading hierarchy

## Example Implementations

### Dashboard Page

```jsx
<div className="page-container">
  <div className="page-header">
    <h1 className="page-title">Dashboard</h1>
    <p className="page-subtitle">Monitor metrics at a glance</p>
  </div>
  <div className="page-content">
    <div className="grid-container">
      <div className="grid-col-4">
        <div className="widget-card">
          <h3 className="widget-title">Metric 1</h3>
          <p>Content</p>
        </div>
      </div>
      {/* More columns... */}
    </div>
  </div>
</div>
```

### Two-Column Layout

```jsx
<div className="grid-container">
  <div className="grid-col-6">
    <div className="widget-card">Left Content</div>
  </div>
  <div className="grid-col-6">
    <div className="widget-card">Right Content</div>
  </div>
</div>
```

## CSS Class Reference

### Layout Classes

- `.app-container` - Main app wrapper
- `.main-content` - Scrollable content area
- `.page-container` - Page wrapper
- `.page-header` - Fixed page header
- `.page-title` - H1 page title
- `.page-subtitle` - Descriptive subtitle
- `.page-content` - Scrollable page content

### Grid Classes

- `.grid-container` - Grid wrapper
- `.grid-col-{1-12}` - Column spans

### Component Classes

- `.widget-card` - Card container
- `.widget-title` - Card heading
- `.sidebar` - Sidebar container
- `.sidebar-header` - Sidebar top section
- `.sidebar-nav` - Navigation wrapper

## Future Enhancements

### Planned Features

- Dark mode support
- Customizable sidebar width
- Collapsible sidebar toggle
- Breadcrumb navigation
- Search functionality
- User profile section

### Scalability

- Grid system supports any layout combination
- Consistent spacing allows easy widget addition
- Modular component structure
- CSS variables for easy theming
