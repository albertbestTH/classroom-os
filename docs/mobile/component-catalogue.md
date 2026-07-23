# Mobile component catalogue

Teacher Mobile uses the shared primitives in `apps/mobile/components/ui/primitives.tsx`. Screens compose these components instead of recreating cards, state views, chips, or dialogs.

- Structure: `SafeScreen`, `AppHeader`, `SectionHeader`, `SectionCard`.
- Information: `Avatar`, `ListTile`, `MetricCard`, `StatusPill`, `Chip`, `ProgressBar`, `Timeline`.
- Actions: `SearchBar`, `AttendanceChip`, `AppButton`, `FloatingActionButton`.
- Overlays: `BottomSheet`, `Dialog`, `ConfirmationSheet`, `Snackbar`, `Toast`.
- Async states: `LoadingCard`, `SkeletonCard`, `ErrorCard`, `OfflineBanner`, `EmptyIllustration`.

Colors come from `useTheme()`. Spacing, radius, typography, shadow, icon, motion, and touch-target values live in `constants/tokens.ts`. Interactive controls have at least a 44-point target.
