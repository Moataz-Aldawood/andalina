# Andalina Issue Tracker

## Issue 1: Template Reconstruction & HTML5 Custom Element Parsing Issues

- **Description**: Fix `<an-attribute>` swallowing sibling DOM nodes during HTML5 parsing, eliminate `document.write` in favor of pure DOM reconstruction during `<an-template>` processing, and add FOUC error boundary and safety timeout.
- **Status**: resolved
- **UAT**: [todo]

## Issue 2: In-Page Code Extraction (`<an-code src="#id">`) & Two-Stage Lifecycle (`stage="before | after"`)

- **Description**: Extend `<an-code>` to support extracting and auto-formatting live in-page DOM elements via `src="#element-id"`, with support for `stage="before"` (pre-Andalina syntax) and `stage="after"` (rendered HTML output), `format="true | false"`, `keep-id="true | false"`, and `unwrap="true | false"`.
- **Status**: resolved
- **UAT**: [todo]

