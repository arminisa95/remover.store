# backgroundRemover – AI Background Remover

Entferne Hintergründe aus Bildern mit KI – direkt im Browser. Pay-per-use mit Stripe.

## Setup

### 1. Dependencies installieren

```bash
npm install
```

### 2. Datenbank einrichten

```bash
npx prisma generate
npx prisma migrate dev
```

### 3. Stripe einrichten

1. Erstelle einen Account auf [stripe.com](https://stripe.com)
2. Gehe zu **Developers → API Keys**
3. Trage die Keys in `.env` ein:

```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

4. Für Webhooks (Stripe CLI oder Dashboard):
   - Endpoint: `https://deine-domain.de/api/webhook`
   - Events: `checkout.session.completed`
   - Trage das Webhook-Secret in `.env` ein:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 4. NextAuth Secret setzen

Generiere ein sicheres Secret:

```bash
openssl rand -base64 32
```

Trage es in `.env` ein:

```env
NEXTAUTH_SECRET=dein-generiertes-secret
NEXTAUTH_URL=http://localhost:3000
```

### 5. Dev-Server starten

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000) im Browser.

## Preismodell

- 1 Credit = 1 Hintergrund-Entfernung = 0,25 €
- Credit-Pakete: 1 / 5 / 20 / 50 Credits
- Zahlungsmethoden: Kreditkarte, Debitkarte, Google Pay, Apple Pay, PayPal

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **@imgly/background-removal** (Client-side WASM AI)
- **Prisma + SQLite** (Datenbank)
- **NextAuth.js** (Authentifizierung)
- **Stripe** (Zahlungen)
- **TailwindCSS** (Styling)
