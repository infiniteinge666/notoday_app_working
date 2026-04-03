# NoToday — Public Test Build (Single Service)

NoToday is a calm, explainable scam-risk checker.

This repository contains:
- A small public UI (static files)
- A Node/Express backend API
- A versioned scam intelligence store (`scamIntel.json`)

## Endpoints

- `GET /intel`
  - Returns intel version and counts

- `POST /check`
  - Accepts `{ "raw": "..." }`
  - Returns explainable risk output: `{ band, score, reasons, whatNotToDo, intelVersion }`

## Folder layoutbackend/
server.js
routes.js
package.json
core/
intel/
http/handlers/
data/
scamIntel.json
public/
index.html
app.js
styles/
styles.css
assets/
notoday-shield.png
<!-- CI deploy test -->
