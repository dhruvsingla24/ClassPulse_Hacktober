# ClassPulse Academy

> Don't just attend school online. Enter it, explore it, and learn inside it.

Team **Versatile**, Hacktoberfest Hack Day (Devf8rge × Newton School of Technology).
Theme 02 · Open Source for Education · Idea 3: **open datasets and resources for classrooms**.

ClassPulse is a 3D school campus with a full classroom platform behind it: dashboards, a Doubt Lab with an annotatable whiteboard, a server-verified Learning Arcade, assignments, attendance, a mock exam hall with integrity logging, and an **Open Classroom Pack** that exports every resource as reusable JSON.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. The first start creates `data/db.json` with the demo school. Node 18.18+ is required.

### Demo accounts (password `demo1234` for all)

| Role | Email |
| --- | --- |
| Student | `aarav@classpulse.dev` (also `diya@`, `kabir@`, `meera@`, `rohan@`) |
| Teacher | `teacher@classpulse.dev` |
| Parent (linked to Aarav) | `parent@classpulse.dev` |
| Admin | `admin@classpulse.dev` |

The seed has 25 students in class 10A, 5 subjects, lectures, a question bank, 20 days of attendance, three tests per subject, assignments and submissions, pending and resolved doubts, FAQs, meetings and two months of practice history.

**Reset demo data:** as the teacher or admin, open Settings → Reset demo data. You can also stop the server and run `npm run seed`, which deletes the database so it is re-created on the next start.

## Judge flow

1. Open `/`: the 3D campus exterior. Press **Enter Campus**: the camera flies in along a spline, the glass doors slide open and you arrive in the corridor.
2. Click **Student Classroom** and use the "Student · Aarav" demo button.
3. You land in the 3D classroom. Click the glowing **challenge portal** and play **Binary Search Treasure Hunt**.
4. Finish to earn coins. The streak, coins, level and achievements update immediately.
5. Open the **Doubt Lab**, draw on the whiteboard and send a doubt. Matching FAQ answers are suggested as you type.
6. Sign in as the teacher. The new doubt is at the top of the Doubt Lab and on the dashboard to-do list.
7. Annotate on top of the student's drawing, save, reply, and mark it resolved.
8. Sign in as Aarav again: the reply and the red annotation are there, and the board can replay strokes.
9. As the teacher, publish an assignment; as the student, submit it; as the teacher, grade it. The grade feeds the student's marks and dashboards.
10. Mid-demo, open the **Comfort panel** (eye icon) and switch to Warm Reading, Dark or High Contrast.

## What's built

- **3D campus** (React Three Fiber): school building with lit sign, sliding glass doors, trees swaying in the wind, a fountain with particles, a waving flag, clouds, birds, walking students (instanced), dust in the light, and a sky whose sun follows your local time. Corridor with 7 doors, nameplates, hover glow, trophy cases, notice boards and the Arcade portal. Guided tour, WASD/arrow/scroll/touch movement, Skip and Replay intro, Low/Medium/High quality with automatic downgrade, rendering paused when the tab is hidden, loading screen with tips, and an illustrated 2D entrance when WebGL isn't available.
- **Role-based 3D rooms**: a student classroom and a Teacher's Lounge. Every object opens a real page, and coin-shop items appear on the student's desk.
- **Student portal**: dashboard with "What should I do next?" recommendations (each says why), daily challenge, missions, consistency heatmap, live class countdown, subject progress, library with reading mode and practice questions, assignments, Doubt Lab, exam hall, coin shop, profile and report card.
- **Teacher portal**: dashboard with a prioritised to-do list, an explained class health score, students needing attention with the rule behind every flag, engagement and subject charts, Arcade analytics, announcements. Also quick-mark attendance (tap or P/A/L keys), assignment grading with comment templates and resubmission, a students table with CSV export, printable reports and a parent summary, lecture authoring, meetings with Jitsi links and iCal export, and exam integrity timelines.
- **Doubt Lab**: subject and topic, text, code snippet, priority, drawing, duplicate detection, statuses, threaded replies, teacher annotation layer, stroke-by-stroke replay, PNG export, "this helped me", publish to FAQ, FAQ search and a doubt heatmap that can schedule a revision session.
- **Learning Arcade**: Binary Search Treasure Hunt, Sorting Race (bubble, selection, insertion, with drag-and-drop, hints and replay) and Linked List Builder, each with 3 levels. Every move is validated on the server. Also weekly leaderboard and achievements.
- **Open Classroom Pack** (the Theme 2 · Idea 3 core): export subjects, lectures, the question bank, FAQs, Arcade level definitions and an anonymised doubt dataset (topic-level counts only) as CC BY 4.0 JSON. Teachers can import packs; a sample `public/packs/optics-starter-pack.json` is included.
- **Comfort system**: Light (off-white), Dark (blue-grey), Warm Reading, High Contrast and Auto themes; text size 100–150%; line spacing; dyslexia-friendly font; Full/Reduced/Off motion (and the OS setting is respected); evening eye-care; 20-20-20 reminders; sound off by default; focus mode with a Pomodoro timer. Settings are saved to the user's account.
- **Platform**: Ctrl/Cmd+K command palette with permission-aware search, notifications, parent and admin views, audit log, "download my data", skip link, keyboard navigation and focus rings, status shown with icon and text (never colour alone), a colour-blind-safe chart palette, and an installable PWA with an offline cache.

## Architecture

```
src/app            Next.js App Router pages (/ campus, /login, /app/*) and API routes (/api/*)
src/components     UI kit, app shell, comfort panel, whiteboard, game kit, charts
src/components/three  3D campus (exterior, corridor, campus controller) and 3D rooms
src/lib            db (file store), auth, seed, game rules, arcade engine, learning logic
tests              Vitest: game rules and the coin ledger
```

- **Data**: a JSON file database (`data/db.json`) behind a small `tx()` helper that writes atomically. Every API route resolves the user from a signed, HTTP-only cookie and checks the role stored on the server. The door picked in 3D is cosmetic only.
- **Security**: scrypt password hashes, HMAC-signed session cookies, Zod validation on every write, a same-origin check against CSRF, rate limits on login, game moves, doubts and submissions, and security headers.
- **Coins**: every reward goes through `award()` with an idempotency key (`attempt:<id>`, `daily:<user>:<date>`, `submit:<assignment>:<user>`…), so a refresh or a replayed move never pays twice. Rewarded Arcade rounds are capped at 8 per game per day. Covered by `tests/ledger.test.ts`.
- **Learning intelligence**: rule-based and transparent (`src/lib/logic.ts`). Risk flags, the class health score and recommendations all show how they were calculated, and recommendations only link to lectures and games that exist.

## Scripts

```bash
npm run dev        # development server on :3000
npm run build      # production build
npm run start      # serve the production build
npm run typecheck  # TypeScript, strict mode
npm run lint       # ESLint
npm test           # Vitest
npm run seed       # delete the local database so it re-seeds on next start
```

## Environment variables (optional)

| Variable | Purpose |
| --- | --- |
| `CLASSPULSE_SECRET` | Session signing key. If unset, a random key is generated in `data/secret.key`. |
| `CLASSPULSE_DATA_DIR` | Where `db.json` lives. Defaults to `./data`. |

No external credentials are needed. Live classes use public Jitsi Meet rooms (`meet.jit.si`).

## Deploying to Vercel

The repo includes `vercel.json` (Next.js preset, `npm ci` install, Mumbai region `bom1`, cache headers for the service worker, fonts and API) and `.env.example`.

1. Push this folder to a GitHub repo, then in Vercel choose **Add New → Project** and import it. No settings need changing.
2. Optional: in **Settings → Environment Variables** add `CLASSPULSE_SECRET` with any long random string. Without it, each deployment generates its own key at build time, which works but signs everyone out after every redeploy.
3. Deploy.

On Vercel the database lives in `/tmp`, which is temporary. The demo school is re-seeded whenever Vercel starts a fresh server, and two servers running at once can each hold their own copy. That is fine for a demo; for real persistence, swap `src/lib/db.ts` for a hosted database.

## Honest limitations

This is a hackathon MVP. These parts of the original brief are **not** built:

- **Supabase is not used.** Data lives in a local JSON file, so access control is enforced in the API layer rather than with Postgres Row Level Security. It runs as a single server process and is not built for many concurrent writers.
- **Live updates use polling** (every 5–8 seconds on doubts and the exam log), not Supabase Realtime. There is no live cursor presence on the whiteboard.
- **No file uploads**: doubts take text, code and drawings, but not image or PDF attachments. Lectures take notes and links, not uploaded videos. There are no voice notes.
- **No AI features.** No AI provider is configured, so AI guidance is hidden and the app never generates answers. Guided help uses only stored teacher content.
- **Password reset email** is not wired. The demo explains that all demo passwords are `demo1234`.
- **Arcade**: Math Quest, Code Lab, Logic Puzzle Chamber, AI Explorer and Recursion Tower appear only as locked worlds. There are no flashcards or streak-freeze tokens yet.
- **Not built**: monthly teacher feedback forms, timetable builder, seating/group generator, CSV student import, mood check-in and multi-language (i18n) support. The `<html dir>` attribute is in place but there are no translations.
- **Testing**: Vitest unit tests cover game rules and the coin ledger. Playwright end-to-end tests, Lighthouse and an axe audit have not been run. The judge flow above was checked by hand in Chromium.
- **3D assets** are built from code (primitive geometry), not compressed glTF/KTX2 models.

## License

Code: MIT. Content packs exported by the app: CC BY 4.0.
