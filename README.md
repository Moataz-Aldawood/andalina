# Andalina

**A zero-dependency, client-side template engine that brings component architecture to vanilla HTML.**

[![Website](https://img.shields.io/badge/Website-Andalina-orange?style=for-the-badge)](https://moataz-aldawood.github.io/andalina/)
[![Documentation](https://img.shields.io/badge/Docs-Explore%20Reference-blue?style=for-the-badge)](https://moataz-aldawood.github.io/andalina/docs/)
[![GitHub](https://img.shields.io/badge/GitHub-Moataz--Aldawood%2Fandalina-darkgrey?style=for-the-badge)](https://github.com/Moataz-Aldawood/andalina)

---

## 🌐 Official Website & Documentation

> **Explore interactive demos, live examples, and complete documentation on the official website:**
> ### 👉 **[https://moataz-aldawood.github.io/andalina/](https://moataz-aldawood.github.io/andalina/)**

---

## ✨ Why Andalina?

Andalina is a simple, zero-dependency client-side template engine designed to enforce the **DRY (Don't Repeat Yourself)** principle for standard HTML authoring without needing Node.js, Webpack, or a server-side build step.

- **🚀 Zero-Dependency:** Runs directly in the browser. No complex build pipelines or bundlers required.
- **📦 Component Architecture for Vanilla HTML:** Create reusable components, layouts, templates, and repeats with clean, declarative tags.
- **🤝 Bridge FE & BE Teams:** Deliver structured, modular HTML components that map cleanly to server-side component boundaries without rewriting code.
- **⚡ Simple & Declarative:** Learn the entire library in minutes with just a few intuitive `<an-*>` tags.

---

## 🛠️ Core Tags

| Tag | Description |
| :--- | :--- |
| **`<an-template>`** | Define reusable HTML template structures and named slots. |
| **`<an-component>`** | Instantiate a template and pass custom content into slots. |
| **`<an-layout>`** | Create page-level master layouts with configurable sections. |
| **`<an-include>`** | Dynamically fetch and embed external HTML snippets and components. |
| **`<an-repeat>`** | Loop over data or elements declaratively. |
| **`<an-code>`** | Embed clean syntax-highlighted code blocks. |

---

## 🚀 Quick Start

### 1. Download & Include the Script
Drop `andalina.js` into your project and include it in the `<head>` of your HTML document with `defer`:

```html
<head>
   <script src="core/andalina.js" defer></script>
</head>
```

### 2. Run with a Local Server
Because Andalina uses the Fetch API to load templates dynamically, you must run your project via a local HTTP development server (such as VS Code's **Live Server** extension) to avoid browser CORS restrictions on `file://` URLs.

---

## 📖 Learn More

For full documentation, guides, FAQs, and interactive examples, visit the official website:
- **Website:** [https://moataz-aldawood.github.io/andalina/](https://moataz-aldawood.github.io/andalina/)
- **Documentation:** [https://moataz-aldawood.github.io/andalina/documentation.html](https://moataz-aldawood.github.io/andalina/documentation.html)
- **Download Releases:** [https://moataz-aldawood.github.io/andalina/download.html](https://moataz-aldawood.github.io/andalina/download.html)

---

## 📄 License

Licensed under the GNU Lesser General Public License (LGPL-3.0-or-later). See [LICENSE](file:///LICENSE) for details.
