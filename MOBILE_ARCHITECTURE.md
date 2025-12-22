# EventTix Mobile - React Native Architecture

## 🎯 Objective
Build a high-performance, offline-first native mobile application using **React Native (Expo)**.

## 🛠 Tech Stack
- **Framework:** React Native (Expo SDK 50+)
- **Language:** TypeScript
- **State Management:** TanStack Query + Zustand
- **Database (Offline):** WatermelonDB (SQLite)
- **Camera:** React Native Vision Camera (10x faster scanning)
- **Auth:** Supabase Auth (Native SDK) + Biometrics (FaceID/TouchID)
- **Push Notifications:** Expo Notifications / OneSignal

## 🏗 Modular Structure (`/mobile`)

```
/mobile
  /app                 # Expo Router (File-based routing)
    /(auth)           # Login, Signup
    /(tabs)           # Events, Tickets, Profile
    /scanner          # Dedicated Scanner Screen
  /src
    /components       # Reusable Native UI Components
    /database         # WatermelonDB Models & Schema
    /services         # API & Auth Services
    /hooks            # Custom Hooks (useOfflineSync, useCamera)
    /utils            # Helpers
```

## 🚀 Key Features Implementation Plan

### 1. VisionCamera Integration
- **Goal:** Sub-100ms QR code scanning.
- **Tech:** `react-native-vision-camera` + `react-native-worklets-core`.
- **Implementation:** Frame processors for real-time detection without UI lag.

### 2. WatermelonDB (Offline First)
- **Goal:** App works perfectly without internet. Syncs when online.
- **Tech:** WatermelonDB + Supabase Sync Adapter.
- **Benchmarks:** Handle 10,000+ tickets locally with 60fps scrolling.

### 3. Native Payments
- **Goal:** One-tap purchasing.
- **Tech:** Apple Pay / Google Pay via Stripe native SDK or Razorpay Native.

### 4. Biometric Security
- **Goal:** Secure access to tickets and organizer dashboard.
- **Tech:** `expo-local-authentication`.

## 📅 Roadmap (4-6 Weeks)

- **Week 1:** Project Setup, Navigation, Auth Flow, WatermelonDB Schema.
- **Week 2:** Event Listing, Ticket UI, Offline Sync Logic.
- **Week 3:** VisionCamera Scanner Implementation (Critical).
- **Week 4:** Payments & Ticket Generation.
- **Week 5:** Biometrics & Push Notifications.
- **Week 6:** Polish, Performance Tuning, App Store Prep.
