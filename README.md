# ことば — הדרך ליפנית

A Hebrew-first Japanese learning space, built as a dependency-free static application for GitHub Pages. The initial curriculum supports conversation and guiding visitors in Israel, with a March 2027 goal.

## What works now

- Responsive RTL dashboard with correctly isolated LTR Japanese text.
- Ten learning points derived from opening diagnostic exercises, distinguished as grammar, retrieval/register, vocabulary, or context-dependent observations.
- Typed recall exercises, casual-past verb practice, and sentence assembly.
- Separate records for first-attempt production, hints, shown corrections, retries, and assembly. A single correct answer does not establish mastery.
- Due-date-based review queue and a seven-day activity chart based on actual attempts.
- Speaking timer and saved speaking/diagnostic drafts; free responses are reviewed in the conversation, not automatically graded.
- Local browser persistence, validated JSON backup import/export, and a session report to paste into the conversation.
- Optional Japanese example playback when a Japanese speech-synthesis voice is installed.

The complete 19-week syllabus and scheduled reminders are intentionally still pending the diagnostic results. The roadmap describes directions, not an approved syllabus or a JLPT/CEFR certification.

## Local development

Node.js 22 or newer is sufficient; there are no package dependencies.

```sh
npm start
npm test
npm run check
```

Open `http://127.0.0.1:4173/`. Use an HTTP server rather than opening `index.html` as a file: the app uses native JavaScript modules. Google Fonts is optional; system font fallbacks are provided.

For UI checks, append `?qa=1` before the hash route. That view uses a separate localStorage key, so automated test answers never enter the learner's normal progress.

## GitHub Pages

In **Settings → Pages**, select **Deploy from a branch → main → / (root)** and save. `index.html`, module imports, styles, and icons use relative URLs so the project works under `/Japanese_learning_platform/`. `.nojekyll` allows direct static publication without Jekyll.

Expected project URL after successful publication:

`https://cfir94.github.io/Japanese_learning_platform/`

## Data boundaries

The repository contains application code and educational seed content. The learner's full private notebook, raw personal answers, friends' names, and detailed itinerary are not committed. Browser attempts and drafts are saved under `kotoba-progress-v1` in localStorage, and are not sent to GitHub or an AI service.

To move between devices, use **נתונים וגיבוי** and export/import JSON. Import merges attempts by ID and preserves existing local drafts when both backups contain the same draft key. Deleting browser data removes local progress unless a backup has been kept.

To update the teaching record, use **העתקת דוח המפגש לצ׳אט** and paste the report into the learning conversation. The assistant can then reconcile it with the private notebook and change exercise content in this repository. The static site cannot automatically read the ChatGPT conversation, and the assistant cannot silently read browser-local progress.

### Tracking policy

`src/engine.mjs` owns progress calculations. The working stability criterion requires at least three independent first-attempt production successes, at least two dates and contexts, and a span of at least seven days since the first qualifying success. A later error reopens the point, keeping previous history. This is a configurable teaching convention, not a research-derived universal threshold.

Guided retries and sentence assembly are valuable practice but do not count as independent production. Diagnostics and speaking drafts are never automatically counted as evaluated successes.

## Source map

- `index.html`: application views and accessible UI landmarks.
- `assets/styles.css`: design system and mobile layouts.
- `src/data.mjs`: reviewed learning points, questions, and prompts.
- `src/engine.mjs`: evidence, scheduling, normalization, backup validation, and reports.
- `src/app.mjs`: browser interactions and persistence.
- `tests/engine.test.mjs`: behavioral checks for tracking and recovery.
- `AGENTS.md`: instructions for continuing this project.

Teaching research is documented in the separate learning notebook; primary resources include [Genki's publisher](https://genki3.japantimes.co.jp/en/intro/index.html), [JF Standard role-play assessment](https://www.jfstandard.jpf.go.jp/roleplay/ja/render.do), and [Irodori](https://www.irodori.jpf.go.jp/en/about.html).


## Complete session handoff
Use **הורדת דוח מפגש MD** after diagnostics or a practice round, or from the footer/data menu. One UTF-8 Markdown file contains every stored draft (with its prompt), every attempt including prior dates and assistance markers, and speaking-time records. Attach it to the conversation for feedback. This is a manual one-file handoff; the app does not synchronize answers automatically. JSON remains the lossless import/export backup.

The pinned-photo design is prepared locally. Personal photos are not included in this public version pending explicit approval to publish them. Original files and the full private learning notebook remain outside this repository.
