# React Demo

Demo site showcasing the React RTE library. This is a React port of the Qwik-based demo site.

## Features

- **Index Page**: Rich text editor with keyword highlighting and statistics
- **Fan Fiction Dashboard**: Upload and analyze story files, extract characters and locations
- **Firebase Authentication**: Google/Gmail sign-in authentication
- **Firebase Hosting**: Ready for deployment to Firebase Hosting

## Installation

```bash
npm install
```

## Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)

2. Enable GitHub Authentication:
   - Go to Authentication > Sign-in method
   - Enable "GitHub" provider
   - Create a GitHub OAuth App at https://github.com/settings/developers
   - Set Authorization callback URL to: `https://ficflow-dee93.firebaseapp.com/__/auth/handler`
   - Copy the Client ID and Client Secret
   - Add them in Firebase Console > Authentication > Sign-in method > GitHub
   - Add your domain to authorized domains if needed

3. Get your Firebase configuration:
   - Go to Project Settings > General
   - Scroll down to "Your apps" section
   - Copy the Firebase configuration values

4. Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```

5. Add your Firebase configuration to `.env`:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Preview

```bash
npm run preview
```

## Deployment to Firebase Hosting

1. Install Firebase CLI (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project (if not already done):
   ```bash
   firebase init hosting
   ```
   - Select your Firebase project
   - Set public directory to `dist`
   - Configure as single-page app: Yes
   - Set up automatic builds: No

4. Build and deploy:
   ```bash
   npm run deploy
   ```
   Or manually:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

## Pages

- `#index` - Main editor with keyword highlighting (requires authentication)
- `#fanfiction` - Fan fiction analysis dashboard (requires authentication)

## Authentication

The app requires GitHub authentication to access. Users must sign in with their GitHub account to use the application.

## Dependencies

- React 18
- React DOM 18
- Firebase 10
- Tailwind CSS
- Vite
- @react-rte/lib (local dependency)

