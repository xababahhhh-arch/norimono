# AGENTS.md — norimono game development rules

## Safety and branch policy
- Target ages: 2–4. Prioritize child-friendly usability and existing game stability.
- Inspect repository, open Draft PR #2, other branches, existing games, test setup, publication and unfinished defects first.
- Work only on existing `codex/sou-shape-builder` branch / Draft PR #2 until reviewed. Never modify main, merge, or open a new PR without explicit approval.
- Do not enable billable Actions, paid APIs, ads, tracking, or personal-data collection.
- Never change publication settings, register external hosting, or incur costs without explicit approval.

## Quality before quantity
- Fix blockers and severe regressions before adding games. Do not treat code presence as completion.
- Aim for ten **mechanically distinct** daily games: counting, shape, color, memory, listening, direction, sequence, observation, causality, vehicle operation. Avoid recolors, question swaps and duplication with existing games.
- Reuse shared UI, speech, game loop and feedback. Each game needs a clear start gesture, visual/finger tutorial, named vehicle speech, three gentle stages, short play, randomness, retry/home controls, and accessible large tap targets. Provide tap alternative for dragging.
- Begin iOS speech from user gesture. Serialize utterances and await completion/cancellation before progression. Never overlap speech/BGM. Meaningful gentle sounds; distinct success, error and completion feedback. Listening games must genuinely use audio; vehicle-control games must show actual vehicle movement, with coherent directions, silhouettes, wind arrows and outcomes.
- Preserve train-driver and minicar series. Keep options sufficient, distractors meaningful, and numeric choices ascending.

## Integration and tests
- Register every game in the **actual** navigation entrypoint (check whether learning.html exists; do not assume). Update service-worker cache with all assets.
- Update `tests/daily-ten-smoke.cjs` to today's IDs and execute `cd tests && npm run test:daily` in a free local environment where possible. Verify 320/390/768px, all 3 stages, correct/wrong answers, clear, retry, exceptions, horizontal overflow, tap regions, links and SW.
- Fix failures and rerun. If browser/test dependencies are unavailable, perform static HTML/CSS/JS/file/link checks, report **自動テスト未実行**, and do not count those games complete. Playwright speech stubs cannot validate real iOS audio. Never claim device testing without physical-device testing.
- Compare against main and confirm PR remains Draft, unmerged.

## Publication and reporting
- A game is **complete** only after implementation, listing, successful automated tests, push to existing branch, deployment to an explicitly approved free fixed test site, and verified external URL reachability/startup. A branch URL is not proof of a deployed Pages site. Do not invent or present unchecked URLs as playable.
- If preview deployment is blocked, document precise blockers and a no-cost proposal; do not alter main or Pages settings on your own.
- Report in Japanese: date, names/genres/mechanics, implemented/pushed/test-passed/deployed/complete counts separately, exact commit SHA, Draft PR URL, verified test URL if any, iOS gaps and failed checks. Never inflate counts.
