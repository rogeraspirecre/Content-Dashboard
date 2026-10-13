# Brandon Content Second Brain

This project is the content research + production hub for Brandon's social media (commercial real estate broker; broad money/career/business topics for reach). Roger runs the content operation.

**North star: raw reach / brand exposure.** Monetization and lead capture are handled separately (ads + a future strategy). Judge organic content on views, not leads. Brandon is @bavedikian on all platforms (Brandon Avedikian on YouTube/Facebook).

## Read these before doing content work
- `second-brain/voice-guide.md` — Brandon's voice rules and per-platform output formats. Follow it for every caption, title, description, or post.
- `second-brain/performance-playbook.md` — what actually performs, hook patterns, content-mix ratios.
- `second-brain/data/content-database.csv` — full post history with transcripts, views, dates.
- `second-brain/data/brandon_master_instruction_document.docx` — original master instruction doc with 10 full worked examples.
- `second-brain/competitors.md` — verified inspiration accounts and distribution tactics to test.
- `second-brain/topic-backlog.md` — ranked queue of unmade video ideas; cross off when filmed.

## Standing workflows
1. **Transcript → content package**: **FIRST, always, before writing anything: run `second-brain/data/check_repeat.py` on the pasted transcript.** Roger re-sends clips that are already posted, and seven got packaged as new before this check existed. If it comes back POSTED, say so with the views and date and write a repost suite instead. Then produce the default package from the voice guide (YT titles + best fit, YT description, IG caption options + best, X post options + best). Match Brandon's voice exactly; if it reads polished or symmetrical, roughen it. **Every YouTube description ends with the standing footer in `second-brain/youtube-description-footer.md`, pasted verbatim after the "Subscribe for more..." line — in the chat suite and in the saved package file.**
2. **Performance review**: When a new CSV export lands, re-run the category/hook/monthly analysis and update `performance-playbook.md` with what changed.
3. **Topic/format research**: Use web search and the Instagram/TikTok/YouTube transcript tools to scan competitor accounts and trending formats; judge ideas against the playbook before recommending.
4. **Topic ideation format**: Deliver topics + bullet-point items to run through, never scripts. Order bullets by broad appeal and contrarian-take potential (spiciest, most recognizable item first; it doubles as the hook). Give Brandon space for opinions people naturally disagree with; never manufacture controversy.

## Control panel
When Roger asks for the "control panel" or "dashboard", render the interactive widget (via the visualize/show_widget tool): a transcript paste box with "full package" and "IG captions only" buttons, plus quick-action buttons for content ideas, reposts/Pt. 2s due, competitor scan, performance snapshot, trending formats, and Sierra Vista ad copy. Each button sends the matching standing-workflow request.

## Cheap transcript intake
- **Roger drops .txt transcripts into `transcripts/inbox/`**, then says "process the inbox." Run `python3 transcripts/process_inbox.py` — it prints one compact row per file (words, runtime, topic, hook) and writes `inbox_summary.csv`. Work from that summary; only open a full transcript when actually writing that video's package. Never read every transcript into context.
- **Or Roger pastes YouTube/IG URLs** — pull transcripts with the bulk transcript tools, export to file, then script over the file rather than dumping raw text into the conversation.
- Move finished transcripts to `transcripts/processed/`.
- Cost note: conversation length dominates cost, not transcript length. For big batches, start a fresh session (this file reloads the whole second brain automatically).

## Pipeline + packages (added Aug 2026)
- `second-brain/pipeline.csv` tracks every video: topic, format, lane, status (BACKLOG / FILMED / POSTED), views, notes. Update status whenever a transcript is packaged or Roger reports a posting. This is the source of truth for what's filmed but not yet posted.
- **Write every completed content package to `outputs/packages/<slug>.md`** (titles, description, IG captions, X posts, clip note). Never leave a finished package only in chat — Roger has resent transcripts because copy got buried.
- **Pull view counts directly** with the Instagram tools (@bavedikian) instead of asking Roger to export CSVs. Refresh pipeline.csv and performance-playbook.md from that.

## House rules
- Never ship copy that violates the voice guide (no emojis, hashtags, or em dashes unless asked).
- Recommendations must cite the data (views, category medians) — no vibes-based strategy.
- New learnings about what works go into `performance-playbook.md`, not scattered notes.
