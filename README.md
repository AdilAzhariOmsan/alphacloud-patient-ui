# Alphacloud · Patient Management UI

A responsive, accessible **Patient Management System** front end built for the Alphacloud Frontend/UI assessment. It uses plain HTML, CSS and vanilla JavaScript (native ES modules), with **no build step and no dependencies**.

> **Live preview:** _add your GitHub Pages URL here_

![Desktop layout](docs/screenshot-desktop.png)

---

## Running locally

ES modules don't load over `file://`, so serve the folder with any static server:

```bash
# Option 1: Node
npx serve .

# Option 2: Python
python -m http.server 5173
```

Then open <http://localhost:5173>.

### Deploying to GitHub Pages
In the repo, go to **Settings → Pages → Build and deployment**, pick **Deploy from a branch**, choose `main` and `/ (root)`, then save. The site needs no build.

### Demo URL flags
The data layer is a mock async service with simulated latency, so every UI state is real. These flags let you force each one:

| URL | What you'll see |
| --- | --- |
| `/?delay=3000` | Loading skeletons for 3 seconds |
| `/?empty` | Empty state (no patients yet) |
| `/?fail` | Error state with **Try again** in both the list and the detail panel |
| `/?failOps` | Writes (edit, delete, VIP, add) fail with an error toast or an inline form error |

A search with no matches shows the "No patients found" empty state.

---

## Features

**Spec coverage**
- **Sidebar:** fixed, 240px wide, `#0052CC`. Eight menu items with icons and an active state on **Patient**. Counter badges on **Queue** (live) and **Appointment** (5). A white **Update to Pro** card with a blue CTA.
- **Header:** the **患者管理** title (24px bold) with a 14px subtitle. A light-grey search with a prefixed icon, the "Search" placeholder and a 240px minimum width (press `/` to focus it). A **+** add-patient button and the user profile with an avatar.
- **Patient table:** avatar, full name and ID number (12px, muted). Phone with country code. Country with its flag. `DD MMM YYYY HH:MM AM/PM` timestamps. VIP badges (`#FFD700`). Alternating `#F8F9FA` rows and hover states. A three-dots menu on each row.
- **Pagination:** Prev/Next buttons, page numbers with a current-page indicator, a rows-per-page selector and **"Showing X of Y results"**.
- **Detail panel:** slides in from the right. Shows contact, email, nationality with its flag, birthday and age, NRIC/passport, occupation, last visit (date, how long ago and visit duration) and medical remarks. Allergies are highlighted as an alert. It also lists **upcoming appointment cards**: date and time, treatment, doctor, status and symptom summary.
- **States:** skeleton loading, empty (no data or no matches), error with retry, error toasts for failed operations, and tooltips that appear only when text is actually truncated.

**Bonus features**
- **Sorting** on Patient Name, Nationality and Datetime (`aria-sort` included)
- **Filters:** nationality, live status and VIP only, with a summary pill such as "14 / 36"
- **CSV export** of the filtered list, of the current selection or of a single record. It is UTF-8 with a BOM for Excel and escapes values to block CSV injection.
- **Bulk actions menu:** select rows, then mark or unmark VIP, export or delete
- **Quick actions menu** (three dots): view, edit, toggle VIP, export, and delete with **Undo**
- **Real-time status indicators:** a simulated live feed moves patients through *Not in clinic → In queue → In consultation → Checked out*. It updates the status dots in place and the sidebar Queue badge, and pauses while the tab is hidden.
- **Add and edit patient** dialog with inline validation

---

## Responsive behaviour

| Breakpoint | Behaviour |
| --- | --- |
| **Desktop ≥ 1200px** | Full layout with the 240px sidebar |
| **Tablet 768–1199px** | A header toggle collapses the sidebar to a 72px icon rail (the choice is remembered). The table scrolls horizontally inside a focusable region. |
| **Mobile < 768px** | Icon-only sidebar (labels appear as tooltips). The header wraps. Table rows become cards with labelled fields, and pagination is condensed. |

---

## Accessibility

- **Contrast:** all text pairs meet WCAG AA. `#36B37E` (success) and `#FFD700` (VIP) are used as fills, with darker text tokens on top.
- **Keyboard:** everything works from the keyboard.
  - A skip link and a `/` shortcut for search
  - `↑`/`↓` move between table rows
  - Menus follow the WAI-ARIA menu-button pattern (`↑ ↓ Home End Esc`)
  - The detail panel is a modal dialog with a focus trap, `Esc` to close, an `inert` background and focus returned to whatever opened it
  - Focus is kept on the same control after rows re-render
- **Focus:** a visible `:focus-visible` ring on every interactive element.
- **ARIA:** labelled icon buttons, a `role="search"` landmark, `aria-current` on the active nav item and page, `aria-sort`, `aria-busy`, polite live regions for result counts and toasts, `role="alert"` for errors, and screen-reader text for badges and status dots.
- **Images and icons:** every flag `<img>` has alt text, and decorative SVG icons are `aria-hidden`.
- **Preferences:** `prefers-reduced-motion` and Windows forced-colors mode are respected.
- **Forms:** errors are linked to their fields with `aria-describedby` and `aria-invalid`, and focus moves to the first invalid field.

---

## Project structure

```
index.html                     App shell and mount points
css/
  tokens.css                   Design tokens (spec colours, type scale, spacing, z-index)
  base.css                     Reset, focus ring, buttons, badges, avatars, form controls
  layout.css                   Sidebar, top header, main area
  components.css               Table, pagination, menu, drawer, dialog, toasts, tooltip, states
  responsive.css               Breakpoints, reduced motion, forced colours
js/
  main.js                      App state, data loading (with a race guard), wiring
  components/
    sidebar.js  header.js  toolbar.js  patientTable.js  pagination.js
    detailPanel.js  actionMenu.js  patientDialog.js  toast.js  tooltip.js  icons.js
  services/patientService.js   Mock async API (list/get/create/update/remove/restore + live feed)
  data/patients.js             Seeded, deterministic mock patients
  utils/                       dom.js (escaping html`` templates), format.js, csv.js
```

Each component is a function that renders into a mount point and returns a small API, such as `update(state)`, `open()` or `setStatus()`. `main.js` owns the single state object and passes data down, while components report user actions through callbacks. Templates are built with an `html` tagged template that **escapes every interpolated value**, so user-entered names can't inject markup.

## Tech choices

- **No framework or build step.** The assessment asks for a static page, so native ES modules keep it easy to review and to host on GitHub Pages.
- **Inter** from Google Fonts, with a system sans-serif fallback stack that includes CJK fonts for 患者管理.
- **Flags** come from [flagcdn.com](https://flagcdn.com) as images. Emoji flags don't render on Windows.
- **Avatars** are generated initials, so there are no third-party photos and nothing breaks offline.

## Browser support
Current Chrome, Edge, Firefox and Safari. The app uses `<dialog>`, `inert`, `structuredClone` and `:focus-visible`.
