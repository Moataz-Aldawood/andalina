# Andalina Documentation

> A zero-dependency, client-side template engine that brings component architecture, layouts, data bindings, and logic to vanilla HTML.

---

## Table of Contents

- [What is Andalina?](#what-is-andalina)
  - [The Problem We Solve](#the-problem-we-solve)
  - [The Vision](#the-vision)
- [How to Use](#how-to-use)
  - [1. Download Andalina](#1-download-andalina)
  - [2. Add to Your HTML Document](#2-add-to-your-html-document)
  - [3. Run a Local Development Server](#3-run-a-local-development-server)
- [Core Tags Reference](#core-tags-reference)
  - [`<an-include>`](#an-include)
  - [`<an-data>`](#an-data)
  - [`<an-repeat>`](#an-repeat)
  - [`<an-component>`](#an-component)
  - [`<an-layout>`](#an-layout)
  - [`<an-template>`](#an-template)
  - [`<an-code>`](#an-code)
  - [`<an-if>` / `<an-else>`](#an-if--an-else)
- [JS Expressions in Bindings](#js-expressions-in-bindings)
- [`<!-- an-comment: -->`](#--an-comment---)
- [Configuration](#configuration)
  - [Global Configuration (`andalina.config.json`)](#global-configuration-andalinaconfigjson)
  - [Page Scope Overrides](#page-scope-overrides)
- [Developer Tools & Inspection](#developer-tools--inspection)
  - [Show Rendered HTML](#show-rendered-html)
  - [Debugging & DevTools Overlay](#debugging--devtools-overlay)
- [Third-Party JS Compatibility](#third-party-js-compatibility)
  - [The Issue](#the-issue)
  - [The Solution (`andalina:ready`)](#the-solution-andalinaready)
  - [Safe Initialization Example](#safe-initialization-example)
- [Andalina Builder (VS Code Extension & CLI)](#andalina-builder-vs-code-extension--cli)
  - [Features](#features)
  - [How to Use](#how-to-use-1)

---

## What is Andalina?

**Andalina** is a zero-dependency, development-time composition tool designed to enforce the **DRY (Don't Repeat Yourself)** principle for HTML authoring. It is not a framework for serving web applications; it is a template parser for HTML/XHTML that runs directly in the browser without build steps, Webpack, or Node.js runtime requirements.

### The Problem We Solve

This addresses a classic **Developer Experience (DX) problem**: the handoff friction between Front-End (FE) and Back-End (BE) teams. 

Often, when the FE team delivers raw HTML prototypes, the BE team has to rewrite or "clean up" the HTML to ingest it or wrap it into server-side view engines (JavaServer Faces, Blade, Laravel, Django, Thymeleaf, ASP.NET, PHP, JSP, Jinja2, etc.). This leads to significant misalignment, code drift, and duplicated maintenance during active development.

### The Vision

Our vision is to solve this misalignment by providing a simple, unified, language-agnostic template language. By using Andalina, the FE team delivers structured, modular components that map directly to server-side component boundaries. The BE team can integrate these templates without rewriting the markup.

This vision is built upon four core pillars:

1. **Zero-Dependency**: Andalina runs entirely in the browser. No Node.js build pipelines, no Webpack bundlers, and no server-side rendering required.
2. **Simple & Easy to Learn**: Andalina uses only intuitive declarative tags (`<an-*>`). It is easy to pick up, even for beginners.
3. **Standard HTML/XHTML**: No need to learn a new programming language or proprietary JSX syntax. It's just the HTML you already know!
4. **Single Source of Truth**: Front-End developers fix bugs in exactly one place. No more repeating navigation bars or cards across 20 files—Andalina handles composition automatically.

---

## How to Use

### 1. Download Andalina

Download the latest version of Andalina from the official website or repository. The distribution archive (`.zip`) includes:

- `andalina.js`: The zero-dependency core client-side template engine.
- `andalina.config.json`: Configuration file for defining paths and framework-safe data binding delimiters.

### 2. Add to Your HTML Document

Place `andalina.js` into your project directory and include it inside the `<head>` of your HTML document using the `defer` attribute so it executes after DOM parsing:

```html
<head>
    <script src="andalina.js" defer></script>
</head>
```

### 3. Run a Local Development Server

> [!IMPORTANT]
> **CORS Restriction**: Because Andalina uses the browser Fetch API to load templates dynamically, modern browsers block requests when opening HTML files via the `file://` protocol. **You must run your project through a local HTTP server** (such as VS Code's "Live Server" extension, `npx serve`, or Python's `http.server`) for Andalina to work!

---

## Core Tags Reference

### `<an-include>`

Used to inject static HTML partials directly into your document.

#### Attributes:

- `src` *(Optional)*: The exact relative or absolute path to the HTML/XHTML file you want to include.
- `name` *(Optional)*: The name of the include fragment (resolves automatically to `[includesPath]/[name][extension]`).

> [!NOTE]
> You must provide either `src` or `name`.

#### Example:

**1. The Partial (`head-content.html`)**

```html
<an-attribute name="title" default-value="Welcome" />
<meta charset="UTF-8"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<!-- Favicon -->
<link rel="icon" data-type="image/x-icon" href="./assets/imgs/Favicon/Favicon.png"/>
<!-- css files -->
<link rel="stylesheet" href="./assets/style.css"/>
<!-- js -->
<script src="./js/x.js"></script>
```

**2. The Calling Page (`index.html`)**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <script src="andalina.js" defer></script>
    <an-include src="head-content.html"></an-include>
</head>
<body>
    <p> Welcome </p>
</body>
</html>
```

#### Rendered HTML:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <script src="andalina.js" defer></script>
    <meta charset="UTF-8"/>
    <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <!-- Favicon -->
    <link rel="icon" data-type="image/x-icon" href="./assets/imgs/Favicon/Favicon.png"/>
    <!-- css files -->
    <link rel="stylesheet" href="./assets/style.css"/>
    <!-- js -->
    <script src="./js/x.js"></script>
</head>
<body>
    <p> Welcome </p>
</body>
</html>
```

---

### `<an-data>`

Used to fetch external JSON data and store it in memory for your templates to use.

#### Attributes:

- `src` *(Required)*: The URL or relative path to the JSON file or endpoint.
- `name` *(Required)*: The variable name to store the fetched data under in memory.

#### Example 1 (Basic Fetch):

```html
<!-- Fetch data from an external JSON file and store it in 'myList' -->
<an-data src="https://api.example.com/items.json" name="myList"></an-data>
```

#### Example 2 (Global Data Binding & Array Indexing):

Any data fetched using `<an-data>` becomes globally available throughout the entire document. You can inject strings, numbers, or nested objects directly into your HTML markup or element attributes anywhere on the page without needing a loop:

```html
<!-- store.json contains: { "title": "Tech Haven", "featured": ["Laptops", "Phones"] } -->
<an-data src="store.json" name="store"></an-data>

<div class="store-info">
    <!-- Access object properties using dot notation -->
    <h1>Welcome to {{ store.title }}</h1>
    
    <!-- Access array indexes natively using bracket notation -->
    <p>Today's featured category: {{ store.featured[0] }}</p>
</div>
```

#### Rendered HTML (Example 2):

```html
<div class="store-info">
    <!-- Access object properties using dot notation -->
    <h1>Welcome to Tech Haven</h1>
    
    <!-- Access array indexes natively using bracket notation -->
    <p>Today's featured category: Laptops</p>
</div>
```

---

### `<an-repeat>`

Used to loop content dynamically. You can either repeat content a specific number of times, or iterate over arrays fetched via `<an-data>`.

#### Attributes:

- `times` *(Optional)*: An integer specifying how many times to repeat the content block (for simple numeric loops).
- `data` *(Optional)*: The name of the data array fetched via `<an-data>` to iterate over.
- `item` *(Optional, Default: `"item"`)*: The local variable name used to access the current item in the array.
- `index-as` *(Optional, Default: `"$index"`)*: The variable name representing the current loop iteration index (0-indexed).

#### Example 1 (Simple Numeric Loop):

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <script src="andalina.js" defer></script>
</head>
<body>
    <an-repeat times="3" index-as="i">
        <p>Item number {{i}}</p>
    </an-repeat>
</body>
</html>
```

#### Rendered HTML (Example 1):

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <script src="andalina.js" defer></script>
</head>
<body>
    <p>Item number 0</p>
    <p>Item number 1</p>
    <p>Item number 2</p>
</body>
</html>
```

#### Example 2 (Looping Over Fetched Data):

```html
<!-- data.json contains: [{ "id": 1, "name": "Product A" }, { "id": 2, "name": "Product B" }] -->
<an-data src="data.json" name="products"></an-data>

<an-repeat data="products" item="product">
    <div class="product-card">
        <h3>{{ product.name }}</h3>
        <p>Product ID: {{ product.id }}</p>
    </div>
</an-repeat>
```

#### Rendered HTML (Example 2):

```html
<div class="product-card">
    <h3>Product A</h3>
    <p>Product ID: 1</p>
</div>
<div class="product-card">
    <h3>Product B</h3>
    <p>Product ID: 2</p>
</div>
```

---

### `<an-component>`

Used to instantiate reusable components and pass dynamic properties via attributes.

#### Attributes:

- `src` *(Optional)*: The exact path to the component HTML/XHTML file.
- `name` *(Optional)*: The name of the component (resolves to `[componentsPath]/[name][extension]`).
- *Dynamic Attributes*: Any additional attributes added to the tag are passed into the component as property bindings.

#### Component Structured Syntax:

Inside the component file, define your component using Andalina's **Structured Syntax**:
1. Wrap the file in an `<an-component-def>` container.
2. Specify prop metadata inside an `<an-attributes>` block.
3. Place your component template inside an `<an-body>` block.

Inside `<an-attributes>`, use `<an-attribute>` to declare properties:
- `name` *(Required)*: The name of the property.
- `default-value` *(Optional)*: A fallback value if the prop is omitted by the caller.
- `mandatory` *(Optional)*: Set to `"true"` to emit a warning if the prop is not provided.

#### Example:

**1. The Component (`user-card.html`)**

```html
<an-component-def>
    <an-attributes>
        <!-- define component attributes that will be passed from the caller -->
        <an-attribute name="username" mandatory="true" />
        <an-attribute name="role" default-value="Member" />
    </an-attributes>

    <an-body>
        <!-- defining component code structure -->
        <div class="card">
            <h2>{{username}}</h2>
            <p>Role: {{role}}</p>
        </div>
    </an-body>
</an-component-def>
```

**2. The Calling Page (`index.html`)**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <script src="andalina.js" defer></script>
</head>
<body>
    <!-- call a component using src attribute -->
    <an-component src="user-card.html" username="Alice" role="Admin"></an-component>

    <!-- call a component using name attribute -->
    <an-component name="user-card" username="Bob"></an-component>
</body>
</html>
```

#### Rendered HTML:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <script src="andalina.js" defer></script>
</head>
<body>
    <div class="card">
        <h2>Alice</h2>
        <p>Role: Admin</p>
    </div>

    <div class="card">
        <h2>Bob</h2>
        <p>Role: Member</p>
    </div>
</body>
</html>
```

---

### `<an-layout>`

A structural wrapper that can be nested inside an `<an-template>` or within another layout. It provides a reusable shell (like a dashboard grid, sidebar layout, or split container) and uses `<an-place>` slots to accept content injected via `<an-inject>`.

Like components, layouts use Andalina's **Structured Syntax**: wrap the file in an `<an-layout-def>` container, define optional metadata inside `<an-attributes>`, and place the structural markup inside `<an-body>`.

#### Attributes:

- `src` *(Optional)*: The exact path to the layout HTML/XHTML file.
- `name` *(Optional)*: The name of the layout (resolves to `[layoutsPath]/[name][extension]`).

#### Example:

**1. The Grid Layout (`dashboard-layout.html`)**

```html
<an-layout-def>
    <an-attributes>
        <an-attribute name="theme" default-value="light" />
    </an-attributes>
    <an-body>
        <div class="dashboard-grid theme-{{theme}}">
            <header class="header">
                <an-place name="header-content"></an-place>
            </header>
            <aside class="sidebar">
                <an-place name="sidebar-content"></an-place>
            </aside>
            <main class="main-content">
                <an-place name="main-content"></an-place>
            </main>
            <footer class="footer">
                <p>&copy; 2026 Dashboard</p>
            </footer>
        </div>
    </an-body>
</an-layout-def>
```

**2. The Calling Page (`admin.html`)**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <script src="andalina.js" defer></script>
</head>
<body>
    <an-layout src="dashboard-layout.html" theme="dark">
        <an-inject name="header-content">
            <h1>Admin Dashboard</h1>
        </an-inject>
        <an-inject name="sidebar-content">
            <ul>
                <li><a href="/users">Users</a></li>
                <li><a href="/settings">Settings</a></li>
            </ul>
        </an-inject>
        <an-inject name="main-content">
            <div class="stats-card">Welcome back, Admin!</div>
        </an-inject>
    </an-layout>
</body>
</html>
```

#### Rendered HTML:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <script src="andalina.js" defer></script>
</head>
<body>
    <div class="dashboard-grid theme-dark">
        <header class="header">
            <h1>Admin Dashboard</h1>
        </header>
        <aside class="sidebar">
            <ul>
                <li><a href="/users">Users</a></li>
                <li><a href="/settings">Settings</a></li>
            </ul>
        </aside>
        <main class="main-content">
            <div class="stats-card">Welcome back, Admin!</div>
        </main>
        <footer class="footer">
            <p>&copy; 2026 Dashboard</p>
        </footer>
    </div>
</body>
</html>
```

---

### `<an-template>`

The root template tag used on your page to wrap your content inside a complete HTML document template. Unlike an `<an-layout>` (which acts as an inner structural partial), a template provides the full document structure, including the `<!DOCTYPE html>`, `<html>`, `<head>`, and `<body>` tags.

#### Attributes:

- `src` *(Optional)*: The exact path to the root template HTML/XHTML file.
- `name` *(Optional)*: The name of the template page (resolves to `[templatesPath]/[name][extension]`).

#### Example:

**1. The Root Template (`master.html`)**

```html
<!DOCTYPE html>
<html lang="{{lang}}">
<head>
    <!-- defining template attributes inside head -->
    <an-attribute name="lang" default-value="en" />

    <meta charset="UTF-8">
    <title>My Awesome Website</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <!-- Site Header -->
    <header class="site-header">
        <an-include src="partials/nav.html"></an-include>
    </header>

    <!-- Main Content Injection Point -->
    <main class="container">
        <an-place name="content"></an-place>
    </main>

    <!-- Site Footer -->
    <footer class="site-footer">
        <an-include src="partials/footer.html"></an-include>
    </footer>

    <!-- Andalina Scripts -->
    <script src="andalina.js" data-templates-path="templates"></script>
</body>
</html>
```

**2. The Calling Page (`index.html`)**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <script src="andalina.js" defer></script>
</head>
<body>
    <an-template name="master" lang="fr">
        <an-inject name="content">
            <section class="hero">
                <h1>Welcome to my Website!</h1>
                <p>This is my page content.</p>
            </section>
        </an-inject>
    </an-template>
</body>
</html>
```

#### Rendered HTML:

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <script src="andalina.js" defer></script>
    <meta charset="UTF-8">
    <title>My Awesome Website</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <!-- Site Header -->
    <header class="site-header">
        <nav>...</nav> <!-- Fetched from partials/nav.html -->
    </header>

    <!-- Main Content Injection Point -->
    <main class="container">
        <section class="hero">
            <h1>Welcome to my Website!</h1>
            <p>This is my page content.</p>
        </section>
    </main>

    <!-- Site Footer -->
    <footer class="site-footer">
        <div>...</div> <!-- Fetched from partials/footer.html -->
    </footer>
</body>
</html>
```

---

### `<an-code>`

Used to inject and safely escape source code inside documentation blocks—either by fetching an external file (`src="js/app.js"`) or by extracting a live element directly from the current page (`src="#element-id"`).

> [!WARNING]
> **Syntax Highlighting Warning**: If you are using a code highlighter like `highlight.js` or `Prism.js`, you must ensure it executes *after* your `<an-code>` blocks have finished fetching and injecting. For safe timing, see the [Third-Party JS Compatibility](#third-party-js-compatibility) section.

#### Attributes:

- `src` *(Required)*:
  - **File Path** (e.g. `src="js/app.js"`): Fetches the external source file (relative to `codesPath` if configured). External files are injected **as-is without formatting** by default to preserve language-specific indentation (Java, Python, XML, JS, etc.).
  - **In-Page Element Selector** (e.g. `src="#button-demo"`): Clones the matching element from the current page, strips its demo `id` attribute by default, and **auto-formats** the HTML indentation.
- `stage` *(Optional, default: `"after"`)*: Controls *when* an in-page element (`src="#id"`) is captured:
  - `stage="before"`: Captures the raw, unrendered Andalina markup (e.g., `<an-component>`, `<an-repeat>`, `{{ prop }}`) *before* Andalina processes it.
  - `stage="after"`: Captures the final rendered HTML *after* all Andalina components, loops, conditionals, and data bindings have resolved.
- `unwrap` *(Optional, default: `"false"`)*: When set to `"true"`, extracts only the inner content (`innerHTML`) of the target wrapper element instead of including the wrapper tag itself (`outerHTML`).
- `keep-id` *(Optional, default: `"false"`)*: By default, Andalina strips the `id` attribute from the cloned root element so demo selector IDs do not clutter your documentation snippets. Set `keep-id="true"` to preserve the `id` attribute.
- `format` *(Optional)*: Controls HTML auto-formatting (`"true"` or `"false"`). Defaults to `"true"` for in-page elements (`src="#id"`) and `"false"` for external files.

#### Example 1: Loading Code from an External File

**1. The Source Code (`js/app.js`)**

```javascript
function greet(name) {
    console.log("Hello, " + name + "!");
}
greet("World");
```

**2. The Calling Page (`index.html`)**

```html
<head>
    <script src="andalina.js" defer></script>
</head>
<body>
    <pre>
        <code class="language-javascript">
            <an-code src="js/app.js"></an-code>
        </code>
    </pre>
</body>
```

#### Example 2: Extracting Live In-Page Demo Code (Two-Tab Pattern)

You can point multiple `<an-code>` tags to the same demo container using `stage="before"` and `stage="after"` to showcase both the Andalina component call and the final compiled HTML output:

```html
<!-- 1. Live Demo Container -->
<div id="button-demo">
    <an-component name="primary-button" label="Save Changes"></an-component>
</div>

<!-- 2. Tab 1: Show Raw Andalina Code (Pre-Engine) -->
<pre><code class="language-html"><an-code src="#button-demo" stage="before" unwrap="true"></an-code></code></pre>

<!-- 3. Tab 2: Show Final Rendered HTML (Post-Engine) -->
<pre><code class="language-html"><an-code src="#button-demo" stage="after" unwrap="true"></an-code></code></pre>
```

---

### `<an-if>` / `<an-else>`

Evaluate conditional blocks based on JavaScript expressions evaluated against your `<an-data>` stores.

#### Attributes:

- `condition` *(Required on `an-if`)*: The JavaScript expression to evaluate. Must resolve to a truthy or falsy value.

#### Example:

```html
<an-if condition="store.isOpen && user.name !== ''">
   <p>Welcome to the store!</p>
</an-if>
<an-else>
   <p>Sorry, we are closed.</p>
</an-else>
```

---

## JS Expressions in Bindings

In Andalina, standard double-curly property bindings (`{{ }}`) fully support native JavaScript expressions, array methods, fallbacks, arithmetic, and ternary logic:

```html
<!-- Fallbacks -->
<p>Welcome, {{ user.name || 'Guest' }}!</p>

<!-- Math & Logic -->
<p>Total Price with Tax: {{ price * 1.2 }}</p>
<p>Discount: {{ price > 100 ? '20%' : '5%' }}</p>

<!-- String and Array Operations -->
<p>User Initial: {{ user.name.charAt(0).toUpperCase() }}</p>
<p>Items in cart: {{ cart.items.length }}</p>
```

---

## `<!-- an-comment: -->`

Andalina provides a specialized HTML comment syntax for internal development notes that are automatically stripped from the final HTML during rendering and AOT compilation:

#### Syntax:

```html
<!-- an-comment: Your note here -->
```

#### Example:

```html
<!-- an-comment: This is a note for developers that won't appear in the final HTML -->
<div>Visible Content</div>
```

---

## Configuration

### Global Configuration (`andalina.config.json`)

Define global engine behaviors in `andalina.config.json` placed at the root of your project:

| Property | Values / Type | Description |
| :--- | :--- | :--- |
| `showRenderedHtml` | `"enabled"` \| `"disabled"` | Prints the final rendered HTML into the Developer Tools Console. |
| `debug` | `"enabled"` \| `"disabled"` | Enables detailed timing and fetch trace logs in the browser console. |
| `debugUI` | `true` \| `false` | Toggles the floating visual component tree overlay when `debug` is enabled (defaults to `true`). |
| `preventFOUC` | `"enabled"` \| `"disabled"` | Prevents Flash of Unstyled Content by hiding the body until rendering completes. |
| `propStart` | `string` **(Mandatory)** | Starting delimiter for property bindings (e.g. `"{{"`). |
| `propEnd` | `string` **(Mandatory)** | Ending delimiter for property bindings (e.g. `"}}"`). |
| `prefix` | `string` | Custom tag prefix for Andalina tags (defaults to `"an"`). |
| `componentsPath` | `string` | Directory where reusable component files reside. |
| `layoutsPath` | `string` | Directory where layout files reside. |
| `templatesPath` | `string` | Directory where document template files reside. |
| `includesPath` | `string` | Directory where partial include snippets reside. |
| `codesPath` | `string` | Directory where source code files reside. |
| `extension` | `string` | Default extension used when resolving tags by `name` (e.g. `".html"`, `".xhtml"`). Must start with a dot. |

#### Example `andalina.config.json`:

```json
{
    "showRenderedHtml": "disabled",
    "debug": "enabled",
    "debugUI": true,
    "preventFOUC": "enabled",
    "propStart": "{{",
    "propEnd": "}}",
    "prefix": "an",
    "componentsPath": "/ui/components/",
    "layoutsPath": "/ui/layouts/",
    "templatesPath": "/ui/templates/",
    "includesPath": "/ui/includes",
    "extension": ".html"
}
```

### Page Scope Overrides

You can override global configuration settings directly on any individual page by adding data attributes to the `<script>` tag:

```html
<script src="andalina.js" 
    data-show-rendered-html="enabled" 
    data-extension=".xhtml" 
    defer>
</script>
```

---

## Developer Tools & Inspection

### Show Rendered HTML

Because Andalina runs client-side and dynamically constructs the DOM, viewing the raw source via your browser's **Right Click > View Page Source** will only show your original `<an-*>` tags, not the resolved HTML.

If you need to inspect or copy the fully rendered HTML output, set `showRenderedHtml: "enabled"` in `andalina.config.json` or use `data-show-rendered-html="enabled"` on your script tag. Andalina will log the complete rendered HTML directly to your Developer Tools Console!

### Debugging & DevTools Overlay

When working with complex nested templates and components, enable `debug: "enabled"`:

1. **Console Trace**: Andalina prints a structured performance trace to the console showing which files were fetched, network response times, parsing durations, and passed properties.
2. **Visual Component Tree**: A collapsible, interactive floating tree widget appears on your page, allowing you to inspect every nested template, layout, component, and their bound properties.

---

## Third-Party JS Compatibility

### The Issue

Because Andalina fetches and injects HTML partials asynchronously via the Fetch API, third-party libraries (sliders, UI components, date pickers, or CSS frameworks) that scan the DOM on `DOMContentLoaded` or immediate script execution may fail to find elements because Andalina has not finished rendering.

### The Solution (`andalina:ready`)

Andalina dispatches a custom `andalina:ready` event on the `document` as soon as all templates, components, and data bindings have finished rendering. Initialize your client-side libraries inside an event listener for `andalina:ready`:

### Safe Initialization Example:

```javascript
// Wait for Andalina to finish parsing and injecting the entire DOM
document.addEventListener('andalina:ready', function(e) {
    console.log(`Andalina finished rendering in ${e.detail.totalTime}ms`);
    
    // It is now safe to initialize React, Angular, Bootstrap, Swiper, etc.
    // Example: Bootstrap Tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(el => new bootstrap.Tooltip(el));

    // Example: Syntax Highlighters
    if (window.hljs) {
        hljs.highlightAll();
    }
});
```

---

## Andalina Builder (VS Code Extension & CLI)

The **Andalina Builder** is an AOT (Ahead of Time) transpiler available as a VS Code extension and a CLI tool (`andalina-builder`). It compiles your dynamic Andalina projects directly into static SSG files or native Enterprise backend framework views.

### Features

- **GUI Configuration**: Manage build targets visually in the VS Code sidebar without editing JSON by hand.
- **Multi-Target Transpilation**:
  - **Static HTML (Flat SSG)**: Flatten templates and components into production-ready static HTML.
  - **JavaServer Faces (JSF)** `[Experimental]`: Compiles into a Maven Web App structure with Composite Components and Facelets.
  - **Laravel Blade** `[Experimental]`: Transpiles components and slots to `@component`, `@slot`, and `@extends`.
  - **Django** `[Experimental]`: Converts layouts and components into `{% include %}`, `{% block %}`, and `{% extends %}`.
  - **Thymeleaf** `[Experimental]`: Translates tags into `th:replace`, `th:fragment`, and `th:each`.
- **Production Cleanup**: Automatically removes development scripts, Andalina config tags, `<an-data>`, and `<!-- an-comment -->` notes.
- **Asset Sync**: Copies images, CSS, and JS files to destination directories automatically.
- **Auto-Build on Save**: Optionally watch source HTML files and automatically rebuild on save.

### How to Use

1. Install the **Andalina Builder** extension from the VS Code Marketplace or Open VSX Registry.
2. Open the **Andalina Build** view in the VS Code Explorer sidebar.
3. Click the **`+`** icon to add a new build action.
4. Specify your **Source Folder** and **Target Folder**.
5. Select one or more **Target Platforms** (e.g., Static HTML, Blade, Django, etc.).
6. Click the **Play** button on your action to compile your project!
