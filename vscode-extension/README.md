# Andalina Builder

The official VS Code extension for [Andalina](https://github.com/Moataz-Aldawood/andalina) — a zero-dependency, development-time HTML composition engine.

## Features

- **GUI Configuration**: Manage your build targets natively in VS Code without editing JSON files manually.
- **Static Compilation**: Resolves all `<an-component>`, `<an-include>`, and other tags into standard, perfectly formatted static HTML files.
- **Asset Copying**: Automatically copies your images, CSS, and JS files directly to the output directory.
- **Auto Build on Save**: Watch your source files and automatically rebuild when any changes are detected.
- **Developer Comments**: Seamlessly strips out `<!-- an-comment: note -->` development notes from your production build.

## Getting Started

1. Look for the **Andalina Build** view in your VS Code Explorer sidebar (the lightning bolt icon).
2. Click the **+** icon to add a new Action.
3. Specify your **Source Folder** and **Target Folder**.
4. Click the play button on your Action in the sidebar to build your static site!

## Requirements

No external dependencies are required. Just a standard Andalina project!

## License

This extension is licensed under the **GNU LGPL-3.0**. See the [LICENSE](LICENSE) file for more details.
