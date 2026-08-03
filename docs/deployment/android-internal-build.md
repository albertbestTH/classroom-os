# Android internal UAT build

`apps/mobile/eas.json` contains `development`, `preview`, and `production` profiles. The `preview` profile is the only profile for teacher UAT and builds an internal APK. It sets the visible environment label to `UAT`; the API URL must be supplied by the EAS environment.

1. Run `eas login` and link the repository to an approved EAS project (do not fabricate a project ID).
2. Create an EAS `preview` environment variable named `EXPO_PUBLIC_API_BASE_URL` containing the public HTTPS Staging origin.
3. Run `eas build --platform android --profile preview`.
4. Share the internal artifact only with approved testers, install it, and confirm Profile shows `UAT`.

The bundle contains only public API configuration; database credentials and password values never belong in the client. Development builds may use a local URL reachable by the emulator, but UAT builds must not depend on localhost or a LAN IP. Signing, Play Store distribution, iOS, and Production builds are outside this task.
