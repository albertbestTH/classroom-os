# Teacher mobile local development

## Prerequisites

- Node and Corepack/pnpm versions compatible with the workspace
- Android Studio emulator, iOS Simulator on macOS, or a physical device with Expo Go
- The web API and local PostgreSQL database configured as described in the root README

Copy the example without committing the resulting file:

```powershell
Copy-Item apps/mobile/.env.example apps/mobile/.env
```

Set `EXPO_PUBLIC_API_BASE_URL` to the URL the device can reach:

- Android emulator: `http://10.0.2.2:3000`
- iOS Simulator: `http://localhost:3000`
- Physical device: `http://<your-computer-LAN-IP>:3000`; the phone and computer must share a network and the firewall must allow the port

Start the web app on a reachable host when using a physical device, then start Expo:

```powershell
pnpm --filter web dev --hostname 0.0.0.0
pnpm --filter mobile start
```

Useful checks are `pnpm --filter mobile typecheck`, `pnpm --filter mobile lint`, and `pnpm --filter mobile test`. Production must use HTTPS and a production API URL supplied by the build environment. Never embed credentials, cookies, or a database URL in the app.
