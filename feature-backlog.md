# Andalina Feature Backlog

## ~~1. FOUC (Flash of Unstyled Content) Prevention~~ [COMPLETED]
**Problem:** The browser may render raw `<an-*>` tags for a split second before Andalina finishes parsing.
**Solution:** Inject a CSS rule (`body { opacity: 0; }`) on load, and fade the page in once parsing is 100% complete.

## ~~2. Component Props (Variable Passing)~~ [COMPLETED]
**Problem:** Currently, data can only be passed via HTML blocks in `<an-define>`.
**Solution:** Allow simple string variables on the include tags (e.g., `<an-include src="button.html" data-text="Submit">`) and replace placeholders like `{{ text }}` inside the included file.

## ~~3. Debug Render Tree Logging~~ [COMPLETED]
**Problem:** If a file is missing or a slot is misnamed, it fails silently or falls back to default content.
**Solution:** Add a `data-debug="true"` option to the script tag. When enabled, print a beautiful, nested component tree in the browser console showing exactly which files loaded, how long they took, and which slots successfully matched.

## ~~4. Andalina Builder (AOT Static Compiler / Production CLI)~~ [COMPLETED]
**Problem:** Andalina is a dev-time client-side tool. When developers want to export a static site for production (e.g., for GitHub Pages, CDN deployment, or maximum SEO performance), they need an automated build step.
**Solution:** Develop **Andalina Builder** (`npx andalina build` / `andalina-builder`), an AOT compiler tool that converts Andalina pages into fully composed, optimized normal static HTML files in a `/dist` directory.

## ~~5. View/Export Composed Source~~ [COMPLETED]
**Problem:** "View Page Source" in the browser only shows the original unparsed tags, which can make it hard for developers to get the final composed HTML string.
**Solution:** Add an option to easily view or copy the final, fully-composed HTML string (e.g., by logging it to the console, or injecting a tiny "Copy HTML" dev-button into the page).

## 6. Andalina Slicer (HTML to Component Decompiler / Migration Tool)
**Problem:** Developers migrating existing static HTML/XHTML websites or templates to Andalina currently have to manually extract components, create layout shells, and define `<an-attributes>` / `<an-body>` blocks.
**Solution:** Develop **Andalina Slicer** (`npx andalina slice` / `andalina-slicer`), an intelligent decompiler and migration tool that converts normal static HTML pages into structured Andalina pages (`<an-component-def>`, `<an-layout-def>`, `<an-template>`, `<an-attributes>`, and `<an-body>`).


## ~~7. Native Data-Binding (`<an-data>`)~~ [COMPLETED]
**Problem:** Currently, Andalina handles structural HTML composition but does not support fetching external JSON data or iterating over dynamic data from an API out-of-the-box.
**Solution:** Introduce an `<an-data>` tag (or similar mechanism) that fetches JSON data from a URL and exposes it to `<an-repeat>` or variables, enabling developers to render API results directly in Andalina without needing a 3rd party library.
