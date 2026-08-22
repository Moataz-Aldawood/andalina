# Andalina Examples

This directory contains complete, standalone example websites built using **Andalina**, demonstrating client-side template composition without Node.js, Webpack, or server-side rendering.

---

## 🌐 Quick Start

To view and test these examples:
1. Open this project folder in a code editor like **Visual Studio Code**.
2. Start a local HTTP development server (e.g. using the **Live Server** extension) from the repository root or the `examples/` folder.
   > **Note:** Modern browsers block `fetch()` requests on `file://` URLs due to CORS restrictions. A local HTTP server (`http://127.0.0.1:5500/...`) is required for Andalina to load templates dynamically.
3. Open **`examples/index.html`** in your browser to access the interactive **Andalina Official Examples Hub**.

---

## 📁 Example 01: Company Portal & UI Library (`example-01-company-portal/`)

A 3-page interconnected website demonstrating a modular design system and component architecture:
- **`index.html` (UI Library & Default Values):**
  - Uses `<an-include src="partials/styles.html">` to dynamically load multiple CSS stylesheets (`reset.css` and `theme.css`).
  - Calls reusable UI controls (buttons, cards, text fields) from `components/ui-controls.html`, showing how slots use default fallback values when not explicitly overridden.
- **`team.html` (Layout + Repeat Grid):**
  - Combines `<an-layout src="layouts/master.html">` with `<an-repeat>` to populate a responsive grid with reusable employee cards (`<an-component template="user-card">`).
- **`code-showcase.html` (&lt;an-code&gt; Injection):**
  - Uses `<an-code src="..." />` to dynamically load, escape, and render raw JSON and HTML snippet files directly into the page.

---

## 📁 Example 02: Modern Product Catalog (`example-02-product-catalog/`)

A sleek E-Commerce SaaS product catalog and customer review showcase:
- **`index.html` (Product Storefront):**
  - Uses `<an-layout src="layouts/store-layout.html">` for sticky navigation and cart badges.
  - Uses `<an-repeat>` with reusable `<an-component template="product-card">` components featuring default badges (`"In Stock"`) and descriptions.
- **`reviews.html` (Customer Reviews):**
  - Uses `<an-layout>` and `<an-repeat>` with reusable `<an-component template="review-card">` components featuring default star ratings and quotes.
