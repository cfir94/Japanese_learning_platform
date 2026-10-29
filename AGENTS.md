# Continuing the Japanese learning platform

## Purpose and learner constraints

- Target: more natural Japanese conversation and short guided explanations in Israel by March 2027.
- Budget: approximately 60 minutes a day, including 15–20 minutes of speaking, plus an existing weekly 90-minute online conversation. Do not double-count that meeting in a weekly schedule without clarification.
- Genki I, third edition, page 210 was self-reported. Do not invent the page's chapter or declare an assessed level from the book position.
- Two written opening tasks have been completed in the conversation. Remaining assessment includes production/grammar, reading, real audio listening, and interactive speaking. The complete syllabus is pending those results.
- Prefer small interactive exercises, meaningful feedback, and questions in Hebrew with responses in Japanese.

## Teaching and evidence

- Keep stable `JP-xxx` IDs. Preserve wrong attempts and distinguish assisted learning from independent production.
- A displayed correction, copied answer, recognition task, or assembled sentence must not count as independent production.
- Casual omission of particles is not automatically an error. Do not label correct polite forms incorrect merely because casual forms are being practised.
- Accept valid alternatives. For open-ended free responses, use human/conversation review rather than exact-string grading.
- Do not evaluate pronunciation, speed, or pauses from typed text or automatic transcription alone.
- Do not close a learning point after one success. Keep the engine's documented delayed/context-varied criterion unless a revised policy is agreed.
- Do not publish the private notebook, raw personal answers, contact details, or friends' itinerary. Educational examples can stay generic.

## Architecture and validation

- Buildless HTML/CSS/native ES modules on GitHub Pages. Keep all paths relative to support project subpaths.
- Keep interactive records local. No credentials, GitHub tokens, or paid AI keys in browser code.
- Explain export/import and report sharing in ordinary user language. Never imply cloud sync or automatic AI assessment exists.
- Run `npm test` and `npm run check` after logic changes. Validate representative interactions and a narrow viewport in the supported browser when available.
- `.nojekyll` and `index.html` remain in the root publishing directory. Preserve unrelated changes and use a guarded branch update when writing through the GitHub API.
- When changing browser assets, advance the coordinated version query in `index.html` and the imports in `src/app.mjs`, so a fresh HTML load does not reuse older cached modules.

## Progress handoff

The canonical full teaching notebook currently stays outside this public repository. Read its current version in the conversation before updating its records. Browser-generated session reports are the explicit bridge for reconciling local attempts with that notebook. Do not claim to have read unsent local browser activity.
