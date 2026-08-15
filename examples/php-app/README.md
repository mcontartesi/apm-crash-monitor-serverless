# PHP Integration Guide

This directory provides a working example of how to connect a PHP application (Laravel, Symfony, WordPress, or Vanilla PHP) to **apm-crash-monitor-serverless** using the official [`sentry/sentry`](https://github.com/getsentry/sentry-php) library (^4.x).

---

## Quick Start

### 1. Install Dependencies
```bash
composer install
```

### 2. Configure DSN
Obtain your project DSN from the dashboard (e.g. `https://<public_key>@<your-worker-domain>/<project_id>`) and export it as an environment variable:

```bash
export SENTRY_DSN="https://4a8c9b2e1f0d3a7e5b6c8a9d0e1f2a3b@localhost:8787/proj_default_php"
```

### 3. Run the Test Script
```bash
php test-sentry.php
```

---

## PHP Application Integration

### Crash & Exception Reporting
Add the initialization code to your bootstrap file or `index.php`:

```php
require_once __DIR__ . '/vendor/autoload.php';

\Sentry\init([
    'dsn' => 'https://<key>@<your-worker-domain>/<project_id>',
    'traces_sample_rate' => 1.0,
    'environment' => 'production',
    'release' => 'my-app@1.0.0'
]);

// Any unhandled exceptions or fatal errors will automatically be sent to apm-crash-monitor-serverless
```

### Performance Monitoring (APM Tracing)
Trace HTTP routes, database queries, and external APIs:

```php
// 1. Start Root Transaction
$transactionContext = new \Sentry\Tracing\TransactionContext();
$transactionContext->setName('GET /api/v1/users');
$transactionContext->setOp('http.server');
$transaction = \Sentry\startTransaction($transactionContext);

// 2. Add Child Spans (e.g. MySQL Query)
$spanContext = new \Sentry\Tracing\SpanContext();
$spanContext->setOp('db.sql.query');
$spanContext->setDescription('SELECT id, email FROM users WHERE status = "active"');
$span = $transaction->startChild($spanContext);

// Run your database query...
$dbResult = $db->query('SELECT id, email FROM users WHERE status = "active"');

// Finish child span
$span->finish();

// 3. Finish Transaction
$transaction->finish();
```

### User Context & Breadcrumbs

```php
// Set user context
\Sentry\configureScope(function (\Sentry\State\Scope $scope): void {
    $scope->setUser([
        'id' => '12345',
        'email' => 'user@domain.com',
        'username' => 'john_doe',
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
    ]);
});

// Add custom breadcrumbs
\Sentry\addBreadcrumb(new \Sentry\Breadcrumb(
    \Sentry\Breadcrumb::LEVEL_INFO,
    \Sentry\Breadcrumb::TYPE_HTTP,
    'http',
    'Calling payment gateway'
));
```
