# Classroom OS Design System

## Principle

Same product language, platform-appropriate experience. Web and Mobile share brand, semantic colors, typography, status language, chart semantics, spacing rhythm, and writing tone. Layouts remain platform-specific.

## Brand and tone

Classroom OS is modern, friendly, confident, and teacher-first. Thai copy is concise, action-oriented, and honest about data state. The primary action should be obvious without making the interface feel like an admin template.

## Tokens

The canonical, platform-neutral token source is `packages/design-tokens/src/index.ts`. It contains light/dark semantic themes, spacing, radii, motion, touch targets, and typography roles. Web maps these values to CSS variables; Mobile maps them to React Native styles.

Status meaning is never conveyed by color alone: labels, icons, or text summaries accompany every status color.

## Typography

LINE Seed Sans TH is the primary UI family. The regular face is used for body/caption text and the bold face for headings, labels, and metrics. Thai text must retain readable line height and support dynamic font scaling on Mobile.

## Components

Platform components own rendering and interaction. They consume shared semantic values but are not forced into a cross-platform component library. Web favors tables and multi-column detail; Mobile favors cards, progressive disclosure, and sticky primary actions.

## Accessibility and motion

Interactive targets are at least 44×44 logical pixels and preferably 48×48 for Mobile primary actions. Pressed/loading states appear immediately. Reduced-motion settings are respected. Donuts and charts always have a textual summary.

## Correct versus incorrect

- Correct: `attendance.present` with a “มา” label and a textual count.
- Incorrect: a green dot with no label.
- Correct: a single primary “เช็กชื่อ” action for the current session.
- Incorrect: equal-weight cards competing with the current class action.
