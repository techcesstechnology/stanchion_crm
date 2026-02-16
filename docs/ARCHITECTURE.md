# Architecture & Tech Stack

## Technology Stack

*   **Frontend Framework**: React 19
*   **Language**: TypeScript
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS + PostCSS
*   **Icons**: Lucide React
*   **State Management**: React Context (e.g., AuthContext) + Local State
*   **Routing**: React Router DOM v7
*   **Backend**: Firebase (Serverless)
    *   **Database**: Cloud Firestore (NoSQL)
    *   **Authentication**: Firebase Auth
    *   **Storage**: Cloud Storage for Firebase

## Project Structure

```
src/
├── components/       # Reusable UI components (Buttons, Inputs, Modals, etc.)
│   ├── shared/       # Generic shared components
│   └── ...
├── contexts/         # React Context Providers
│   └── AuthContext.tsx # Handles user authentication state
├── lib/              # Core libraries and configuration 
│   └── firebase.ts   # Firebase initialization
├── pages/            # Main Page Components (Views)
│   ├── Login.tsx
│   ├── ContactList.tsx
│   ├── Leads.tsx
│   ├── Tasks.tsx
│   └── ...
├── services/         # Service Layer - Direct interaction with Firestore
│   ├── authService.ts
│   ├── contactService.ts
│   ├── invoiceService.ts
│   ├── leadService.ts
│   └── ...
├── types/            # TypeScript Interfaces and Types
└── utils/            # Helper functions (Formatters, Validators)
```

## Key Architectural Patterns

### Service Layer Pattern
The application uses a dedicated Service Layer (`src/services/`) to handle all interactions with Firebase Firestore. Components do not query Firestore directly; instead, they call methods from these services. This separates the UI logic from the data access logic.

**Example:** `contactService.ts` contains `getContacts()`, `addContact()`, etc.

### Component-Based UI
The UI is built using functional React components. Reusable parts are extracted into `src/components/`. Tailwind CSS is used for utility-first styling, ensuring consistency and rapid development.

## Data Model (Firestore)

The application uses a NoSQL document-based structure in Firestore.

**Primary Collections:**

*   `users`: Stores user profile information (settings, company details).
*   `contacts`: Stores customer/contact information.
*   `leads`: Stores potential sales leads and their status (New, Qualified, Proposal, etc.).
*   `invoices`: Stores generated invoices including line items.
*   `quotes`: Stores price quotes sent to clients.
*   `tasks`: Stores to-do items and reminders.
*   `activities`: (Start of implementation) tracks logs/history of actions.

Each document typically contains `createdAt` and `updatedAt` timestamps for auditing.
