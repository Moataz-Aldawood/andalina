# Andalina Builder

The official VS Code extension for [Andalina](https://moataz-aldawood.github.io/andalina/) — a zero-dependency, development-time HTML composition engine.

## Features

- **GUI Configuration**: Manage your build targets natively in VS Code without editing JSON files manually.
- **Multi-Target Transpilation**: Not just for flat HTML! The builder now features **AOT Transpiler Adapters** for Enterprise frameworks. With a single click, convert your raw Andalina project into:
  - **Static HTML** (Flat SSG)
  - **JavaServer Faces (JSF)** `[Experimental]` (Outputs a Maven Web App structure with Composite Components and Facelets Templating)
  - **Laravel Blade** `[Experimental]` (Uses `@component`, `@slot`, `@extends`)
  - **Django** `[Experimental]` (Uses `{% include %}`, `{% block %}`, `{% extends %}`)
  - **Thymeleaf** `[Experimental]` (Uses `th:replace`, `th:fragment`, `th:each`)
- **Advanced Architecture Support**: Resolves `<an-component>`, `<an-layout>`, `<an-template>`, and `<an-inject>` tags directly into native server-side equivalents.
- **Production Cleanup**: Safely strips Andalina-specific `<script>`, styles, `<an-data>`, and `<!-- an-comment -->` tags from your final production artifacts.
- **Asset Copying**: Automatically copies your images, CSS, and JS files directly to the target directory.
- **Auto Build on Save**: Watch your source files and automatically rebuild when any changes are detected.

## Getting Started

1. Look for the **Andalina Build** view in your VS Code Explorer sidebar.
2. Click the **+** icon to add a new Action.
3. Specify your **Source Folder** and **Target Folder**.
4. Check off one or more **Target Platforms** (e.g. Static HTML, JSF, Blade, etc.).
5. Click the play button on your Action in the sidebar to build your artifacts!

## Requirements

No external dependencies are required. Just a standard Andalina project!

## License

This extension is licensed under the **GNU LGPL-3.0**. See the [LICENSE](LICENSE) file for more details.
