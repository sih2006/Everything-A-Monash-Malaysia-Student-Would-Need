# Using the app on your Android phone

There are three ways, from quickest to most complete. Only the first one works today.

| Way | Works today | What you get |
|---|---|---|
| 1. Phone browser, same Wi-Fi as the laptop | Yes | The full app on the phone while the laptop is on |
| 2. Hosted online with HTTPS | After [aws-setup.md](aws-setup.md) | The app anywhere, installable to the home screen |
| 3. A real Android app | Not built | Steps, heart rate and sleep read from Health Connect |

## Way 1: phone browser on the same Wi-Fi

The server normally only answers the laptop itself. To let the phone in, you start it differently and protect it with a token (a password for the app).

1. Make up a long token, for example 20 random letters and numbers.
2. Open `.env` in the project folder (copy `.env.example` to `.env` if it does not exist) and set:
   ```
   HOST=0.0.0.0
   APP_TOKEN=your-long-token
   ```
3. Start the server: `node backend/src/server.js`.
4. Find the laptop's address on the Wi-Fi. In a terminal run `ipconfig` and look for **IPv4 Address** under your Wi-Fi adapter. It looks like `192.168.1.23`.
5. On the phone, connected to the same Wi-Fi, open Chrome and go to `http://192.168.1.23:8080` (with your own numbers).
6. The app says it is locked. Type the token. The phone remembers it.
7. In Chrome's menu choose **Add to Home screen** to get an icon.

If the phone cannot connect, Windows Firewall is probably blocking it. When Windows asks whether to allow Node on private networks, choose **Allow**. Do not allow it on public networks.

**Limits of this way:**
- It only works while the laptop is on and both are on the same Wi-Fi.
- The connection is plain HTTP, so anyone on the same Wi-Fi could read the traffic. Use it at home, not on campus or café Wi-Fi.
- Without HTTPS the phone will not treat it as an installable app and it will not open offline. That needs way 2.

To go back to laptop-only, remove the `HOST` line and restart.

## Way 2: installable app (after hosting)

Once the app is online with HTTPS, Chrome on Android offers **Install app**. Two things are still missing for that:

- **Icons.** The file [web/manifest.webmanifest](../../web/manifest.webmanifest) has an empty `icons` list, because this project uses no generated images. Add two PNG files from your artist (192×192 and 512×512 pixels) to `web/` and list them:
  ```json
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
  ```
- **A login.** A token in the browser is enough for one person at home. Online, the app needs a proper login. See [aws-setup.md](aws-setup.md).

## Way 3: a real Android app (not built)

Steps, heart rate and sleep on Android come from **Health Connect**, which a web page cannot read. That needs a native app. This is the planned route, for an agent to carry out:

1. **Decide how to wrap the web app.** Two options to compare in an ADR:
   - A **Trusted Web Activity** (the hosted web app shown full-screen in an Android shell). Small, but it cannot read Health Connect by itself.
   - **Capacitor** (the web app packaged inside a native project). It can call native code through a plugin, which is what Health Connect needs.
2. **Read Health Connect.** A small Kotlin plugin asks for read permission for steps, sleep and heart rate, reads the day's values and passes them to the web app, which calls the existing `PUT /api/health/days/:day`. Nothing else in the backend has to change.
3. **Heart rate and sleep need a watch.** The phone alone only gives steps.
4. **Tools needed on the laptop:** Android Studio (free), which brings the Android SDK and a Java runtime. Neither is installed now.

The health rules and screens are already built and tested, so this work is only the wrapper and the plugin.
