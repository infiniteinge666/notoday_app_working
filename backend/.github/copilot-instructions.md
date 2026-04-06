---
name: notoday-backend workspace instructions
description: |
  Project-specific AI assistant instructions for the Notoday backend services.
  Use this file to inform the Copilot Code Assistant about repository conventions,
  architecture shape, typical tasks, and command entrypoints.

# Scope
- Backend only: Node.js Express service in `server.js` with route config in `routes.js`.
- Core detection pipeline under `core/` (analyze, score, match, normalize, ocr, etc.).
- Intelligence sources under `intel/` and `data/scamIntel.json`.
- Public SPA assets are in `public/`, `styles/`, `uploads/`.

# Project boundaries
- no external build system; plain Node/CommonJS.
- scripts: `npm start` and `npm run dev` run `node server.js`.
- dependencies: Express, Tailwind/Vite, Tesseract, Sharp.
- no tests are currently configured (good candidate: add Jest/Mocha).

# Advice for code changes
- Keep API behavior stable; existing routes are lightweight and rely on `core/` components.
- For new features, prefer adding separate handler modules in `http/handlers` and wiring in `routes.js`.
- Avoid non-deterministic side effects in `core/` pipeline; data-driven decisioning is key.

# Helpful shortcuts
- `server.js` is entrypoint; check middleware and static path declarations.
- `core/scanLogger.js` is likely for event tracking; preserve semantics if extending.

# When to use
- Use for all prompts related to local development, debugging, and incremental enhancement.
- Use `applyTo` with `**/*.js` unless the issue is on static content (`public/**`).
