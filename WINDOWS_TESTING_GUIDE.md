# Testing on Windows

Since you're on Windows, here are the best options to test your Todo App:

## Option 1: Browser DevTools (Easiest - Recommended) ⭐

This is the **fastest and easiest** way to test mobile views on Windows:

### Chrome/Edge:
1. Open `index.html` in Chrome or Edge (double-click the file)
2. Press `F12` (or right-click → "Inspect")
3. Click the **device toggle icon** (📱) in the toolbar, or press `Ctrl+Shift+M`
4. Select a device from the dropdown:
   - **iPhone 12 Pro** (recommended for iOS simulation)
   - **iPhone 13 Pro**
   - **Samsung Galaxy S20**
   - **iPad Pro**
   - Or choose "Responsive" to test custom sizes
5. Refresh the page (`F5`)

**Benefits:**
- ✅ No installation needed
- ✅ Instant testing
- ✅ Simulates touch interactions
- ✅ Test multiple devices quickly
- ✅ Network throttling for slow connections

### Firefox:
1. Open `index.html` in Firefox
2. Press `F12` to open DevTools
3. Click the **responsive design mode** icon (or press `Ctrl+Shift+M`)
4. Select a device preset

## Option 2: Android Emulator (Android Studio)

If you want to test on a real Android emulator:

### Setup:
1. Download [Android Studio](https://developer.android.com/studio) (free)
2. Install Android Studio
3. Open Android Studio → **More Actions → Virtual Device Manager**
4. Click **Create Device**
5. Choose a device (e.g., Pixel 5) and click **Next**
6. Download a system image (e.g., Android 13) and click **Finish**
7. Click the **Play** button to start the emulator

### Running Your App:
1. Start the Android emulator
2. Open Terminal/PowerShell in your project folder
3. Run the server:
   ```powershell
   python -m http.server 8000
   ```
   (Or double-click `start-server.bat`)
4. In the emulator, open **Chrome** browser
5. Go to: `http://10.0.2.2:8000`
   (Note: Use `10.0.2.2` instead of `localhost` for Android emulator)

## Option 3: Windows Subsystem for Android (WSA)

If you have Windows 11:

1. Install **Windows Subsystem for Android** from Microsoft Store
2. Install **Amazon Appstore** (comes with WSA)
3. Install Chrome/Edge in the Android subsystem
4. Access your app via localhost

## Option 4: Physical Device Testing

Test on your actual phone:

### Method A: Local Network
1. Find your computer's IP address:
   ```powershell
   ipconfig
   ```
   Look for "IPv4 Address" (e.g., 192.168.1.100)

2. Start the server:
   ```powershell
   python -m http.server 8000
   ```

3. On your phone (same WiFi network), open browser and go to:
   ```
   http://YOUR_IP_ADDRESS:8000
   ```
   Example: `http://192.168.1.100:8000`

### Method B: USB Debugging (Android)
1. Enable USB debugging on your Android phone
2. Connect phone via USB
3. Use Chrome's `chrome://inspect` to debug

## Quick Start Commands

### Start Local Server:
```powershell
# Option 1: Python (if installed)
python -m http.server 8000

# Option 2: Node.js (if installed)
npx http-server -p 8000

# Option 3: Use the included script
.\start-server.bat
```

### Access URLs:
- **Local browser**: `http://localhost:8000`
- **Android emulator**: `http://10.0.2.2:8000`
- **Phone on same network**: `http://YOUR_IP:8000`

## Recommended Workflow

1. **Development**: Use Browser DevTools (Option 1) - fastest iteration
2. **Testing**: Use Android Emulator (Option 2) - real device simulation
3. **Final check**: Test on physical device (Option 4) - real-world testing

## Troubleshooting

### "Python not found"
- Install Python from [python.org](https://www.python.org/downloads/)
- Or use Node.js: [nodejs.org](https://nodejs.org/)

### "Port 8000 already in use"
- Use a different port: `python -m http.server 8080`
- Or stop the other service using port 8000

### "Can't access from phone"
- Make sure phone and computer are on same WiFi
- Check Windows Firewall settings
- Try disabling firewall temporarily to test

### Browser DevTools not showing mobile view
- Make sure you clicked the device toggle icon
- Try refreshing the page after enabling device mode
- Check that the viewport meta tag is in your HTML (it is!)

## Pro Tips

- **Chrome DevTools**: Best for quick testing and debugging
- **Android Studio**: Best for comprehensive Android testing
- **Multiple browsers**: Test in Chrome, Edge, and Firefox for compatibility
- **Network throttling**: Use DevTools to simulate slow 3G/4G connections
- **Touch simulation**: DevTools simulates touch events accurately

Happy testing! 🚀

