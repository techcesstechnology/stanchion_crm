# Features Overview

Stanchion CRM offers a suite of tools designed to streamline business operations.

## 👥 Contact & Lead Management
*   **Contacts**: Maintain a database of your customers. Store key details like name, email, phone, and company information.
*   **Leads**: Track potential business opportunities. Leads can be moved through stages (e.g., New -> Qualified -> Proposal) to help visualize your sales pipeline.
*   **Activity Timeline**: (In Progress) Track interactions and history for each contact or lead.

## 💰 Invoicing & Quotes
*   **Quotes**: Generate professional price quotes for your services or products.
*   **Invoicing**: Convert quotes to invoices or create new ones from scratch.
*   **PDF Generation**: Both quotes and invoices can be generated as PDF documents using `jsPDF`. This allows for easy downloading and sharing with clients.
*   **Line Items**: flexible line item management for adding products/services to your documents.

## ✅ Task Management
*   **To-Do List**: Create tasks to keep track of your daily responsibilities.
*   **Status Tracking**: Mark tasks as "To Do", "In Progress", or "Done" (or similar status flows).

## ⚙️ Settings & Customization
*   **User Profile**: Update your personal details.
*   **Company Settings**: Configure your company name, logo, and address. These details appear on generated PDFs (Invoices/Quotes).
*   **Digital Signatures**: The app includes support for capturing and storing signatures (`SignaturePad`), essential for approving documents.

## 🔒 Security & Authentication
*   **Firebase Auth**: Secure login and signup functionality.
*   **Role-Based Access**: (Implied by Firestore Rules) Data is protected so users can only access their own data or data they are authorized to view.
