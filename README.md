# Under samme tag

Prototype for Group 7, Theme 4: The Incubator (SDU).

A website that matches students who need cheaper housing with older people who
live alone and have a spare room. The student pays lower rent and gives company
and some practical help in return.

This is a prototype for user tests. All profiles are made up, there is no
backend and no real login, and nothing leaves the browser. The interface is in
Danish by default, with a full English version.

"Under samme tag" is a working name. Change it in `src/i18n/da.ts` and
`src/i18n/en.ts` (`layout.brand`) and in `index.html`.

## Run it

You need Node.js 22.12 or newer.

```
npm install
npm run dev
```

Then open the address the terminal shows (normally http://localhost:5173).

| Command | What it does |
|---|---|
| `npm test` | Unit tests: matching, test log, student check, trial period, weekly plan |
| `npm run build` | Type-checks and builds the site into `dist/` |
| `npm run preview` | Serves the built site locally |
| `npm run test:e2e` | Builds the site and runs the browser tests (see below). First time only: `npx playwright install chromium` |

## The flow

1. **Front page and role.** The tester chooses student or host. Then they make
   their own profile, or pick "Prøv som ..." to use a made-up one.
2. **Profile in steps.** One topic per screen: Om dig, Bolig (or Værelset),
   Hjælp og samvær, Husregler, Samtykke. Each step is checked before "Næste".
   The text and the step are saved as a draft, so a reload returns to the same place.
3. **Suggestions** with the reasons for each match ("Derfor passer I sammen") and
   the things to talk about. They can be filtered by area, rent and company, and
   sorted. The tester says yes or no.
4. **First meeting.** After a yes from both, one side suggests a time and place,
   and the other says yes. The page links to the advice page.
5. **Private decision after the meeting.** Each side is asked "Vil du gå videre
   med [name]?". The other's answer stays hidden until both have answered. If one
   says no, the other sees a kind, neutral message and the connection ends.
6. **Agreement**, only after two yeses. Rent, hours, tasks, a weekly plan (which
   days, what, how long), house rules, trial period, notice, and a plain "Hvis I
   vil stoppe" line. Both must say yes. It prints on one page with both names,
   the date and lines for signatures.
7. **Trial period.** Weeks left, and a private "Hvordan går det?" each week
   (Godt, Nogenlunde, Ikke godt).

At any time after a mutual match, the pair can write short messages to each other.

## Pages

| Page | Address | File |
|---|---|---|
| Front page and choice of role | `/` and `/start/:role` | `src/pages/Start.tsx` |
| Create profile in steps (also helper mode) | `/opret/:role` | `src/components/ProfileForm.tsx` |
| Suggestions with reasons, filters, yes and no | `/forslag` | `src/pages/Suggestions.tsx` |
| First meeting and the decision after it | `/forloeb/:id/moede` | `src/pages/Meeting.tsx` |
| Agreement with weekly plan | `/forloeb/:id/aftale` | `src/pages/Agreement.tsx` |
| Trial period and check-in | `/forloeb/:id/proeve` | `src/pages/Trial.tsx` |
| Messages | `/forloeb/:id/beskeder` | `src/pages/Messages.tsx` |
| Block and report | `/bloker/:id` | `src/pages/Block.tsx` |
| Tryghed og gode råd | `/tryghed` | `src/pages/Safety.tsx` |
| View, edit and delete own profile, blocked people | `/profil` | `src/pages/MyProfile.tsx` |
| Test leader page | `/test` | `src/pages/TestLeader.tsx` |

## Trust and safety

- **Verified student.** A student can type a study email (optional). If the
  domain belongs to a Danish place of study, the profile gets the label
  "Verificeret studerende". Others show "Ikke verificeret". Four demo students
  are verified, two are not.
- **Block and report.** From a suggestion, a meeting, an agreement or the trial
  page. The reason is a fixed choice. The two people disappear for each other
  in both directions, and any connection between them stops. Blocks can be
  undone under "Min profil".
- **Advice page** with practical advice for the first meeting, living together,
  and what to do if something goes wrong. It names no people or organisations.
  The only number is 112, the Danish emergency number.
- **Helper mode.** On the host side, "Jeg hjælper en ældre med at lave en
  profil" starts the form with a note for the helper. The profile says who
  helped (for example "sit barnebarn"), never their name. Demo host Grethe has a helper.

## What is simulated

| What | How it works in the prototype |
|---|---|
| The other person | Answers by themselves after about two seconds: yes to the match, yes to the meeting, a ready-made reply to messages, and yes to the agreement. After the meeting the answer is yes, or no if the test leader chooses so on `/test`. Untick "Den anden part svarer automatisk" in the footer to play both sides by hand with "Skift profil". |
| Student verification | Only checks the email domain against a list in `src/labels.ts`. No email is sent, and the address is never stored, only the domain. The form says it is a simulation. |
| Reports | Nothing is sent to anyone. The block page says so. |
| Time | The trial period starts when both have said yes to the agreement, not on the move-in date. The test leader can move time forward a week at a time on `/test`. |
| Accounts | There are none. Anyone using the browser can pick any profile. |

## Using it in a test session

1. Open `/test` (link "Til testlederen" in the footer) and press **Start en ny
   test**. This resets the demo data and starts a new log session. Earlier
   sessions are kept in the list on the same page.
2. Choose the setting for the answer after the meeting (yes or no), if you want
   to test how testers experience a no.
3. Let the tester use the site.
4. Open `/test` again. It shows the role, the time for each profile step,
   each step of the flow with times, accepted and declined matches (with fit and
   place in the list), error messages, check-ins, blocks, and text size and
   language choices.
5. Press **Hent denne test som CSV-fil**. The CSV uses semicolons and opens in
   Danish Excel.

**What the log never contains:** anything a tester typed. Only event codes,
step and field names, made-up demo names, match levels, timings and settings.
A tester's own profile appears as "egen profil", and messages are only counted.
A browser test checks this.

**The log lives in the browser it was made in.** If testers use their own
phones, open `/test` on that phone after the session and download the CSV
there, or send the file to yourself.

## Put it online for testers

The site is plain static files, and it uses addresses like `#/forslag`, so it
works on any free static host and in any sub-folder without server setup. Each
tester's data stays in their own browser. **Nothing is published until you do
one of the steps below.**

**Netlify (easiest, free account needed)**

1. Run `npm run build`. This makes the folder `dist/`.
2. Log in at netlify.com, choose *Add new site > Deploy manually*, and drag the
   `dist` folder onto the page.
3. Netlify gives you a link. Share it with testers.

To update it, build again and drag the new `dist` folder onto the same site.
If you connect a Git repository instead, `netlify.toml` already holds the
build settings.

**GitHub Pages (free, with a GitHub repository)**

1. Put the project in a GitHub repository with the default branch `main`.
2. In the repository, open *Settings > Pages* and set *Source* to *GitHub Actions*.
3. Push to `main`. The workflow in `.github/workflows/deploy-pages.yml` runs the
   unit tests, builds the site and publishes it.
4. The link appears under *Settings > Pages*, normally
   `https://<user>.github.io/<repository>/`.

Before you share the link: open it on a phone, go through the flow once, and
check `/test`.

## Tests

- **Unit tests** (`npm test`, Vitest): matching scores and reasons in both
  languages, the test log summary and CSV, the study email check, trial
  period weeks, and the suggested weekly plan.
- **Browser tests** (`npm run test:e2e`, Playwright, in `e2e/flow.spec.ts`):
  the whole flow as a student and as a host, the no after the meeting, the test
  leader page and CSV, English, trial period with time moved forward, blocking
  (both ways and from inside a connection), the advice page, filters, messages,
  helper mode, avatars and the printed agreement. Each test runs on a
  computer-sized and a phone-sized screen. An automatic accessibility check
  (axe, WCAG 2.1 A and AA) runs on every page along the way.

## Code structure

```
src/
  types.ts              All data types
  labels.ts             Fixed lists (areas, help types, study domains) and formatting
  i18n/
    da.ts               All Danish text, including matching reasons and demo profiles
    en.ts               All English text, same shape (the build fails if one is missing)
  data/
    demoData.ts         6 made-up students and 6 made-up hosts
    store.ts            The only file that reads and writes stored data
  matching/match.ts     Matching logic (pure functions)
  state/
    AppContext.tsx      App state and all actions, automatic replies, demo time
    testLog.ts          The test log: events, summary, CSV
    useDraft.ts         Keeps typed text if the page reloads
  components/           Layout, profile form, profile summary, small UI parts
  pages/                One file per page
  styles.css            All styling, including the print layout
e2e/flow.spec.ts        Browser tests
```

To change wording after the tests, edit `src/i18n/da.ts` and `src/i18n/en.ts`.

## How the matching works

`scoreMatch(student, host)` in `src/matching/match.ts` gives 0 to 100 points:

| Part | Points | Rule |
|---|---|---|
| Area | 15 | The room is in an area the student chose (no areas chosen = everywhere) |
| Time | 12 | The room is free when the student wants to move in |
| Rent | 20 | Rent is within the budget (10 if up to 15 % above) |
| House rules | 15 | No conflict on pets or smoking |
| Practical help | 20 | How much of the wanted help is offered, and enough hours |
| Company and motivation | 18 | Both want time together, and the student has more reasons than low rent |

A broken house rule caps the score at 45. The score becomes one of three labels:
"Passer godt" (75+), "Passer delvist" (50 to 74), "Passer mindre godt" (under 50).
The number itself is not shown to users. Verification and helper mode do not
change the score.

The weights are our own first guess. They are not based on data, so they should
be adjusted after the user tests.

## Design choices for older users

- Atkinson Hyperlegible typeface, made for low-vision readers.
- Body text 18 px, with a text size control on every page (18, 20 or 23 px),
  and a Dansk/English switch next to it.
- Buttons at least 52 px high, always with a text label.
- Status is always written in words, never shown by colour alone. Avatars,
  progress bars and labels repeat what the words say.
- Long forms are split into one topic per screen.
- Short sentences, and error messages that say how to fix the problem.
- Works on phone, tablet and computer, and prints cleanly.

## Moving to a real backend later

All storage goes through `src/data/store.ts`. To use Supabase or Firebase,
replace those functions and add real login. At the same time, remove the
automatic replies and the demo time in `src/state/AppContext.tsx`, replace the
simulated student check with a real one, and send reports to a person.

## Known limits

- No real accounts: anyone using the browser can pick any profile.
- Each browser has its own data. Two testers on two devices cannot meet each
  other in the app, and the test log must be downloaded on each device.
- Student verification and reports are simulated (see above).
- Messages are not private from others using the same browser, and there are
  no notifications.
- The agreement is not a legal rental contract, and the page says so.
- If someone edits a demo profile while the site is in English, its texts are
  saved in English.
- The matching weights are not based on data yet.
