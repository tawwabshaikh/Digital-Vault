# Digital Vault

Digital Vault is a browser-based personal organizer for credentials, online accounts, subscriptions, and important documents. It provides a dashboard for reviewing stored items, subscription costs and renewals, and password-strength indicators.

> **Security status:** This project is currently a client-side prototype. Application data is stored in the browser's `localStorage`. Credential passwords and uploaded document data are not encrypted at rest by the current storage implementation. Do not use it to store real passwords, financial details, identity documents, or other sensitive information until the storage and encryption model has been reviewed and hardened.

## Features

- **Credential vault:** Add, edit, search, categorize, favorite, reveal, and copy credentials. Includes a password generator and password-strength indicators.
- **Account inventory:** Keep track of online accounts, account status, categories, notes, tags, and linked credentials.
- **Subscription tracking:** Record plans, prices, billing cycles, trial dates, renewal dates, payment methods, and reminders. View estimated monthly and yearly costs and upcoming renewals.
- **Document organizer:** Upload and organize documents, receipts, invoices, contracts, licenses, warranties, certificates, and other files. Link documents to accounts or subscriptions.
- **Dashboard:** Review inventory totals, recent activity, password health, spending, and upcoming subscription renewals.
- **Security overview:** See password-strength findings, reused or old passwords, and accounts without 2FA where available.
- **Notifications:** Generate in-app alerts for upcoming renewals and trials ending soon.
- **Import and export:** Import credential or subscription rows from CSV. Download a CSV export or an encrypted JSON backup using the master key. The current backup export omits uploaded document file contents.
- **Preferences:** Configure theme, currency, notifications, and vault auto-lock timeout.
- **Responsive interface:** Desktop and mobile layouts, global search, dark and light themes, and onboarding flow.

## Technology

- React 18 and TypeScript
- Vite
- React Router
- Tailwind CSS
- Web Crypto API for PBKDF2 key derivation and AES-GCM encryption helpers
- Recharts for dashboard and subscription charts
- Lucide icons, Framer Motion, and dnd-kit

## Requirements

- Node.js 18 or newer
- npm

## Getting started

```bash
git clone https://github.com/tawwabshaikh/Digital-Vault.git
cd Digital-Vault
npm install
npm run dev
```

Vite serves the development app at [http://localhost:3000](http://localhost:3000).

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server on port 3000. |
| `npm run build` | Create a production build in `dist/`. |
| `npm run typecheck` | Run the TypeScript compiler without emitting files. |

## Project structure

```text
src/
├── components/       Shared UI, layout, and error boundary
├── context/          Authentication and vault state
├── lib/
│   ├── crypto.ts     Cryptographic helpers and password utilities
│   ├── store.ts      Browser localStorage data access
│   └── types.ts      Shared TypeScript data models
├── pages/            Auth, onboarding, dashboard, vault, accounts,
│                     subscriptions, documents, security, and settings
├── App.tsx           Routes and protected-route handling
├── index.css         Global styles
└── main.tsx          React application entry point
```

## How data is stored

The application currently uses browser `localStorage` with keys prefixed by `dv_`. There is no server-side API or cloud synchronization in this repository. Data is tied to the browser profile and origin where it was created; clearing browser storage can remove it.

The source includes PBKDF2/AES-GCM helpers and an encrypted backup download. These helpers do not currently encrypt credential records or document contents before they are written by the local storage layer. The vault lock controls access in the UI, but it should not be treated as protection against someone who can inspect browser storage or run code in the page.

## Security and privacy

This README describes the behavior visible in the current source code; it is not a security audit. For safe experimentation, use synthetic data only. Before using this project as a real password manager, it needs a reviewed design for encrypting all sensitive data before persistence, secure key verification and recovery, backup/import completeness, and protection against malicious scripts running in the app's origin.

## Current limitations

- Data is local to one browser and is not synchronized between devices.
- Credential and document records are stored in browser storage without at-rest encryption.
- The encrypted backup currently includes credentials, accounts, subscriptions, and document metadata; document file contents are omitted.
- CSV import supports credentials and subscriptions; it is a basic parser and is not intended for arbitrary CSV formats.
- No automated test script is currently configured in `package.json`.

## License

No license file is currently included. Unless a license is added to the repository, standard copyright restrictions apply.
