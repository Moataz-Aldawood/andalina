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

## 4. Production CLI Compiler
**Problem:** Andalina is a dev-time client-side tool. If the FE team wants to export a static site (e.g., for GitHub Pages), they have no build step.
**Solution:** Create a tiny Node.js script (`npx andalina build`) that traverses the HTML files, runs the parser logic, and outputs fully composed, static HTML files into a `/dist` folder.

## ~~5. View/Export Composed Source~~ [COMPLETED]
**Problem:** "View Page Source" in the browser only shows the original unparsed tags, which can make it hard for developers to get the final composed HTML string.
**Solution:** Add an option to easily view or copy the final, fully-composed HTML string (e.g., by logging it to the console, or injecting a tiny "Copy HTML" dev-button into the page).

