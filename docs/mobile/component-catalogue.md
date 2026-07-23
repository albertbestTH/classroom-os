# Mobile component catalogue

Teacher Mobile uses the shared primitives in `apps/mobile/components/ui/primitives.tsx`. Screens compose these components instead of recreating cards, state views, chips, or dialogs.

- Structure: `SafeScreen`, `AppHeader`, `SectionHeader`, `SectionCard`.
- Information: `Avatar`, `ListTile`, `MetricCard`, `StatusPill`, `Chip`, `ProgressBar`, `Timeline`.
- Actions: `SearchBar`, `AttendanceChip`, `AppButton`, `FloatingActionButton`.
- Overlays: `BottomSheet`, `Dialog`, `ConfirmationSheet`, `Snackbar`, `Toast`.
- Async states: `LoadingCard`, `SkeletonCard`, `ErrorCard`, `OfflineBanner`, `EmptyIllustration`.
- Forms and text: `FormField` and `ThemedText` apply semantic theme colors, scalable text, labels, and consistent input borders.

Colors come from `useTheme()`. Spacing, radius, typography, shadow, icon, motion, and touch-target values live in `constants/tokens.ts`. Interactive controls have at least a 44-point target.

`ErrorCard` accepts the original mobile error and maps authentication, authorization, not-found, conflict, validation, server, offline, timeout, and unknown failures to distinct safe presentations.
