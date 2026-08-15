# apm-crash-monitor-serverless

A serverless Application Performance Monitoring (APM) and crash monitoring backend built entirely on Cloudflare Workers and Cloudflare D1. Fully compatible with the official Sentry SDK protocol (`sentry-php` ^4.x, Sentry JavaScript, and Cloudflare Workers).

---

## Overview

`apm-crash-monitor-serverless` provides a lightweight, zero-maintenance alternative to self-hosted error tracking systems. It runs at the edge using Cloudflare Workers and stores relational crash data and APM traces in Cloudflare D1 (edge SQLite).

### Key Capabilities

- **Sentry Ingestion Protocol Compatibility**: Implements standard Sentry envelope and event ingestion endpoints (`/api/:projectId/envelope/`, `/api/:projectId/store/`, `/api/envelope/`). Works out of the box with standard Sentry DSN configurations.
- **Crash Grouping & Fingerprinting**: Groups unhandled exceptions and crashes into issue threads using deterministic SHA-256 fingerprinting based on exception type, topmost in-app stack frame, and culprit.
- **Stack Trace & Context Inspection**: Captures stack traces with source code snippet lines (pre/context/post context), chronologically ordered breadcrumbs, user context, runtime metadata (PHP version, OS, server), and superglobals.
- **APM Performance Tracing**: Ingests Sentry transactions and child spans (database queries, external HTTP requests, cache hits) with duration tracking and latency metrics (p50/p95).
- **Built-in Web Dashboard**: Fast single-page application served directly by the Cloudflare Worker. Includes an interactive stack trace viewer, breadcrumbs timeline, waterfall flamegraph for APM traces, and project management.
- **Environment-based Authentication**: Secured with administrator credentials configured via environment variables / Worker secrets and verified using signed JWT session cookies.

---

## Architecture

```
+---------------------------------------------------------------------------------------+
|                                    Client Applications                                |
|  [ PHP App (sentry/sentry ^4.x) ]   [ JS / Browser SDK ]   [ Cloudflare Workers SDK ] |
+-------------------------------------------+-------------------------------------------+
                                            | Sentry Envelopes / Store POST
                                            v
+---------------------------------------------------------------------------------------+
|                       Cloudflare Worker (Hono REST & Ingestion Engine)               |
|                                                                                       |
|   /api/:projectId/envelope/  --> [ Sentry Envelope Parser ]                           |
|   /api/:projectId/store/     --> [ Sentry Event Normalizer ]                          |
|                                      |                                                |
|                     +----------------+----------------+                               |
|                     |                                 |                               |
|                     v                                 v                               |
|           [ Crash Engine (Issues) ]        [ APM Engine (Spans) ]                     |
|           - Fingerprinting & Grouping      - Transactions & Traces                    |
|           - Stacktrace extraction          - Span Waterfall Timeline                  |
|           - Breadcrumbs & Tags             - Latency percentiles (p50/p95)            |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
|                              Cloudflare D1 Database (SQLite)                          |
|   - projects       - issues            - events           - exceptions                |
|   - breadcrumbs    - transactions      - spans            - tag_values                |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
|                    Dashboard & Admin Interface (Cloudflare Worker UI)                 |
|   - Real-time Error Feed & Issue Detail with interactive Stacktrace                   |
|   - Breadcrumbs timeline & Environment inspector (PHP runtime, headers, user context) |
|   - APM Performance Explorer with Span Waterfall Flamegraph                           |
|   - Project Manager & DSN Generator with copy-ready Sentry-PHP integration code       |
|   - Basic / JWT Session Auth configured via .env / Worker Secrets                     |
+---------------------------------------------------------------------------------------+
```

---

## Quick Start

### 1. Prerequisites

- Node.js 20+
- npm 10+
- (Optional) Cloudflare account for production deployment

### 2. Installation

```bash
git clone https://github.com/mcontartesi/apm-crash-monitor-serverless.git
cd apm-crash-monitor-serverless
npm install
```

### 3. Environment Configuration

Copy `.env.example` to `.dev.vars` for local development:

```bash
cp .env.example .dev.vars
```

Update the configuration values:
```ini
ADMIN_USER=admin
ADMIN_PASSWORD=change-me-to-a-secure-password
JWT_SECRET=super-secret-jwt-key-minimum-32-characters-long
APP_NAME=apm-crash-monitor-serverless
APP_ENV=development
```

### 4. Initialize Local D1 Database

```bash
npm run d1:init-local
```

### 5. Start Development Server

```bash
npm run dev
```

The dashboard will be available at `http://localhost:8787`. Log in using your configured credentials.

---

## PHP Integration (`sentry/sentry` ^4.x)

### 1. Install Sentry PHP

```bash
composer require sentry/sentry:^4.0
```

### 2. Initialize in PHP Application

```php
<?php

require_once __DIR__ . '/vendor/autoload.php';

\Sentry\init([
    'dsn' => 'https://4a8c9b2e1f0d3a7e5b6c8a9d0e1f2a3b@your-worker.workers.dev/proj_default_php',
    'traces_sample_rate' => 1.0,
    'profiles_sample_rate' => 1.0,
    'environment' => 'production',
    'release' => 'my-app@1.0.0',
]);

// Set user context and tags
\Sentry\configureScope(function (\Sentry\State\Scope $scope): void {
    $scope->setUser([
        'id' => 'usr_1001',
        'email' => 'admin@company.com',
        'username' => 'sysadmin'
    ]);
    $scope->setTag('php_version', PHP_VERSION);
});
```

### 3. Performance Tracing (APM Waterfall Spans)

```php
// 1. Start root transaction
$transactionContext = new \Sentry\Tracing\TransactionContext();
$transactionContext->setName('POST /api/v1/checkout');
$transactionContext->setOp('http.server');
$transaction = \Sentry\startTransaction($transactionContext);

// 2. Add child span for database operation
$dbSpanContext = new \Sentry\Tracing\SpanContext();
$dbSpanContext->setOp('db.sql.query');
$dbSpanContext->setDescription('SELECT balance FROM accounts WHERE user_id = :id');
$dbSpan = $transaction->startChild($dbSpanContext);

// Execute query...
usleep(25000); // 25ms
$dbSpan->finish();

// 3. Add child span for external payment gateway call
$httpSpanContext = new \Sentry\Tracing\SpanContext();
$httpSpanContext->setOp('http.client');
$httpSpanContext->setDescription('POST https://api.stripe.com/v1/charges');
$httpSpan = $transaction->startChild($httpSpanContext);

// Execute HTTP request...
usleep(60000); // 60ms
$httpSpan->finish();

// 4. Finish parent transaction
$transaction->finish();
```

---

## Testing

Run the automated test suite with Vitest:

```bash
npm test
```

### Test Coverage

- **Sentry Envelope Parser**: Decodes newline-delimited multi-part streams (`\n`).
- **Fingerprinting Engine**: SHA-256 deterministic exception and stack frame grouping.
- **Normalizer**: Stack frame context extraction, breadcrumbs formatting, and APM span duration calculations.
- **Auth & DSN**: Sentry header parsing (`X-Sentry-Auth`), query parameter fallbacks, and JWT validation.
- **Ingestion Endpoints**: Route validation and standard Sentry response verification.

---

## Production Deployment

### 1. Create Cloudflare D1 Database

```bash
npx wrangler d1 create flarepulse-db
```

### 2. Configure `wrangler.jsonc`

Update `wrangler.jsonc` with the returned `database_id`:

```json
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "flarepulse-db",
    "database_id": "<your-d1-database-id>"
  }
]
```

### 3. Apply D1 Database Migrations

```bash
npm run d1:init-remote
```

### 4. Set Production Secrets

```bash
npx wrangler secret put ADMIN_USER
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put JWT_SECRET
```

### 5. Deploy Worker

```bash
npm run deploy
```

---

## Project Structure

```
apm-crash-monitor-serverless/
├── deploy/
│   └── workflows/
│       └── deploy.yml            # CI/CD deployment workflow
├── schema/
│   └── schema.sql                # Cloudflare D1 SQL schema and indices
├── src/
│   ├── index.ts                  # Main Worker entry point (Hono router)
│   ├── config.ts                 # Configuration manager
│   ├── types/
│   │   └── index.ts              # TypeScript definitions
│   ├── db/
│   │   └── client.ts             # D1 database client and queries
│   ├── sentry/
│   │   ├── auth.ts               # Sentry DSN & auth parser
│   │   ├── envelope.ts           # Sentry envelope parser
│   │   ├── fingerprint.ts        # Crash fingerprinting and grouping
│   │   └── normalizer.ts         # Event and APM trace normalizer
│   ├── api/
│   │   ├── auth.ts               # Admin auth routes & JWT session handling
│   │   ├── ingest.ts             # Sentry ingestion endpoints (/envelope, /store)
│   │   ├── issues.ts             # Issues REST API
│   │   ├── performance.ts        # APM performance REST API
│   │   ├── projects.ts           # Projects REST API & DSN generation
│   │   └── stats.ts              # KPI statistics REST API
│   └── ui/
│       └── html.ts               # Built-in dashboard SPA
├── examples/
│   └── php-app/
│       ├── composer.json         # sentry/sentry ^4.0 dependencies
│       ├── test-sentry.php       # PHP test and verification script
│       └── README.md             # PHP integration guide
├── test/                         # Vitest test suite
├── wrangler.jsonc                # Cloudflare configuration
├── tsconfig.json                 # TypeScript compiler configuration
└── package.json                  # Dependencies and scripts
```

---

## License

MIT License. See [LICENSE](LICENSE) for details.
