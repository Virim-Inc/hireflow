# Responsive UI Implementation Documentation — HireFlow

This document summarizes all layout, design, hook, and code changes made to the HireFlow application to ensure a fully responsive, premium, and accessible interface across all screens (desktop, tablet, and mobile).

---

## 1. Centralized Viewport Hook (`src/lib/useMediaQuery.ts`)

A shared utility hook was created to act as the single source of truth for screen sizes across the React components, eliminating duplicate or competing `window.innerWidth` listeners:

- **`useMediaQuery(query)`**: Listens to browser query match events natively via `matchMedia` (with fallbacks for older browsers) and forces react re-renders only when screen sizes cross breakpoints.
- **`useBreakpoint()`**: Exposes convenient boolean flags:
  - `isXl` (width > 1201px) — Large desktop viewports.
  - `isLg` (width 1025px to 1200px) — Standard laptops/desktops.
  - `isMd` (width 769px to 1024px) — Tablet landscape.
  - `isSm` (width 601px to 768px) — Tablet portrait / Large mobile.
  - `isXs` (width ≤ 600px) — Mobile portrait.
  - `isMobile` (width ≤ 768px) — Grouped flag for mobile viewports.
  - `isDesktop` (width > 1024px) — Grouped flag for desktop viewports.

---

## 2. App Shell & Navigation Sidebar

### Changes to `src/App.tsx`
- Integrated `useBreakpoint()`.
- Derived the `collapsed` prop for the sidebar:
  - Collapses dynamically to compact icon-only mode when screens are between `769px` and `1200px`.
  - Stays expanded (`240px`) on screens `>1200px` unless toggled by the user.
  - Restores to full overlay mode on mobile devices (hidden until triggered).

### Changes to `src/components/shared/Sidebar.tsx`
- **GSAP Overlay Conflict Resolved**: Handled GSAP animation inline transforms by executing a `clearProps` call when screen width goes under `768px`. This prevents inline `translate3d(0, 0, 0)` from blocking CSS classes.
- **Hamburger Button**: Dynamically renders a mobile hamburger trigger button (with Lucide's `Menu` icon and descriptive `aria-label`).
- **Overlay Backdrop**: Rendered a blurred dark overlay behind the mobile drawer. Clicking the backdrop closes the menu overlay.
- **Mobile Close Button**: Implemented a header close button (`<ChevronLeft />`) inside the sidebar on mobile screens for easy manual dismissals.
- **Accessibility Improvements**:
  - Closed sidebar automatically on page navigation or logout.
  - Added key listeners to close the sidebar when the `Escape` key is pressed.
  - Implemented focus management: autofocuses the first navigation element when opened, and returns focus to the hamburger button when closed.

### Changes to `src/app.css`
- Styled the mobile hamburger button, overlay container backdrop, slide transitions, and padded top layout offsets for mobile content page viewports.

---

## 3. Candidates Page & Detail Drawer

### Changes to `src/features/candidates/components/CandidateDetailDrawer.tsx`
- Added React hooks to lock background scroll (`document.body.style.overflow = 'hidden'`) on mount and restore it cleanly on unmount. This prevents the parent list page from scrolling behind the drawer overlay.

### Changes to `src/features/candidates/styles/candidates.css`
- **Pre-Media Queries Audit**: Removed rigid layout sizes (`width`, `height`, strict `min-width` columns) and replaced them with flexible flexbox/grid variables.
- **Hero & Grids Refactoring**:
  - Resized and stacked the hero overview section from 2 columns to a single column on screens `≤1024px`.
  - Configured candidate cards grid to wrap columns cleanly and scale down layout paddings.
  - Stacked pagination items and centered controls on mobile.
- **Candidate Cards Stress-Proofing**:
  - Added `text-overflow: ellipsis`, `overflow: hidden`, and `white-space: nowrap` for long candidate names and job titles.
  - Used `word-break: break-all` on candidate contact info lines to prevent email blowout.
- **Takeover Mobile Drawer**:
  - Set drawer layout to full-screen (`width: 100%`, `height: 100dvh`, fixed inset) on screens `≤768px`.
  - Stacked metrics cards (Overall score, AI recommendation, etc.) from a 4-column row into a vertical list stack.
- **Zoho Resume Preview Tab Fix**:
  - Implemented `min-width: 0`, `flex: 1` resets, and text truncation on the workdrive file name element.
  - Added a horizontal spacing gap to prevent the download button from blowing out and falling off the right edge of the card.

---

## 4. Hiring Pipeline (Kanban Board)

### Changes to `src/features/pipeline/styles/pipeline.css`
- **Option A (Stacked Columns)**: Configured Kanban stages on screens `≤720px` to stack vertically instead of scrolling horizontally.
- **Header Alignment**: Modified horizontal padding of `.pl-column-head` from `16px` to `12px` to align perfectly with candidate cards and scrollbar margins.
- **Mobile Toolbar**: Wrapped search and dropdown filter inputs to stack full-width vertically.
- **Bulk Action Bar**: Stacked controls into a vertical pill container that pins cleanly above viewport boundaries on mobile.

---

## 5. JD Scout Page

### Changes to `src/features/jd-scout/styles/jd-scout.css`
- Stacked form items and fields to take up full width (`100%`) on smaller viewports.
- Stacked result cards horizontally into a single column on mobile, with flexible triggers.
- Made reset controls stretch full width on mobile header.

---

## 6. Dashboard Page & Analytics Charts

### Changes to `src/features/dashboard/styles/dashboard.css`
- Modified daily stats range picker buttons to scroll horizontally with no visible scrollbars on mobile.
- Stacked toggle switch controls row.

### Changes to `src/features/dashboard/styles/analytics.css`
- Configured timeline charts and metric containers to scale fluidly with no fixed pixel width overflows.
