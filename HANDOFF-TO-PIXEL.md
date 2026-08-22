# 🚀 Andalina Handoff Document (Byte to Pixel)

**To:** Pixel
**From:** Byte
**Date:** August 22, 2026

Hey Pixel! The user and I have had an incredibly productive session today. We released **Andalina v1.5.0** and made some massive architectural decisions about the future of the framework. Here is everything you need to know to pick up right where we left off tomorrow.

---

## 1. What We Accomplished Today (v1.5.0)
- **Global Data Binding:** We implemented the ability to access data fetched via `<an-data>` globally without needing a loop (e.g., `{{ store.title }}`).
- **Array Indexing:** Property paths now natively support JS bracket notation (`{{ products[0].name }}`).
- **Docs & Examples:** We updated the `docs/documentation.html` with a dedicated example section and upgraded `example-04-complex-composition` to beautifully demonstrate global data flowing through master layouts.
- **Packages:** We published `andalina` (v1.5.0), `andalina-builder` (v1.1.0), and `vscode-extension` (v1.1.0).

---

## 2. The Great Architectural Alignment (CRITICAL)
The user made a brilliant observation today: **Andalina is strictly a Dev-to-Dev composition engine that outputs 100% static HTML via the Andalina Builder.** 

Because of this, we are **discarding** any ideas for Run-Time features (like `an-on:click` event binding or programmatic reactivity). Forcing developers to load a heavy JS engine in production defeats the purpose of the static builder. 

Instead, Andalina's true identity is a **Zero-Build Static Site Generator (SSG)** and the **Universal UI Handoff Engine**. All future features must be *Build-Time* features.

---

## 3. The Roadmap (What you are building next)

The user and I agreed on a phased roadmap. **Your immediate task tomorrow is to begin Phase 1.**

### 🟢 Phase 1: Advanced Templating (Target: v1.6.x)
Finish the core HTML composition engine by adding logic and expressions.
* **Feature:** `<an-if>` and `<an-else>` tags.
* **Feature:** JS Expressions & Fallbacks inside bindings (e.g., `{{ user.name || 'Guest' }}` or `{{ price * 1.2 }}`).
* **Pixel's Technical Note for `<an-if>`:** 
  You should implement `processConditionals(context)` in `core/andalina.js`. This sweep should run *after* `processProps` (so component attributes are injected) but *before* child components are fetched. Evaluate the condition using `new Function('data', 'with(data) { return !!(' + condition + '); }')(globalData)`. If false, `node.remove()`. If true, unwrap the `<an-if>` and remove the adjacent `<an-else>`.

### 🔵 Phase 2: The Universal Transpiler Architecture (Target: v2.0.0)
Refactor `andalina-builder` (the CLI) to support an **Adapter Architecture**.
* Instead of only flattening HTML, the Builder will act as a transpiler. 
* The CLI should accept a target flag: `andalina build --target <adapter>`.
* The Builder parses the Andalina tags into an internal map/AST and passes them to the selected adapter.

### 🟣 Phase 3: The Enterprise Target Plugins (Target: v2.1.x)
This is where Andalina becomes the ultimate "Frontend to Backend Handoff Tool". Build plugins for the builder that translate Andalina directly into backend template languages:
* `--target jsf`: Outputs `.xhtml` Facelets (e.g., `<ui:composition>`, `<ui:repeat>`).
* `--target blade`: Outputs `.blade.php` files for Laravel.
* `--target django`: Outputs `.html` files with Jinja2 `{% block %}` syntax.
* `--target thymeleaf`: Outputs `.html` files with `th:` attributes for Spring Boot.

---

Good luck, Pixel! The user is setting up something truly revolutionary here. Take good care of them!

\- Byte ⚡
