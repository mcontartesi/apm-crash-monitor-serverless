<?php

declare(strict_types=1);

/**
 * ============================================================================
 * FlarePulse APM - PHP Integration & Test Script
 * Demonstrates sentry/sentry ^4.x Crash Reporting & APM Tracing on Cloudflare
 * ============================================================================
 */

require_once __DIR__ . '/vendor/autoload.php';

// Retrieve DSN from environment or use local FlarePulse APM default
$dsn = getenv('SENTRY_DSN') ?: 'https://4a8c9b2e1f0d3a7e5b6c8a9d0e1f2a3b@localhost:8787/proj_default_php';

echo "\n=======================================================\n";
echo "apm-crash-monitor-serverless - Sentry PHP SDK Integration Test\n";
echo "=======================================================\n";
echo "Target DSN: {$dsn}\n\n";

// 1. Initialize Sentry SDK
\Sentry\init([
    'dsn' => $dsn,
    'traces_sample_rate' => 1.0,
    'profiles_sample_rate' => 1.0,
    'environment' => 'production',
    'release' => 'php-api@1.0.0',
    'server_name' => gethostname() ?: 'php-worker-01',
]);

// 2. Set User & Context Tags
\Sentry\configureScope(function (\Sentry\State\Scope $scope): void {
    $scope->setUser([
        'id' => 'usr_981723',
        'email' => 'developer@company.com',
        'username' => 'alex_dev',
        'ip_address' => '192.168.1.50',
    ]);

    $scope->setTag('php_version', PHP_VERSION);
    $scope->setTag('framework', 'vanilla-php');
    $scope->setTag('region', 'us-east-cloudflare');
    $scope->setExtra('memory_limit', ini_get('memory_limit'));
});

// 3. Record Breadcrumbs
\Sentry\addBreadcrumb(new \Sentry\Breadcrumb(
    \Sentry\Breadcrumb::LEVEL_INFO,
    \Sentry\Breadcrumb::TYPE_HTTP,
    'http',
    'POST /api/v1/checkout - Payment payload received',
    ['amount' => 129.99, 'currency' => 'USD']
));

\Sentry\addBreadcrumb(new \Sentry\Breadcrumb(
    \Sentry\Breadcrumb::LEVEL_INFO,
    \Sentry\Breadcrumb::TYPE_DEFAULT,
    'db.query',
    'MySQL Query: SELECT balance FROM accounts WHERE user_id = :id',
    ['user_id' => 'usr_981723', 'execution_time_ms' => 12.4]
));

// 4. APM Performance: Start Transaction & Child Spans
echo "[1/2] Starting APM Transaction 'POST /api/v1/checkout'...\n";
$transactionContext = new \Sentry\Tracing\TransactionContext();
$transactionContext->setName('POST /api/v1/checkout');
$transactionContext->setOp('http.server');
$transaction = \Sentry\startTransaction($transactionContext);

// Child Span: Database Query
$dbSpanContext = new \Sentry\Tracing\SpanContext();
$dbSpanContext->setOp('db.sql.query');
$dbSpanContext->setDescription('SELECT * FROM inventory WHERE sku = "SKU-9821" FOR UPDATE');
$dbSpan = $transaction->startChild($dbSpanContext);
usleep(25000); // 25ms simulated DB work
$dbSpan->finish();

// Child Span: External Payment Gateway HTTP Call
$httpSpanContext = new \Sentry\Tracing\SpanContext();
$httpSpanContext->setOp('http.client');
$httpSpanContext->setDescription('POST https://api.stripe.com/v1/charges');
$httpSpan = $transaction->startChild($httpSpanContext);
usleep(60000); // 60ms simulated HTTP call
$httpSpan->finish();

// Finish root transaction
$transaction->finish();
echo "  -> APM Transaction finished with 2 spans.\n";

// 5. Trigger Crash / Exception Report
echo "[2/2] Triggering PHP Exception to test Crash Reporting...\n";

try {
    throw new \RuntimeException(
        "Payment authorization failed: Insufficient funds on external card gateway [Error Code: 4002]",
        500
    );
} catch (\Throwable $e) {
    $eventId = \Sentry\captureException($e);
    echo "  -> Captured Exception ID: {$eventId}\n";
}

// Flush queue to Cloudflare Worker
$client = \Sentry\SentrySdk::getCurrentHub()->getClient();
if ($client) {
    echo "\nFlushing events to apm-crash-monitor-serverless Worker...\n";
    $client->flush();
    echo "Events and transactions sent to apm-crash-monitor-serverless.\n";
    echo "Dashboard URL: http://localhost:8787/\n\n";
}
