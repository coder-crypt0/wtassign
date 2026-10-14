# Classcraft

An interactive React UML class diagram editor with Java source generation.

## Run

Requires Node.js 20 or later.

```sh
npm install
npm run dev
```

Open the URL Vite prints. Build a deployable static site with `npm run build`; serve `dist/` with any static web server. Run generator tests with `npm test`.

## Features

- Drag, create, select and delete UML classes, abstract classes and interfaces
- Add and delete attributes and method signatures
- Association, aggregation, composition, inheritance and implementation relationships
- Live Java preview and individual source downloads
- Export complete Java package as ZIP; export/import diagrams as JSON
- Undo/redo, zoom, browser-local automatic saving
- Responsive workspace with a seeded library architecture

Method bodies are stubs to be implemented by the developer. Associations are emitted as single reference fields; diagram multiplicities are illustrative. Existing abstract/interface contracts may require implementing methods in Java subclasses. Attribute types and method parameters accept Java syntax. Diagrams remain in the current browser until exported.

Built with React, Vite, Lucide and JSZip. No backend or account is required.
