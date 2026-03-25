# Verse. Android APK — Build Guide

## Option A: Build with Android Studio (Recommended)

1. Download & install [Android Studio](https://developer.android.com/studio)
2. Open Android Studio → **File → Open** → navigate to this `android/` folder
3. Let Gradle sync (it will download dependencies automatically)
4. Click **Build → Build Bundle(s) / APK(s) → Build APK(s)**
5. Your APK will appear in `android/app/build/outputs/apk/debug/app-debug.apk`
6. Transfer that `.apk` file to your Android phone and install it!

## Option B: Build Online (No Installation Required)

### Using Appetize.io + ApkTool Online:

1. **Zip** this entire `android/` folder into `verse-android.zip`
2. Go to **[https://www.onlineapkbuilder.com/](https://www.onlineapkbuilder.com/)** or similar service
3. Upload the zip and follow their wizard

### Using GitHub Actions (Free):

1. Push this `android/` folder to a GitHub repository
2. Add this GitHub Actions workflow file at `.github/workflows/build.yml`:

```yaml
name: Build APK
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      - name: Build APK
        run: |
          cd android
          chmod +x gradlew
          ./gradlew assembleDebug
      - uses: actions/upload-artifact@v4
        with:
          name: verse-apk
          path: android/app/build/outputs/apk/debug/app-debug.apk
```

3. Go to your repo's **Actions** tab → click the latest run → download the `verse-apk` artifact!

## Project Structure

```
android/
├── build.gradle              (Root build script)
├── settings.gradle           (Project settings)
├── gradle/wrapper/           (Gradle wrapper config)
├── app/
│   ├── build.gradle          (App build config, SDK 34)
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/org/versebible/app/
│       │   └── MainActivity.java   (Borderless WebView)
│       └── res/
│           ├── values/styles.xml   (Dark theme)
│           ├── values/strings.xml  (App name: "Verse.")
│           └── mipmap-*/           (Launcher icons)
```

## App Details

- **Package**: `org.versebible.app`
- **App Name**: Verse.
- **Target URL**: https://verse.is-great.org
- **Min SDK**: 24 (Android 7.0)
- **Target SDK**: 34 (Android 14)
- **Features**: Borderless immersive mode, no status/nav bars, back button navigates within WebView
