# EventTix Mobile - Installation Guide

## 📦 Required Dependencies

Run these commands in the `/mobile` directory:

```bash
# Core Navigation & UI
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar

# WatermelonDB (Offline Database)
npm install @nozbe/watermelondb
npm install --save-dev @nozbe/with-watermelondb

# VisionCamera (Fast QR Scanning)
npm install react-native-vision-camera
npm install react-native-worklets-core
npx pod-install # iOS only

# Biometric Authentication
npx expo install expo-local-authentication

# Payments
npm install @stripe/stripe-react-native
# OR for Razorpay
npm install react-native-razorpay

# Push Notifications
npx expo install expo-notifications expo-device expo-constants

# State Management
npm install @tanstack/react-query zustand

# Supabase Native
npm install @supabase/supabase-js @react-native-async-storage/async-storage
npm install react-native-url-polyfill
```

## 🔧 Platform-Specific Setup

### iOS
1. Add camera permission to `Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to scan QR codes</string>
<key>NSFaceIDUsageDescription</key>
<string>Authenticate using Face ID</string>
```

2. Run: `cd ios && pod install && cd ..`

### Android
1. Add permissions to `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-feature android:name="android.hardware.camera" />
```

## 🚀 Running the App

```bash
# Start development server
npx expo start

# Run on iOS
npx expo run:ios

# Run on Android
npx expo run:android
```

## 📱 Testing Features

- **QR Scanner:** Point camera at any QR code
- **Biometric:** Trigger from settings/secure screens
- **Offline Mode:** Turn off internet, app still works
- **Sync:** Data syncs automatically when online
