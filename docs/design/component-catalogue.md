# Component Catalogue

## Shared semantic roles

Tokens define `Card`, `HeroCard`, `StatusPill`, `AttendanceStatus`, `Progress`, `Donut`, `PrimaryAction`, and `Feedback` semantics. They do not contain React DOM or React Native dependencies.

## Web

The Web dashboard uses `DashboardCard`, `NextClassCard`, `QuickActions`, `AttendanceDonutChart`, `TodaySchedule`, and classroom/pending-work sections. These components own wide-screen layout and keyboard interaction.

## Mobile

Mobile primitives in `apps/mobile/components/ui/primitives.tsx` own themed `Card`, `AppHeader`, `AppButton`, `StatusBadge`, `AttendanceChip`, `ProgressBar`, `Timeline`, `Snackbar`, and error/loading states. Feature screens own query orchestration only.

## Contribution rules

Add a primitive only when the role is reused or accessibility/state behavior would otherwise be duplicated. Keep server data out of presentational components. Use semantic tokens rather than screen-specific colors. Add behavior and accessibility tests for new reusable roles.
