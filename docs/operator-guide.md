# CSC Center Billing Software - Operator Guide

Welcome to the CSC Center Billing Software. This guide provides a quick overview for center operators and staff to handle daily tasks efficiently.

## 1. Getting Started

- **Login**: Use your Admin or Staff PIN to log in.
- **Offline First**: The app works perfectly without an active internet connection. All data is securely stored on your local computer.

## 2. Creating Invoices

1. Click **New Invoice** from the Top Bar or sidebar, or press `Ctrl + N`.
2. **Select or Create Customer**: Type the customer's mobile number. If they don't exist, you can add their name on the fly.
3. **Add Services**: Select the services rendered (e.g., Passport Service, PAN Card application).
4. **Checkout**: 
   - Enter the amount paid.
   - (Optional) If the customer pays partially, the balance will be recorded as pending dues.
5. **Print**: Click `Print Thermal` for a small receipt or `Print A4` for a full invoice.

## 3. Customer Document Vault

You can securely store customer documents (e.g., Aadhaar copies) locally.

1. Go to **Customers** and click on a customer's profile.
2. Under the **Document Vault**, drag and drop any PDF or image.
3. Documents are kept entirely offline on your computer unless Cloud Sync is explicitly configured.

## 4. Reports and Analytics

The **Analytics Dashboard** provides real-time insights into center operations.
- View total revenue collected today.
- Track pending dues from customers.
- Monitor which services are most popular.

## 5. Security & Access

- **Admin vs Staff**: Only Admins can delete invoices, remove customers, and access system settings.
- **Audit Logs**: Every action (like generating an invoice or updating a payment) is securely logged and can be reviewed by the Center Admin in the Settings panel.

## 6. Cloud Sync (Optional)

If your Admin has configured Cloud Sync, the app will periodically snapshot your entire database and upload it to a secure cloud bucket (AES-256 encrypted).
- Look at the **Cloud Icon** in the top bar.
- **Green**: Synced recently.
- **Orange**: Offline or Sync Pending.
