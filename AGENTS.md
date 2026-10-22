<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Match announcement graphics

- Offer future scheduled matches and all postponed matches in the current season. Compare scheduled start timestamps outside the cached reader; postponed matches remain selectable after their original start and display “ODGOĐENO” instead of the old schedule.
- Use the official KSKS logo from `public/brand/` and keep club crests prominent in exported graphics.
- Size club crests by their visible, non-transparent bounds, not the padded source canvas. Let users choose 1–12 matches per image (default 7), independently of the output format.
- Render “ODGOĐENO” in exported graphics as red text in a distinct bold monospace font with subtle letter spacing. No background or border; use a lighter red on dark templates.

## Club identity and logos

- Before reusing a club or replacing its logo, inspect all linked competitions and their genders. Clubs from the same city can be separate men's and women's clubs; match the actual club identity and preserve license-folder associations when correcting links.
- Club logos must also work in license PDFs: `src/lib/license-pdf.ts` embeds only PNG and JPEG. Keep shared logo assets in those formats unless PDF decoding is updated; browser support for WebP alone is insufficient.
