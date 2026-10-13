# The Second Brain: What It Is and How It Works

A plain-English manual for the Brandon Content system. Written Oct 2026. If you're new to this folder, read this first.

---

## What this is

A folder of files that holds everything we know about Brandon's content: how he sounds, what has worked, what we've already made, what we plan to make, and what we're selling in the ads. Claude reads these files automatically at the start of every session, so the system remembers between conversations instead of starting from scratch every time.

The point is simple. Roger pastes a transcript or asks a question, and the answer comes back already knowing the voice rules, the performance history, and what has already been posted.

**North star: raw reach and brand exposure.** Organic content is judged on views, not leads. Monetization runs separately through ads.

---

## The five-second version

| You want to... | You say... | What comes back |
|---|---|---|
| Turn a filmed clip into posts | Paste the transcript | Titles, description, IG captions, X posts, cold open note |
| Get new video ideas | "Give me 20 ranking ideas" | Topics plus ordered bullets, checked for repeats |
| Know what's working | "What performed best in the last 90 days?" | Analysis of the real view data |
| Build ads for a property | Attach the flyer | Hooks, angles, body copy, saved as an ad brief |
| Print something for a shoot | "Give me that as a PDF" | Landscape three-column deck |

---

## The folders

### `CLAUDE.md` (root)
The operating instructions. Claude reads this first, every session. It holds the north star, pointers to every file, and the standing workflows. **When a rule changes, it goes here**, otherwise it is forgotten next session.

### `second-brain/` — what the system knows

**`voice-guide.md`** — How Brandon sounds and the format for every platform. Direct, plain English, contractions, no AI cadence, no emojis or hashtags or em dashes unless asked. YouTube titles lead with search terms, descriptions run 2-4 paragraphs, IG captions are 1-4 sentences, X posts are blunt and slightly contrarian. Every piece of copy follows this.

**`youtube-description-footer.md`** — Brandon's standing contact and bio block. Gets pasted at the end of every YouTube description, verbatim, no exceptions.

**`data/performance-playbook.md`** — What the view data actually proves. Findings 1 through 7, including the one that matters most: **content travels when the items in it are recognizable to normal people.** Tenant rankings using brands everyone knows did 274K, 268K and 200K. Inside-baseball real estate did 2-3K. Same format, same person, hundred-fold difference.

**`data/content-database.csv`** — All 259 posted videos with full transcripts, views, dates and lengths. This is the source of truth for what's already out there. **Current through July 26, 2026 — a fresh export is the single most valuable thing anyone can add to this system.**

**`data/check_repeat.py`** — Run before packaging any transcript. Compares it against every posted video and every package already written, and says whether it's the same clip, the same argument, or genuinely new. Built after seven already-posted clips got packaged as new footage.

**`topic-backlog.md`** — ~1,500 lines, 18 batches, 400+ ideas. Filmed items are marked `[FILMED]` with the verdicts logged so nothing gets graded twice and no sequel repeats an item. This is the file to search before proposing anything new.

**`pipeline.csv`** — Which videos are filmed, which are posted, and what they did. Needs updating more often than it gets it.

**`brand-positioning.md`** — Who Brandon is in the market and how Aspire is described.

**`competitors.md`** — Accounts we watch and what they do well.

**`ads/`** — One brief per property: Magnolia Office Park, Sierra Vista, 770 South Post Oak, Cypresswood. Each holds the property facts, the audience, the angles, the hook bank, body copy, and what's still missing before launch.

**`collabs/`** — Partner shoots, currently the iSmash plan.

### `outputs/` — what the system produces

**`packages/`** — 57 files, one per filmed clip. Each holds the titles, description, captions, X posts and the edit notes. **Nothing finished should live only in chat.** If an editor or Brandon needs it later, it's here.

**PDFs** — Printable filming decks and idea batches, landscape and three columns so they read on a table during a shoot.

**`automation-interview-cut-list.md`** — An example of a different output type: one long interview split into five standalone videos with exact in and out points for the editor.

### `transcripts/`
**`process_inbox.py`** — Summarizes a pile of transcript files without loading all of them into a conversation. Drop files in `transcripts/inbox/`, run it, get a compact summary of each.

---

## The standing workflows

### 1. Transcript to content package
Roger pastes a transcript. Then:
1. **Repeat check first.** If it's already posted, say so with the views and date, and write a repost suite instead — new title, new captions, new cold open.
2. Write the package: YouTube titles with a best pick, description ending with the subscribe line plus the standing footer, IG captions with a best pick, X posts with a best pick, and a clip note naming the cold open.
3. Save it to `outputs/packages/<slug>.md`.
4. Log it in the backlog if it answers a planned idea, including the verdicts.

### 2. Ideation
**Topics and bullet points. Never scripts.** Bullets are ordered by broad appeal and contrarian potential, and the first bullet doubles as the cold open. Everything gets checked against the 259 posted titles and the backlog before it's offered.

### 3. Performance review
Analysis comes from `content-database.csv`, not from impressions. The lane hierarchy, in order of reach: broad money and career rankings, then real estate rankings using recognizable items, then green flag / red flag, then niche owner education.

### 4. Ads
A flyer comes in, a brief goes into `second-brain/ads/`. Hooks follow Roger's proven formula: **name the person with money, then hit what they're already thinking.** By size ("if you own a business with 5 to 10 employees"), by area ("business owners in Magnolia!"), by business type, or stacked. Anything missing before launch — price, HOA, delivery date — gets flagged in the brief.

---

## The rules that don't change

- **Topics and bullets, never scripts.**
- **Every YouTube description ends with the standing footer.**
- **Every finished package gets written to a file.**
- **Check for repeats before packaging.**
- **Brandon's credibility comes from grading against his own interest.** He rated real estate a 3 for the next 20 years while selling real estate. He rates his own content a C. He tells owners how to catch a bad property manager while running a property management company. Never soften that, it's the whole brand.
- **Give him room for opinions people disagree with. Never manufacture controversy.**

---

## What makes this work, and what breaks it

**Works:** the repeat check, the performance data, the backlog's filmed markers, and the voice guide. These are why the output sounds like Brandon and doesn't repeat itself.

**Breaks it:** stale data. The database stops at July 26, so anything posted since is invisible to the repeat checker and missing from every performance analysis. The pipeline file has 27 rows and hasn't kept pace with filming. Both are five-minute exports that make everything downstream more accurate.

**Standing gap:** several of the best clips make a claim with no number behind it. What a backfill really costs, what a deferred repair costs, the last deal Brandon talked a client out of, a loss that made him want to pull back. One shoot dedicated to stories with numbers would upgrade a dozen existing clips at once.
