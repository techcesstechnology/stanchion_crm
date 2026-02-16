# Build & Deployment Guide

This project is configured for deployment on **Firebase Hosting**.

## 🏗️ Building for Production

To create an optimized production build of the React application:

```bash
npm run build
```

This command runs `tsc` (TypeScript Compiler) to check for type errors and then `vite build` to bundle the application. The output will be in the `dist/` directory.

**Previewing the Build:**
Before deploying, you can preview the production build locally:

```bash
npm run preview
```

## 🚀 Deploying to Firebase

1.  **Login to Firebase** (if not already logged in):
    ```bash
    firebase login
    ```

2.  **Deploy Command**:
    To deploy the Hosting site, Firestore Rules, and Storage Rules:

    ```bash
    firebase deploy
    ```

    **Partial Deploys:**
    If you only want to deploy specific parts:
    *   **Hosting only**: `firebase deploy --only hosting`
    *   **Firestore Rules**: `firebase deploy --only firestore:rules`
    *   **Storage Rules**: `firebase deploy --only storage`

## Configuration Files

*   **`firebase.json`**: Contains the configuration for Hosting (rewrites, public directory) and rules file locations.
*   **`.firebaserc`**: Stores the project aliases (e.g., `default` project ID).
*   **`firestore.rules`**: Security rules for Cloud Firestore.
*   **`storage.rules`**: Security rules for Cloud Storage.
