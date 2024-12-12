# Text Annotation Tool

A Vue 3 application that allows users to annotate text with entities and comments. Built with ProseMirror for rich text editing capabilities.

## Features

- **Text Annotation**: Select text and link it to predefined entities
- **Custom Comments**: Add comments to your annotations
- **Entity Management**: Link annotations to predefined entities
- **Annotation Management**: Edit and delete annotations with visual feedback

## Technology Stack

- Vue 3 with TypeScript
- ProseMirror for text editing
- Bootstrap for UI components
- Vite for build tooling

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- pnpm package manager

### Installation

```sh
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm vite build
```

### Build Output and Usage

When you run `pnpm vite build`, the application will be built into the `dist/` directory with the following structure:

```
dist/
├── text-annotation.iife.js     # Main bundled JavaScript file
└── style.css                   # Compiled CSS
```

To use the built component in your project:

1. Copy the files from the `dist/` directory to your project
2. Include the files in your HTML & use the component in your application:

```html
<link href="path/to/style.css" rel="stylesheet" />
<script src="path/to/text-annotation.iife.js"></script>
<div id="app"></div>
<script>
  const app = TextAnnotationEditor.createTextAnnotationApp({
    linkedEntities: yourlinkedEntitiesArray || [],
    sourceText: yourSourceText || '',
  })
</script>
```

The build configuration (in `vite.config.ts`) is set up to:

- Bundle the application as an IIFE (Immediately Invoked Function Expression)
- Externalize Bootstrap to reduce bundle size
- Generate a single JavaScript file and CSS file
- Make the component globally available as `TextAnnotationEditor`

## License

MIT License

Copyright (c) 2024 Olivia Reichl

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
