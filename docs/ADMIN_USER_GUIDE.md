# Stanchion CRM - Administrator User Guide

**Version:** 1.3.0  
**Last Updated:** February 2026 (Refined Footer Layout)

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Dashboard Overview](#dashboard-overview)
4. [Contact Management](#contact-management)
5. [Quote Management](#quote-management)
6. [Invoice Management](#invoice-management)
7. [Settings Configuration](#settings-configuration)
   - [Company Details](#company-details)
   - [Finance & Banking Details](#finance--banking-details)
   - [VAT/Tax Configuration](#vattax-configuration)
   - [Payment Terms & Conditions](#payment-terms--conditions)
8. [User Profile Settings](#user-profile-settings)
9. [Additional Features](#additional-features)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---

## Introduction

Welcome to the **Stanchion CRM Administrator Guide**. This comprehensive manual will guide you through all administrative features of the system, enabling you to effectively manage contacts, create professional quotes and invoices, configure company settings, and streamline your business operations.

### Who Should Use This Guide?

This guide is intended for:
- System administrators
- Business owners
- Financial managers
- Sales managers
- Anyone with administrative access to Stanchion CRM

---

## Getting Started

### System Access

1. Navigate to your Stanchion CRM URL
2. Log in with your administrator credentials
3. You'll be directed to the Dashboard upon successful login

### Navigation

The main navigation menu provides quick access to:
- **Dashboard** - Overview of business performance
- **Leads** - Potential customer management
- **Contacts** - Customer database
- **Quotes** - Sales proposals
- **Invoices** - Billing documents
- **Tasks** - Action items and reminders
- **Settings** - System configuration

---

## Dashboard Overview

The Dashboard provides real-time insights into your business performance.

### Key Performance Indicators (KPIs)

The dashboard displays five critical metrics:

1. **Revenue (This Month)**
   - Shows total revenue from paid invoices in the current month
   - Green indicator shows positive trend

2. **Outstanding Invoices**
   - Total amount due from unpaid/partially paid invoices
   - Red alert appears if outstanding balance exists

3. **Active Deals**
   - Combined value of all sent or draft quotes
   - Indicates potential revenue in pipeline

4. **Deals Won (30 days)**
   - Total value of accepted quotes in the last 30 days
   - Measures recent sales success

5. **Overdue Invoices**
   - Count of invoices past their due date
   - Red alert when overdue invoices exist

### Revenue Trend Chart

- Displays revenue over the last 6 months
- Visualizes month-by-month performance
- Helps identify seasonal trends

### Sales Pipeline

Shows the distribution of quotes across different stages:
- **Draft** - Quotes being prepared
- **Sent** - Quotes sent to clients
- **Accepted** - Quotes approved by clients
- **Rejected** - Declined proposals

Each stage shows:
- Total value
- Number of quotes
- Visual progress bar

### Action Center

Displays tasks categorized by priority:
- **Overdue** - Tasks past their due date (red alert)
- **Due Today** - Tasks requiring immediate attention
- **Upcoming** - Next 5 upcoming tasks

### Recent Activity

Timeline of recent system activities including:
- New contacts created
- Invoices generated
- Quotes sent
- Payments recorded

### Quick Actions

Top-right corner provides shortcuts to:
- Create new lead
- Create quote
- Create invoice

---

## Contact Management

Contacts are the foundation of your CRM. This section manages your customer database.

### Viewing Contacts

**Navigation:** Dashboard → Contacts

The contact list displays:
- Contact name with avatar initial
- Company name (if provided)
- Email address
- Phone number
- Physical address

### Creating a New Contact

1. Click **"Add Contact"** button (top-right)
2. Fill in the contact form:

   **Required Fields:**
   - **Full Name*** - Contact's complete name
   - **Email Address*** - Valid email for communication

   **Optional Fields:**
   - **Phone** - Primary contact number
   - **Company** - Organization name
   - **Address** - Physical or mailing address

3. Click **"Save Contact"**
4. Success notification confirms creation

> **💡 TIP:** Always include accurate email addresses as they're used for sending quotes and invoices.

### Searching Contacts

Use the search bar to filter contacts by:
- Name
- Email address
- Company name

### Generating Client Statements

Each contact card includes a **"Generate Statement"** button:

1. Click **"Generate Statement"** on the desired contact
2. System compiles all invoices for that client
3. PDF statement is automatically downloaded
4. Statement includes:
   - All invoices (paid and unpaid)
   - Payment history
   - Outstanding balance
   - Company branding

> **⚠️ WARNING:** Statement generation requires at least one invoice for the client.

### Viewing Contact Details

Click on a contact name to view:
- Complete contact information
- Associated quotes
- Related invoices
- Payment history
- Activity timeline
- Notes and interactions

---

## Quote Management

Quotes are professional proposals sent to clients before invoicing.

### Creating a Quote

**Navigation:** Dashboard → Quotes → Create Quote

**Step 1: Client & Dates**

1. **Select Client** - Choose from existing contacts
   - If client doesn't exist, create contact first
   - Displays as "Name (Company)"

2. **Date** - Quote creation date (defaults to today)

3. **Valid Until** - Quote expiry date (defaults to 30 days)

**Step 2: Line Items**

Add products or services to the quote:

**Desktop View:**
- Table format with columns:
  - **Description** - Short item name
  - **Details** - Extended description (appears on PDF)
  - **Quantity** - Number of units
  - **Unit Price** - Price per unit
  - **Total** - Calculated automatically (Qty × Price)

**Mobile View:**
- Card-based layout with same fields
- Numeric keyboard for quantities and prices
- Optimized for touch interaction

**Line Item Actions:**
- **Add Row** - Click "+" to add new items
- **Remove Row** - Click trash icon to delete
- Minimum one item required

**Step 3: Review Totals**

The system automatically calculates:
- **Subtotal** - Sum of all line items
- **Tax/VAT** - Applied if enabled in settings (rate from Finance Settings)
- **Grand Total** - Final amount including tax

**Step 4: Save**

- Click **"Create Quote"** to save
- Quote is saved with "Draft" status
- You can edit or generate PDF immediately

### Quote Status Lifecycle

Quotes progress through different statuses:

1. **Draft** (Gray)
   - Initial state after creation
   - Can be edited freely
   - Not yet sent to client

2. **Sent** (Blue)
   - Quote has been sent to client
   - Awaiting client decision

3. **Accepted** (Green)
   - Client approved the quote
   - Ready to convert to invoice

4. **Rejected** (Red)
   - Client declined the quote
   - Archived for records

### Editing a Quote

1. Locate quote in the list
2. Click the **pencil icon** (Edit)
3. Modify any field
4. Click **"Update Quote"**

> **⚠️ WARNING:** Editing a "Sent" quote doesn't automatically notify the client. Send updated PDF manually.

### Generating Quote PDF

1. Find the quote
2. Click **"PDF"** button
3. Professional PDF is generated with:
   - Company logo and details
   - Client information
   - Quote number and dates
   - Itemized line items
   - Totals with tax breakdown
   - Terms and conditions
   - Digital signature (if configured)
4. PDF downloads automatically

### Converting Quote to Invoice

When a client accepts a quote:

1. Locate the accepted quote
2. Click the **arrow icon** (Convert to Invoice)
3. System redirects to Invoice page
4. Quote details pre-populate
5. Adjust dates as needed
6. Click **"Create Invoice"**

> **💡 TIP:** Converting quotes to invoices saves time and ensures accuracy.

---

## Invoice Management

Invoices are official billing documents sent to clients for payment.

### Creating an Invoice

**Navigation:** Dashboard → Invoices → Create Invoice

The invoice creation process is identical to quotes with these differences:

**Date Fields:**
- **Date** - Invoice issue date
- **Due Date** - Payment deadline (defaults to 7 days)

**Initial Status:**
- Invoices start with "Sent" status (ready for payment)

### Invoice Status Types

1. **Sent** (Blue)
   - Invoice issued, awaiting payment
   - No payments recorded yet

2. **Partial** (Amber/Orange)
   - Some payment received
   - Balance still outstanding

3. **Paid** (Green)
   - Fully paid
   - No outstanding balance

4. **Overdue** (Red)
   - Past due date without full payment
   - Requires follow-up action

### Recording Payments

When a client makes a payment:

1. Find the invoice
2. Click the **coins icon** (Record Payment)
3. Fill in payment details:

   - **Amount*** - Payment received
     - Cannot exceed remaining balance
     - Defaults to full outstanding amount
   
   - **Date*** - Payment received date
   
   - **Payment Method*** - Choose from:
     - Bank Transfer (default)
     - Cash
     - Card
     - Other
   
   - **Notes** - Optional reference (transaction ID, check number, etc.)

4. Click **"Record Payment"**

**Automatic Status Updates:**
- If payment equals balance → Status changes to "Paid"
- If payment is partial → Status changes to "Partial"
- All payments are tracked in payment history

> **💡 TIP:** Always record payments immediately to maintain accurate financial records.

### Editing Invoices

1. Click the **pencil icon** on the invoice
2. Modify line items, dates, or client
3. Click **"Update Invoice"**

> **📝 NOTE:** Editing invoices with recorded payments requires caution. Ensure totals remain consistent with payment records.

### Generating Invoice PDF

1. Click **"PDF"** button on the invoice
2. Professional PDF includes:
   - "INVOICE" header
   - Invoice number (first 8 characters, uppercase)
   - Due date prominently displayed
   - Payment status
   - Banking details for payment
   - Payment history (if applicable)
   - Balance due

---

## Settings Configuration

Settings control system-wide configurations. Properly configuring these settings ensures professional, accurate documents.

**Navigation:** Dashboard → Settings

Settings are organized into three tabs:
1. Company Details
2. Finance Details
3. My Profile

---

### Company Details

This section defines your company's identity on all documents.

#### Company Information

**Fields:**

1. **Company Name*** (Required)
   - Your registered business name
   - Appears on all quotes and invoices
   - Example: "Stanchion Technologies Ltd"

2. **Address*** (Required)
   - Complete physical or registered address
   - Multi-line text area
   - Example:
     ```
     123 Business Park
     Harare, Zimbabwe
     ```

3. **Email*** (Required)
   - Primary company email
   - Used for correspondence
   - Example: "info@stanchion.co.zw"

4. **Phone Number*** (Required)
   - Primary contact number
   - Include country code
   - Example: "+263 123 456 789"

5. **Secondary Phone** (Optional)
   - Alternative contact number
   - Example: "+263 987 654 321"

#### Company Logo

**Purpose:** Your logo appears on all PDFs (quotes, invoices, statements)

**Upload Instructions:**

1. Click **"Upload New Logo"** section
2. Click **"Choose File"**
3. Select image file from computer

**Requirements:**
- **Formats:** PNG, JPG, SVG
- **Max Size:** 5MB
- **Recommended:** Transparent PNG for best results
- **Dimensions:** 200-400px wide for optimal display

**Preview:**
- Logo preview shows current uploaded logo
- Update anytime by uploading new file

**Save:**
- Click **"Save Company Settings"** at bottom
- Logo is processed and stored securely
- Immediately available on new PDFs

#### Official Company Seal

**Purpose:** Your official seal appears on the bottom right of all Quotes and Invoices (including Drafts).

**Upload Instructions:**

1. Navigate to **Settings > Company Details**.
2. Scroll to the **Official Company Seal** section.
3. Click the file input to upload your seal image.

**Requirements:**
- **Formats:** PNG, JPG, SVG
- **Important:** Use a transparent PNG for the most professional appearance.
- **Auto-Alignment:** The seal is automatically aligned horizontally with the signatory's signature on the left.

#### Default Signatory

**Purpose:** Defines the text that appears under the signature line on all documents.

**Fields:**
1. **Default Signatory Name:** Usually the CEO or Project Manager.
2. **Default Signatory Position:** Their official title (e.g., "General Manager Construction").

**Combined Block:** These details are combined with the date and signature image to form a professional authorization block.

> **⚠️ IMPORTANT:** After uploading a new logo, you may need to re-generate existing PDFs to see the updated logo.

---

### Finance & Banking Details

This tab configures financial information that appears on invoices.

#### Primary Banking Details

**Fields:**

1. **Bank Name*** (Required)
   - Name of your primary bank
   - Example: "Standard Bank Zimbabwe"

2. **Account Name*** (Required)
   - Registered account holder name
   - Should match business registration
   - Example: "Stanchion Technologies (Pvt) Ltd"

3. **Account No (USD)*** (Required)
   - USD account number
   - Displayed on invoices for international payments
   - Example: "123456789"

4. **Account No (ZWG)** (Optional)
   - Local currency account number
   - For domestic transactions
   - Example: "987654321"

5. **Branch Code** (Optional)
   - Bank branch identifier
   - Example: "001"

6. **SWIFT Code** (Optional)
   - International bank identifier
   - Required for international transfers
   - Example: "SBICZWHX"

#### Secondary Banking Details (Optional)

If you have multiple bank accounts, configure a second set:

- Same fields as primary banking
- Useful for different currencies or backup accounts
- Both sets appear on invoices

#### VAT/Tax Configuration

**Enable Tax:**

1. Check **"Enable VAT/Tax Calculation"** checkbox

2. **Tax Rate (%)** field appears
   - Enter your applicable tax rate
   - Example: "15" for 15% VAT
   - Accepts decimal values (e.g., "14.5")

**Effect:**
- Tax is automatically calculated on all NEW quotes and invoices
- Applied to subtotal before displaying grand total
- Shows as separate line item on PDFs
- Existing quotes/invoices remain unchanged

**Disable Tax:**
- Uncheck the box to stop applying tax
- Useful for tax-exempt businesses

> **📝 NOTE:** Tax settings only affect documents created AFTER enabling. Update existing documents manually if needed.

#### Payment Terms & Conditions

**Default Payment Terms:**
- Displayed on all invoices
- Standard payment deadline
- Example: "Net 30 days" or "Due upon receipt"
- Helps set client expectations

**Terms and Conditions*** (Required)

- Large text area for your legal terms
- Appears on every quote and invoice PDF
- Include:
  - Payment requirements
  - Late payment penalties
  - Dispute resolution process
  - Warranty information
  - Liability limitations

**Example Terms:**
```
1. Payment is due within 30 days of invoice date.
2. Late payments may incur a 2% monthly interest charge.
3. All prices are in USD unless otherwise stated.
4. Goods remain the property of Stanchion Technologies until full payment is received.
5. Any disputes must be resolved under the laws of Zimbabwe.
```

**Save:**
- Click **"Save Finance Settings"** at bottom
- All fields saved simultaneously
- Confirmation notification appears

---

### User Profile Settings

**Navigation:** Settings → My Profile

This section manages YOUR personal information used on documents.

#### Personal Information

**Fields:**

1. **First Name**
   - Your given name
   - Example: "John"

2. **Last Name**
   - Your surname
   - Example: "Muzata"

3. **Position / Job Title**
   - Your role in the company
   - Appears on signed documents
   - Example: "Sales Manager" or "CEO"

4. **Email** (Read Only)
   - Your login email
   - Cannot be changed here
   - Displays for reference

**Save:**
- Click **"Save Details"** (green button)
- Information updated for future documents

#### Digital Signature

Professional documents can include your digital signature.

**Purpose:**
- Adds authenticity to quotes and invoices
- Shows client who authorized the document
- Appears at bottom of PDFs with your name and position

**Adding a Signature:**

You have two options:

**Option 1: Draw Signature**

1. Click **"Draw Signature"** tab
2. Use mouse or touchscreen to sign
3. Sign in the white canvas area
4. Click **"Clear"** to restart if needed
5. Click **"Save Signature"** when satisfied

**Option 2: Upload Image**

1. Click **"Upload Image"** tab
2. Click the file input or drag & drop
3. Select image file:
   - **Formats:** PNG, JPG
   - **Max Size:** 2MB
   - **Recommended:** Scan of physical signature on white paper
4. Image uploads and saves automatically

**Viewing Your Signature:**

Once saved:
- Signature preview appears in a white box
- Maximum height: 32px (automatically scaled)

**Removing Signature:**

1. Click **"Remove Signature"** (red button)
2. Confirm deletion
3. Signature removed from future documents

> **💡 TIP:** For best results, use a black pen on white paper, scan at high resolution, and crop tightly around the signature.

---

## Additional Features

### Lead Management

**Leads** are potential customers not yet in your contact database.

**Creating Leads:**
1. Navigate to Leads page
2. Click "Add Lead"
3. Capture basic information
4. Track conversion status

**Converting Leads to Contacts:**
- When lead becomes client, convert to contact
- Preserves all interaction history

### Task Management

**Tasks** help you track action items and follow-ups.

**Task Features:**
- Due dates with calendar reminders
- Priority levels
- Status tracking (To Do, In Progress, Done)
- Assignment to specific contacts
- Dashboard alerts for overdue tasks

**Creating Tasks:**
1. Go to Tasks page
2. Click "Add Task"
3. Fill in:
   - Title
   - Description
   - Due Date
   - Priority
   - Related contact (optional)

### Client Statements

**Purpose:** Provide clients with complete account history

**Generating Statements:**
1. Go to Contacts
2. Find client
3. Click "Generate Statement"
4. PDF includes:
   - All invoices (paid and unpaid)
   - Payment history
   - Current balance
   - Company branding

**Use Cases:**
- Monthly account reconciliation
- Year-end summaries
- Dispute resolution

---

## Best Practices

### Contact Management
✅ **DO:**
- Keep contact information updated
- Use consistent naming conventions
- Add company names where applicable
- Include complete addresses for shipping/billing

❌ **DON'T:**
- Create duplicate contacts
- Leave email fields blank
- Use personal emails for business contacts

### Quote & Invoice Creation
✅ **DO:**
- Use detailed item descriptions
- Include long descriptions for clarity
- Double-check calculations
- Review before sending to client
- Keep consistent numbering

❌ **DON'T:**
- Forget to add all items
- Use vague descriptions
- Edit sent invoices without documenting changes
- Skip recording payments

### Settings Configuration
✅ **DO:**
- Complete all company settings before first use
- Upload high-quality logo
- Review terms and conditions with legal counsel
- Update banking details when accounts change
- Enable tax if legally required

❌ **DON'T:**
- Leave required fields empty
- Use incorrect tax rates
- Forget to save after changes
- Share banking details outside system

### Document Management
✅ **DO:**
- Generate PDFs before sending to clients
- Keep digital copies of all documents
- Follow up on overdue invoices
- Record payments promptly

❌ **DON'T:**
- Rely solely on system for backups
- Delete invoices with payment history
- Assume clients received documents

### Document Layout & Alignment

**Unified Footer Band:**
To ensure a professional and clean appearance, the system uses a "Unified Footer" logic:
- The **Signature** (Left) and **Seal** (Right) are locked to the same vertical line.
- The system calculates the lowest point of your banking details and terms, then places both elements exactly **6mm** below that point.
- This creates a balanced "band" at the bottom of the document.

**Smart Page Breaks:**
If your banking details take up too much space, the system will automatically move the *entire* footer block (Signature + Seal) to the next page to prevent them from being cut off.

---

## Troubleshooting

### Common Issues

#### "Failed to load settings"

**Cause:** Network connectivity or permissions issue

**Solution:**
1. Check internet connection
2. Refresh the page
3. Log out and log back in
4. Clear browser cache
5. Contact support if persists

#### Logo Not Appearing on PDFs

**Cause:** Logo upload failed or unsupported format

**Solution:**
1. Verify logo uploaded successfully (preview shows in Settings)
2. Check file format (PNG, JPG, SVG only)
3. Ensure file size under 5MB
4. Try uploading again
5. Use PNG format for best results

#### Tax Not Calculating

**Cause:** Tax not enabled or invoice created before enabling

**Solution:**
1. Go to Settings → Finance Details
2. Ensure "Enable VAT/Tax Calculation" is checked
3. Verify tax rate is entered
4. Save settings
5. Tax only applies to NEW documents after enabling

#### Signature Not Showing on Documents

**Cause:** User profile incomplete or signature not saved

**Solution:**
1. Go to Settings → My Profile
2. Verify First Name, Last Name, and Position are filled
3. Check signature is uploaded/drawn and saved
4. Signature preview should appear
5. Generate new PDF to see signature

#### Cannot Record Payment

**Cause:** Payment amount exceeds remaining balance

**Solution:**
1. Check invoice total and existing payments
2. Ensure payment amount ≤ remaining balance
3. If overpayment, split into multiple invoices or issue credit note

#### Quote/Invoice Not Saving

**Cause:** Required fields missing or network error

**Solution:**
1. Ensure client is selected
2. Verify at least one line item exists
3. Check dates are valid
4. Review error messages
5. Try again with stable internet

---

## Support & Resources

### Getting Help

If you encounter issues not covered in this guide:

1. **Check Dashboard** - Recent Activity may show error details
2. **Review Browser Console** - Technical errors appear here (F12)
3. **Contact Support** - Include:
   - Description of issue
   - Steps to reproduce
   - Screenshots (if applicable)
   - Your role/access level

### System Information

- **Version:** Stanchion CRM v1.3.0 (Dynamic Seal Update)
- **Platform:** Web-based (accessible via modern browsers)
- **Supported Browsers:** Chrome, Firefox, Safari, Edge (latest versions)
- **Mobile:** Responsive design optimized for tablets and phones

### Security Notes

- **Data Storage:** All data stored securely in encrypted database
- **Access Control:** Role-based permissions
- **Backups:** Automatic daily backups
- **Password Requirements:** Strong passwords recommended
- **Session Timeout:** Auto-logout after inactivity

---

## Appendix

### Keyboard Shortcuts

- **Ctrl/Cmd + S** - Save current form (if applicable)
- **Esc** - Close modal windows
- **Tab** - Navigate between form fields

### Field Validation Rules

- **Email:** Must be valid format (user@domain.com)
- **Phone:** Accepts international formats
- **Dates:** YYYY-MM-DD format
- **Numbers:** Decimal values accepted for prices
- **Tax Rate:** 0-100 percentage

### Document Numbering

- **Quotes:** Auto-generated unique IDs (8-character uppercase)
- **Invoices:** Auto-generated unique IDs (8-character uppercase)
- **Format:** Displayed as "#AB12CD34"

---

## Conclusion

This guide covers all essential administrative functions of Stanchion CRM. Regular use of these features will streamline your business operations, improve cash flow management, and enhance client communications.

For the latest updates and feature releases, check the version number at the bottom of the Settings page.

**Happy CRM-ing! 🚀**

---

*Document Version: 1.1*  
*Last Updated: February 2026 (Added Dynamic Seal & Signatory Guidelines)*  
*© Stanchion Technologies. All rights reserved.*
