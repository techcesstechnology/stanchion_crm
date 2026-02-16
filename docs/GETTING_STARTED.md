# Getting Started with Stanchion CRM

This guide will help you set up the Stanchion CRM project on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js**: Version 18.0.0 or higher. [Download Node.js](https://nodejs.org/)
*   **npm**: Usually generated with Node.js.
*   **Git**: Version control system. [Download Git](https://git-scm.com/)
*   **Firebase Account**: You need a project created in the [Firebase Console](https://console.firebase.google.com/).

## Installation

1.  **Clone the repository**
    Open your terminal and run:
    ```bash
    git clone <repository-url>
    cd stanchion-crm
    ```

2.  **Install Dependencies**
    Install the project dependencies using npm:
    ```bash
    npm install
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root directory. You can copy the example file if it exists, or create one from scratch.
    
    ```bash
    cp .env.example .env
    # OR on Windows
    copy .env.example .env
    ```

    **Required Environment Variables:**
    
    Populate `.env` with your Firebase project credentials. You can find these in your Firebase Project Settings -> General -> "Your apps" -> "SDK setup and configuration".

    ```env
    VITE_FIREBASE_API_KEY=your_api_key_here
    VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=your_project_id
    VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
    VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    VITE_FIREBASE_APP_ID=your_app_id
    ```

## Running the Application

Start the local development server:

```bash
npm run dev
```

The application should now be running at `http://localhost:5173`.

## Troubleshooting

*   **"Missing or insufficient permissions"**: Ensure you have deployed the Firestore Security Rules (`firestore.rules`) and that your user is authenticated.
*   **Build Errors**: Run `npm run build` to check for TypeScript errors. Common issues include missing types or unused variables.
