---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance (accessibility, focus, forms, animation, responsive, performance). Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or before shipping any page or component.
metadata:
  author: vercel (adapted for local use)
  version: "1.0.0-local"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

Review files for compliance with Vercel's Web Interface Guidelines.

## How It Works

1. Read the rules in `references/web-interface-guidelines.md` (vendored copy, same folder as this skill).
   Optionally, if network is available, fetch the latest version from
   `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`
   and prefer it when it is newer — but never block the review on the network.
2. Read the specified files (or ask the user for files/pattern).
3. Check against all rules.
4. Output findings in the terse `file:line` format described in the rules file.

## Usage

When a user provides a file or pattern argument:

1. Load the rules from `references/web-interface-guidelines.md`
2. Read the specified files
3. Apply all rules
4. Output findings using the format specified in the rules

If no files are specified, review `src/**/*.{jsx,tsx,css}` of the current project.

## Project notes (Portfolio-page)

- This is a single-page portfolio (React + Vite + Tailwind). The rules that matter most here:
  keyboard focus (`focus-visible`), reduced motion (`prefers-reduced-motion` honoured by every animation),
  touch targets on mobile, `alt` on project images, `aria-label` on icon-only links, semantic landmarks
  (`header`, `nav`, `main`, `section` with headings, `footer`), skip link, no layout shift from fonts/images.
- Run this review as the last step before every delivery, not only when asked.
