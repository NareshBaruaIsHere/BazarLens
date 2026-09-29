# Authentication and panel update

The login and signup pages adapt the form-and-image composition from [shadcn login-04](https://ui.shadcn.com/blocks/login#login-04) and [signup-04](https://ui.shadcn.com/blocks/signup#signup-04) using this project's existing React components and CSS. No social authentication options are shown. Signup requires city and thana; thana uses the existing `area` storage field for compatibility.

## Prices

- The user Prices page removes area/market filters and columns, low/high values, and detail actions. It groups records by product and unit and averages the latest market averages into one product row. The displayed update date is the newest included observation.
- Public statistics retain market context but remove low/high columns and price history.
- The Trends route, sidebar entry, and dashboard trend chart are removed.
- Submission tables show category, quality, notes, screening/rejection reasons, and evidence inline, without a Details button.

## Contributions and review

- Category limits the product picker to matching products. Changing category selects a product in that category and updates its unit.
- Quality is required in the form: Standard, Premium, or Economy. Values are validated by the mock service and backup importer. Legacy submissions without quality display “Not recorded”; legacy callers default to Standard on save.
- `/admin/product-review` contains only flagged pending submissions. It supports approval and rejection, with a required rejection reason. Reviewed items leave the queue and remain in the full submission list.
- Add user offers User and Agent. The mock service rejects attempts to create an Admin; existing administrator editing and last-admin protections remain available.
- Agents land on Submissions and have only submission, profile, and settings pages. Direct visits to other authenticated modules redirect to Submissions. Agent settings omit price notification preferences.

## Verification

Run from `bazarlens.client`:

```sh
npm run lint
npm run build
npm test
```

Tests cover service authorization and CRUD, screening boundaries, category and quality persistence and validation, signup location persistence, flagged-review lifecycle, backup compatibility, role destinations, and populated page markup. Server-rendered checks do not exercise browser events or responsive visual layout.

This remains a frontend prototype backed by browser storage. These changes do not connect a production authentication or database service.

## Responsive sidebar follow-up

The desktop sidebar stays in view, with independently scrolling links and a fixed logout button. At 1024px and below it becomes a drawer, with background scroll locking, keyboard focus containment, Escape/backdrop dismissal, and reset on breakpoint changes. Short screens hide the promotional card. Sidebar-specific styles live in `src/layouts/Sidebar.css` after the shared styles.

Verified in headless Chrome at 1280×720, 1024×768, 768×1024, 390×844, 320×568, and 844×390: desktop sticky positioning, no horizontal overflow, logout visibility, focus wrapping, Escape, backdrop dismissal, navigation closure, scroll locking, and desktop/mobile resize reset.
