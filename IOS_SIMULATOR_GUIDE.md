# Testing in iOS Simulator (Xcode)

## Prerequisites

⚠️ **Important**: iOS Simulator only works on **macOS**. You need a Mac to use Xcode and iOS Simulator.

If you're on Windows, you have these options:
- Use a Mac computer
- Use a cloud Mac service (MacStadium, MacinCloud, etc.)
- Use Browser DevTools to simulate iOS (see below)

## Step-by-Step Instructions

### 1. Install Xcode

1. Open the **App Store** on your Mac
2. Search for "Xcode"
3. Click "Get" or "Install" (it's free but large ~15GB)
4. Wait for installation to complete

### 2. Open iOS Simulator

**Option A: From Xcode**
1. Open Xcode
2. Go to **Xcode → Open Developer Tool → Simulator**

**Option B: Direct Launch**
1. Press `Cmd + Space` to open Spotlight
2. Type "Simulator" and press Enter

### 3. Choose an iOS Device

1. In Simulator, go to **File → Open Simulator**
2. Select an iOS version and device (e.g., iPhone 15, iPhone 14, iPad Pro)
3. Recommended: Start with **iPhone 15** or **iPhone 14 Pro**

### 4. Start a Local Web Server

You need to serve the files via HTTP (iOS Simulator can't access `file://` URLs directly).

**Option A: Using Python (Recommended)**
```bash
# Open Terminal in the project folder
cd /path/to/your/project
python3 -m http.server 8000
```

**Option B: Using Node.js**
```bash
npx http-server -p 8000
```

**Option C: Using the included script**
```bash
chmod +x start-server.sh
./start-server.sh
```

### 5. Open in Safari (iOS Simulator)

1. In the iOS Simulator, tap the **Safari** icon
2. In the address bar, type: `http://localhost:8000`
3. Press Enter or tap Go
4. Your Todo App should load!

### 6. Test Different Devices

To test on different screen sizes:
1. In Simulator, go to **File → Open Simulator**
2. Try different devices:
   - **iPhone SE** (small screen)
   - **iPhone 15** (standard)
   - **iPhone 15 Pro Max** (large screen)
   - **iPad Pro** (tablet)

## Alternative: Browser DevTools (Works on Any OS)

If you don't have a Mac, you can simulate iOS in your browser:

### Chrome/Edge:
1. Open `index.html` in Chrome
2. Press `F12` (or right-click → Inspect)
3. Click device toggle icon (or `Ctrl+Shift+M` / `Cmd+Shift+M`)
4. Select **iPhone 12 Pro** or **iPhone 13 Pro** from device list
5. Refresh the page

This simulates iOS Safari's viewport and touch interactions.

## Troubleshooting

### "Can't connect to localhost"
- Make sure the web server is running
- Check that you're using `http://localhost:8000` (not `file://`)
- Try `127.0.0.1:8000` instead

### "Page not loading"
- Verify all files are in the same folder (index.html, style.css, app.js)
- Check Terminal/console for server errors
- Make sure port 8000 isn't already in use

### "Styling looks wrong"
- The app is optimized for iOS Safari
- Try refreshing the page (`Cmd+R`)
- Clear Safari cache: Settings → Safari → Clear History and Website Data

### Simulator is slow
- Close other apps on your Mac
- Use a newer iOS version (older versions can be slower)
- Restart the Simulator

## Testing Touch Interactions

iOS Simulator supports:
- **Click** = Tap
- **Click and drag** = Swipe
- **Pinch gesture** = Hold Option key while dragging
- **Shake** = Device → Shake

## Pro Tips

1. **Take Screenshots**: `Cmd+S` saves a screenshot to Desktop
2. **Rotate Device**: `Cmd+Left/Right Arrow` or Device → Rotate
3. **Home Button**: `Cmd+Shift+H` (on older iOS versions)
4. **Keyboard**: `Cmd+K` to toggle software keyboard
5. **Multiple Simulators**: You can run multiple simulators at once to test different devices

## Next Steps

If you want to convert this to a native iOS app:
- Use **Cordova** or **Capacitor** to wrap the web app
- Create a **Progressive Web App (PWA)** with a manifest.json
- Use **React Native** or **Swift** for a fully native app

Enjoy testing! 🚀

