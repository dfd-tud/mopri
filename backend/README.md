<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: CC-BY-SA-4.0
-->

## @mopri/backend

### Overview

The backend is a Node.js application built with Express. It exposes a RESTful API, and you can find the Swagger documentation at `your-domain/api-docs`.

### Scripts

- **Development**: To start the backend in development mode, run:
  ```bash
  pnpm --filter @mopri/backend run dev
  ```
- **Build**: To build the backend for production, run: 
  ```bash
  pnpm --filter @mopri/backend run build
  ```

### Configuration

You can customize various settings, including the domain, by modifying the .env file located in the @mopri/backend directory.

## Analysis Pipeline Dependencies

The analysis pipeline relies on various existing tools, which are partly imported as Node modules and some are downloaded as binaries automatically by the project. All binaries are stored various subdirectories (`mopri`,`autopy`,`andromatic`) in the user's cache directory (usually `~/.cache`). Below is a comprehensive list of all external dependencies, including their types, sources, installation methods, and the components responsible for handling them.

### Binaries

1. **PCAPDroid**
   - **Type**: APK
   - **Source**: Pulled from [GitHub Releases](https://github.com/emanuele-f/PCAPdroid/releases)
   - **Installation**: Installed on the Analysis Device
   - **Handler**: `PCAPdroidDownloader.ts`

2. **Java**
   - **Type**: Binary
   - **Source**: Java OpenJDK download page -> details see library 
   - **Installation**: Installed on the Host Device
   - **Handler**: `Andromatic` using [node-java-connector](https://github.com/NLueg/node-java-connector/tree/master/src/install) 

3. **Python**
   - **Type**: Binary
   - **Source**: [Third Party Standalone Python Builds](https://github.com/indygreg/python-build-standalone)
   - **Installation**: Installed in a Virtual Environment on the Host Device
   - **Handler**: Multiple classes using `Autopy`

4. **AndroidDevTools (via sdkmanager)**
   - **Type**: Managed by [sdkmanager](https://developer.android.com/tools/sdkmanager)
   - **Description**: Android SDK package manager used to install various Android development tools.
   - **Managed by**: [Andromatic](https://github.com/tweaselORG/andromatic/blob/main/src/index.ts#L155) using `ensureSDKManager()`
   - **Used to Install**:
     - **[emulator](https://developer.android.com/studio/run/emulator-commandline)**
     - **[cmdline-tools](https://developer.android.com/tools/releases/platform-tools#downloads.html)**
       - **[avdmanager](https://developer.android.com/tools/avdmanager)**
     - **[platform-tools](https://developer.android.com/tools/releases/platform-tools)**
       - **[ADB](https://developer.android.com/tools/adb)**
     - **android-sdk-build-tools**
       - **dexdump** (required by Exodus)
     - **system-images** (emulator system images for different Android versions, variants & architectures)

### Python Packages

1. **ExodusCore**
   - **Type**: PIP Package
   - **Source**: Pulled from the Python Package Index (PyPI)
   - **Installation**: Installed in a Virtual Environment on the Host Device
   - **Handler**: `StaticAnalyzerExodus.ts` using `Autopy`

2. **PCAPng**
   - **Type**: PIP Package
   - **Source**: Pulled from the Python Package Index (PyPI)
   - **Installation**: Installed in a Virtual Environment on the Host Device
   - **Handler**: `NetworkTrafficRecordingPCAP.ts` using `Autopy`

3. **fritap**
   - **Type**: PIP Package
   - **Source**: Pulled from the Python Package Index (PyPI)
   - **Installation**: Installed in a Virtual Environment on the Host Device
   - **Handler**: `FriTapManager.ts` using `Autopy`

4. **mitmproxy**
   - **Type**: PIP Package
   - **Source**: Pulled from the Python Package Index (PyPI)
   - **Installation**: Installed in a Virtual Environment on the Host Device
   - **Handler**: `Cyanoacrylyte` using `Autopy`
