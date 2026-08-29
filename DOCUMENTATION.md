# Andalina Documentation

> *This document is auto-generated from the official website documentation.*

## What is andalina?

andalina is a zero-dependency, development-time composition tool designed to enforce the DRY (Don't Repeat Yourself) principle for HTML authoring. It is not a framework for serving web applications; it is a template parser for HTML/XHTML that runs directly in the browser.

### The Problem We Solve:

This addresses a classic Developer Experience (DX) problem: the handoff friction between Front-End (FE) and Back-End (BE) teams. Often, when the FE team delivers raw HTML, the BE team has to rewrite or "clean up" the HTML to ingest it or wrap it in their server-side logic (JSF, ASP, Laravel, PHP, Django, JSP, Thymeleaf, Blade, Jinja2, etc.). This leads to massive BE/FE misalignment during the development phase.

### The Vision:

Our vision is to solve this misalignment by providing a simple, unified, language-agnostic template language. By using andalina, the FE team delivers structured, modular components that perfectly map to server-side component boundaries. The BE team can now easily integrate these templates without rewriting the HTML. This vision is built upon four core pillars:

- Zero-Dependency: andalina runs entirely in the browser. No Node.js build pipelines, no Webpack, and no server-side rendering required.
- Simple & Easy to Learn: andalina uses only 5 core tags. It is incredibly easy to pick up, even for absolute beginners.
- Standard HTML/XHTML: There is no need to learn a new programming language or complex framework. It's just the HTML you already know!
- Single Source of Truth: Front-End developers can fix bugs in exactly one place. No more repeating code across 20 files—andalina handles the repetition for you.

## How to Use

### 1. Download Andalina

First, download the latest version of Andalina from the Download Page (or our GitHub Repository). The downloadable archive (.zip) includes:

- andalina.js: The core zero-dependency client-side template engine.
- andalina.config.json: Mandatory configuration file for defining paths and framework-safe data binding delimiters.

### 2. Add to Your HTML Document

Place andalina.js in your project directory and simply drop the script tag into the <head> of your HTML document. Ensure you include the defer attribute so Andalina executes after the DOM is ready:

```html
<head>
    <script src="andalina.js" defer> </script>
</head>
```

### 3. Run a Local Development Server

> **Important:** Important Note: Because andalina uses the Fetch API to load templates dynamically, modern browsers will block it due to CORS restrictions if you open the HTML/XHTML file directly (e.g., file://). You must run your project through a local development server (like VS Code's "Live Server" extension) for andalina to work!

## <an-include>

Used to inject static HTML partials directly into your page.

### Attributes:

- src (Optional): The exact path to the HTML/XHTML file you want to include.
- name (Optional): The name of the include fragment (resolves to [includesPath]/[name][extension]). Note: You must provide either src or name.

### Example:

1. The Partial (head-content.html)

```html
<an-attribute name="title" default-value="Welcome" />
<meta charset="UTF-8"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<!-- Favicon -->
<link rel="icon" data-type="image/x-icon" 
href="./assets/imgs/Favicon/Favicon.png"/>
<!-- css files -->
<link rel="stylesheet" href="./assets/style.css"/>
<!-- js -->
<script src="./js/x.js"/>
```

2. The Call (index.html)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <script src="andalina.js" defer> </script>
    <an-include src="head-content.html"></an-include>
</head>
<body>
    <p> Welcome </p>
</body>
</html>
```

### Rendered HTML:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <script src="andalina.js" defer> </script>
    <meta charset="UTF-8"/>
    <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <!-- Favicon -->
    <link rel="icon" data-type="image/x-icon" 
    href="./assets/imgs/Favicon/Favicon.png"/>
    <!-- css files -->
    <link rel="stylesheet" href="./assets/style.css"/>

    <!-- js -->
    <script src="./js/x.js"/>
</head>
<body>
    <p> Welcome </p>
</body>
</html>
```

## <an-data>

Used to fetch external JSON data and store it in memory for your templates to use.

### Attributes:

- src (Required): The URL or path to the JSON endpoint/file.
- name (Required): The variable name to store the fetched data in.

### Example:

```html
<!-- Fetch data from an external JSON file and store it in 'myList' -->
<an-data src="https://api.example.com/items.json" name="myList" />

```

### Example 2 (Global Data Binding & Arrays):

Any data fetched using <an-data> becomes globally available to the entire document. You can inject specific strings or nested objects directly into your HTML or component attributes anywhere on the page, without needing a loop!

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

### Rendered HTML (Example 2):

```html
<div class="store-info">
    <!-- Access object properties using dot notation -->
    <h1>Welcome to Tech Haven</h1>
    
    <!-- Access array indexes natively using bracket notation -->
    <p>Today's featured category: Laptops</p>
</div>

```

## <an-repeat>

Used to loop content dynamically. You can either repeat a specific number of times, or iterate over data fetched with <an-data>.

### Attributes:

- times (Optional): An integer specifying how many times to repeat the content block. (Used for simple numeric loops).
- data (Optional): The name of the data array fetched via <an-data> to iterate over.
- item (Optional, Default: "item"): The local variable name used to access the current object in the data array.
- index-as (Optional, Default: "$index"): The variable name used to access the current loop iteration index.

### Example 1 (Simple numeric loop):

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <script src="andalina.js" defer> </script>
</head>
<body>
    <an-repeat times="3" index-as="i">
        <p>Item number {{i}}</p>
    </an-repeat>
</body>
</html>
```

### Rendered HTML (Example 1):

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <script src="andalina.js" defer> </script>
</head>
<body>
    <p>Item number 0</p>
    <p>Item number 1</p>
    <p>Item number 2</p>
</body>
</html>
```

### Example 2 (Looping over fetched data):

```html
<!-- Assuming data.json contains an array of objects like { "id": 1, "name": "Product A" } -->
<an-data src="data.json" name="products" />

<an-repeat data="products" item="product">
    <div class="product-card">
        <h3>{{ product.name }}</h3>
        <p>Product ID: {{ product.id }}</p>
    </div>
</an-repeat>

```

### Rendered HTML (Example 2):

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

## <an-component>

Used to import reusable components and pass dynamic properties via attributes. Variables inside the component are defined using <an-attribute>.

### Attributes:

- src (Optional): The exact path to the component HTML/XHTML file.
- name (Optional): The name of the component (resolves to [componentsPath]/[name][extension]). Note: You must provide either src or name.
- Dynamic Attributes: Any other attribute you add will be passed to the component as a property.

Inside the component file, define your component using Andalina's Structured Syntax: wrap the file in an <an-component-def> container, specify metadata in an <an-attributes> block, and place your markup inside an <an-body> block.

Inside <an-attributes>, use <an-attribute> to define the props. It accepts:

- name (Required): The name of the property.
- default-value (Optional): A fallback value if the prop is not passed.
- mandatory (Optional): Set to "true" to log a warning if the prop is missing.

### Example:

1. The Component (user-card.html)

```html
<an-component-def>
    <an-attributes>
        <!-- define components attributes that will be passed from the caller -->
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

2. The Call (index.html)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <script src="andalina.js" defer> </script>
</head>
<body>

    <!-- call a component using src attribute -->
    <an-component src="user-card.html" username="Alice" role="Admin"/>

    <!-- call a component using name attribute -->
    <an-component name="user-card" username="Bob"/>
</body>
</html>
```

### Rendered HTML:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <script src="andalina.js" defer> </script>
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

## <an-layout>

A structural wrapper that can be nested inside an <an-template> or within another layout. It provides a reusable shell (like a sidebar grid or a card container) and uses <an-place> slots to accept content from children.

Like components, layouts use Andalina's Structured Syntax: wrap the file in an <an-layout-def> container, specify optional metadata in an <an-attributes> block, and place your structural markup inside an <an-body> block.

### Attributes:

- src (Optional): The exact path to the layout HTML/XHTML file.
- name (Optional): The name of the layout (resolves to [layoutsPath]/[name][extension]). Note: You must provide either src or name.

### Example:

1. The Grid Layout (dashboard-layout.html)

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

2. The Calling Page (admin.html)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <script src="andalina.js" defer> </script>
</head>
<body>
    <an-layout src="dashboard-layout.html">
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

### Rendered HTML:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <script src="andalina.js" defer> </script>
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

## <an-template>

The root tag used in your final page to wrap your content inside a complete HTML/XHTML document template. Unlike an <an-layout> (which acts as a structural partial), a template provides the full, standard structure of a webpage, including the <html>, <head>, and <body> tags.

### Attributes:

- src (Optional): The exact path to the template page HTML/XHTML file.
- name (Optional): The name of the template page (resolves to [templatesPath]/[name][extension]). Note: You must provide either src or name.

### Example:

1. The Root Template (master.html)

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

2. The Calling Page (index.html)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <script src="andalina.js" defer> </script>
</head>
<body>
    <an-template name="master" lang="fr">
        <an-inject name="content">
            <section class="hero">
                <h1>Welcome to my Website!</h1>
                <p>This is my the page content.</p>
            </section>
        </an-inject>
    </an-template>
</body>
</html>
```

### Rendered HTML:

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <script src="andalina.js" defer> </script>
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
            <p>This is my the page content.</p>
        </section>
    </main>

    <!-- Site Footer -->
    <footer class="site-footer">
        <div>...</div> <!-- Fetched from partials/footer.html -->
    </footer>
</body>
</html>

```

## <an-code>

Used to inject unparsed source code directly from a file, perfectly formatted and safely escaped for documentation blocks.

> **Important:** Syntax Highlighting Warning: If you are using a code highlighter like highlight.js or Prism.js, you must ensure it only runs after your <an-code> blocks have been fully fetched and injected. For a detailed explanation of this async race condition and how to fix it, please see the Third-Party JS Compatibility section.

### Attributes:

- src (Required): The exact path to the source code file. If codesPath is configured, it resolves relative to that directory.

### Example:

1. The Source Code (js/app.js)

```html
function greet(name) {
    console.log("Hello, " + name + "!");
}
greet("World");

```

2. The Call (index.html)

```html
<head>
    <script src="andalina.js" defer> </script>
</head>
<body>
    <pre>
        <code class="language-javascript">
            <an-code src="js/app.js"></an-code>
        </code>
    </pre>
</body>

```

## <an-if> / <an-else>

Evaluate a conditional block. You can use native JavaScript expressions inside the condition against your <an-data> sources.

### Attributes:

- condition (Required on an-if): The JavaScript expression to evaluate. Must resolve to a truthy or falsy value.

### Example:

```html
<an-if condition="store.isOpen && user.name !== ''">
   <p>Welcome to the store!</p>
</an-if>
<an-else>
   <p>Sorry, we are closed.</p>
</an-else>
```

In Andalina v1.6.0+, standard double-curly bindings fully support native JavaScript expressions, array methods, and fallbacks.

```html
<!-- Fallbacks -->
<p>Welcome, {{ user.name || 'Guest' }}!</p>

<!-- Math & Logic -->
<p>Total Price with Tax: {{ price * 1.2 }}</p>
<p>Discount: {{ price > 100 ? '20%' : '5%' }}</p>
```

## <!-- an-comment: -->

Andalina provides a specialized HTML comment syntax for development notes that are automatically stripped out when you compile your project using the Andalina Builder.

### Syntax:

<!-- an-comment: Your note here -->

### Example:

```html
<!-- an-comment: This is a note for developers that won't appear in the final HTML -->
<div>Visible Content</div>
```

## Configuration

Define the global behavior in andalina.config.json:

### Properties:

- showRenderedHtml: {enabled, disabled}. Enables or disables the output of the final rendered HTML into the Developer Tools Console.
- debug: {enabled, disabled}. Enables or disables the output of detailed debugging information during the rendering process.
- debugUI: {true, false}. When debug is enabled, this toggles the floating visual component tree overlay. Defaults to true.
- preventFOUC: {enabled, disabled}. Prevents Flash of Unstyled Content by hiding the page body until rendering completes.
- propStart: (Mandatory) The starting string for properties (e.g. {{).
- propEnd: (Mandatory) The ending string for properties (e.g. }}).
- prefix: A custom prefix for Andalina tags. Defaults to an. It can be any string (e.g., an, andalina, aa).
- componentsPath: The directory path where your component files are stored.
- layoutsPath: The directory path where your layout files are stored.
- templatesPath: The directory path where your templates files are stored.
- includesPath: The directory path where your HTML fragment and include files are stored.
- codesPath: The directory path where your source code snippet files are stored.
- extension: The default file extension to be used for components, layouts, pages, and includes when referring to them by name only. It can be any string, but it must start with a dot (e.g., .html, .xhtml).

### Example:

```html
{
    "showRenderedHtml": "disabled",
    "debug": "enabled",
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

Page Scope Configuration: You can override the global configuration directly on a specific page by adding data attributes to the andalina script tag.

```html
<script src="andalina.js" 
	data-show-rendered-html="enabled" 
	data-extension=".xhtml" 
	defer>
</script>

```

## Show Rendered HTML

Since andalina runs client-side and dynamically manipulates the DOM, viewing the page source in your browser (Right Click > View Page Source) will only show your <an-> tags, not the final rendered HTML.

If you need to inspect or copy the completely rendered HTML, you can enable the showRenderedHtml configuration globally in andalina.config.json, or on a single page using data-show-rendered-html="enabled":

When enabled, andalina will print the Final Rendered HTML directly into your Developer Tools Console! You can easily inspect it or copy-paste it.

## Debugging

When working with complex nested templates, it's easy to lose track of what andalina is fetching. To help with this, you can enable debug mode.

### Enable Debug Mode:

You can turn on debug mode globally in your andalina.config.json, or on a single page using the script attribute: data-debug="enabled".

When enabled, andalina will print a beautiful, structured trace directly to your browser's Developer Tools Console, showing exactly which files were fetched, how long the network request took, and the properties passed to each component.

## Third-Party JS Compatibility

Because andalina dynamically fetches and injects HTML into the DOM asynchronously, it can cause race conditions with third-party JavaScript libraries (such as sliders, lightboxes, or UI frameworks) that attempt to scan the DOM immediately on page load.

> **Important:** The Issue: If a third-party library runs before andalina has finished injecting your components, the library won't find the elements and will fail to initialize.

### The Solution:

You must initialize your third-party libraries after you are sure the asynchronous fetching has completed. A reliable way to handle this is by awaiting the component injections or using a Promise.all approach if you are manually fetching content.

### Example: Safe Initialization

```html
// Wait for Andalina to finish parsing and injecting the entire DOM
document.addEventListener('andalina:ready', function(e) {
    console.log(`Andalina finished in ${e.detail.totalTime}ms`);
    
    // It is now safe to initialize React, Angular, Bootstrap, or other libraries
    // that need to bind to the final DOM structure.
    
    // Example: React
    // const root = ReactDOM.createRoot(document.getElementById('root'));
    // root.render(<App />);
    
    // Example: Bootstrap tooltips
    // const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    // const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
});

```

## Andalina Builder

The Andalina Builder is a powerful VS Code Extension that performs AOT (Ahead of Time) Transpilation. It seamlessly converts your raw Andalina project directly into static SSG files or native Enterprise framework views.

### Features:

- GUI Configuration: Manage your build targets natively in VS Code without editing JSON files manually.
- Multi-Target Transpilation: With a single click, convert your Andalina UI into: Static HTML (Flat SSG) JavaServer Faces (JSF) [Experimental] (Outputs a Maven Web App structure with Composite Components and Facelets Templating) Laravel Blade [Experimental] (Uses @component, @slot, @extends) Django [Experimental] (Uses {% include %}, {% block %}, {% extends %}) Thymeleaf [Experimental] (Uses th:replace, th:fragment, th:each)
- Static HTML (Flat SSG)
- JavaServer Faces (JSF) [Experimental] (Outputs a Maven Web App structure with Composite Components and Facelets Templating)
- Laravel Blade [Experimental] (Uses @component, @slot, @extends)
- Django [Experimental] (Uses {% include %}, {% block %}, {% extends %})
- Thymeleaf [Experimental] (Uses th:replace, th:fragment, th:each)
- Advanced Architecture Support: Resolves <an-component>, <an-layout>, <an-template>, and <an-inject> tags directly into native server-side equivalents.
- Production Cleanup: Safely strips Andalina-specific scripts, styles, <an-data>, and <!-- an-comment --> tags from your final production artifacts.
- Asset Copying: Automatically copies your images, CSS, and JS files to the target directory.
- Auto Build on Save: Optionally watch your source files and automatically rebuild when changes are detected.

### How to Use:

1. Install the Andalina Builder extension in VS Code. 2. Look for the Andalina Build view in your VS Code Explorer sidebar. 3. Click the + icon to add a new Action. 4. Specify your Source Folder and Target Folder. 5. Check off one or more Target Platforms (e.g. Static HTML, JSF, Blade, etc.). 6. Click the play button on your Action in the sidebar to build your artifacts!

