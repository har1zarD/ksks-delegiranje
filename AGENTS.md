<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Match announcement graphics

- Offer only scheduled matches whose start timestamp is strictly in the future. Compare the full timestamp outside the cached reader; filtering by calendar date alone includes earlier games today.
- Use the official KSKS logo from `public/brand/` and keep club crests prominent in exported graphics.
- Size club crests by their visible, non-transparent bounds, not the padded source canvas. Let users choose 1–12 matches per image (default 7), independently of the output format.
