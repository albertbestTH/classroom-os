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

For a native Android development client (Android SDK/Emulator required), run:

```powershell
pnpm --filter mobile android:dev-build
```

The first build installs the required SDK/NDK components and can take considerably longer. `apps/mobile/eas.json` also defines internal development and preview APK profiles; deployment credentials and the API URL must be injected by the build environment.

On Windows, CMake used by `react-native-worklets` can exceed the legacy path limit when the repository has a long absolute path. Keep the checkout path short or use a local short pnpm virtual store before building, for example `pnpm install --force --virtual-store-dir C:\.cos-pnpm`. This path is machine-local and must not be committed. For an x86_64 Android Studio emulator, a generated native project can be validated with `gradlew :app:assembleDebug -PreactNativeArchitectures=x86_64`; normal EAS builds create all configured production architectures remotely.

After installing a development build and preparing a synthetic teacher account, install Maestro and run `pnpm --filter mobile e2e:android` with `MAESTRO_TEST_EMAIL` and `MAESTRO_TEST_PASSWORD`. The smoke test clears application state and never uses real student data.
