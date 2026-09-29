# Q Security 1.14 · mobile release handoff

QCDS by Patrik Sundblom. Contributor: ChatGPT (OpenAI).

## The product

A private security investigation workspace for individuals, small businesses and
builders. Five questions lead from an unwanted outcome to possible routes,
controls, counter-tests and evidence. Cases resume independently. Illustrated
PDFs, complete backups, security perspectives and bounded quantum simulations
are generated locally. Worked examples stay visibly synthetic.

The consumer app runs offline after its first complete web installation. Native
builds bundle the engine and report assets directly, use the operating system's
file-sharing sheet, support file import and handle Android's Back button.
The optional external local-LLM model download requires a network connection;
the guided interview and all core investigation features work without it.

## Install the current web app

Open https://iampathat.github.io/thesyntractvision/qcds-security-lab/ and select
**Install app**. Samsung/Chrome also offers **Install app / Add to Home screen**
in its menu. In iPhone Safari use **Share → Add to Home Screen**. Wait for
**Ready for offline use**. Existing browser work remains in that browser's
storage; export a workspace backup to transfer into the native app.

## Reproducible native builds

Requirements: Node 22+, Android SDK 36 / JDK 21 for Android; macOS with Xcode 26+
for iOS. Dependency versions are pinned in `package-lock.json`. Generated native
projects are build output; update `scripts/prepare-native.mjs` to preserve changes.

```sh
cd qcds-security-lab
npm ci --ignore-scripts
npm test
npm run prepare:android
cd android
./gradlew assembleDebug bundleRelease
```

```sh
cd qcds-security-lab
npm ci --ignore-scripts
npm run prepare:ios
npx cap open ios
```

The **Q Security mobile builds** GitHub workflow compiles an Android debug APK,
an unsigned Android App Bundle, and an unsigned iOS Simulator app. Artifacts are
attached to its successful run. The simulator zip cannot be installed on a
physical iPhone. A debug APK is for device testing, not store distribution.

| Release setting | Prepared value |
| --- | --- |
| App name | Q Security |
| Application / bundle ID | `org.syntract.qsecurity` — confirm ownership before first store upload |
| Version / build | `1.14.1` / `11401` |
| Android target SDK | 36 |
| Minimum Android | API 24 |
| Runtime | Capacitor 8.5.2; assets bundled; no remote `server.url` |
| Report sharing | Native cache file → system share sheet |
| Privacy manifest | File timestamp reason C617.1; included in Xcode resources |
| Android backup | Disabled; explicit user-exported workspace backups |
| Icon | Original Q★ vector, generated platform sizes |

## Final owner actions before store submission

1. Choose the developer organization/account and verify the bundle ID, app name,
   support contact and rights. No account or signing key has been created for you.
2. Test the generated APK on a physical Samsung Fold, including fold/unfold,
   offline restart, new case, restore backup, PDF share and Back. Test the iOS
   build on a physical iPhone through your signing team or TestFlight.
3. Configure Android upload signing / Play App Signing; archive iOS in Xcode with
   your Apple team and distribution signing. Keep credentials out of this repo.
4. Use `mobile/STORE_LISTING.md`, real device screenshots and the published privacy
   page. Complete the store's age/content, data-safety and privacy declarations
   against the exact signed binary. Reviewer steps are included below.
5. Decide price and regions. This release has no billing integration or entitlement
   server. A paid download is a concrete option; paid web access or in-app premium
   features would need a separate purchase and entitlement implementation.

No store listing, payment, subscription or review approval is implied by these
builds. Apple and Google review the submitted functionality and metadata.

## Reviewer walkthrough

No sign-in. Launch → Home → Start an investigation → select a starter and name →
Create → five numbered questions. Home resumes the same step. My cases opens,
copies and archives cases without overwriting another. Use a worked example to
inspect a populated report: Report → Export PDF → native share sheet. Export and
import JSON without a server. Under Explore the QCDS engine, reopen assumptions
and run the ideal/noisy comparison. This is explicitly CPU simulation, not a QPU
service or a device scanner. The 3.5-second introduction has a skip control.

## Privacy and support

Privacy: https://iampathat.github.io/thesyntractvision/qcds-security-lab/privacy.html

Support: https://github.com/iampathat/thesyntractvision/issues

User data stays in local app storage until the user exports it. It is not
encrypted by an application-level password. Clearing app data removes local
cases. Native export files use the operating system cache so receiving apps can
read them; filenames can be overwritten by later exports. No ad or analytics SDK,
account system, scan daemon or remote threat-model service is included.
