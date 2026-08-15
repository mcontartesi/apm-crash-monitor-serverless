-- ==============================================================================
-- FlarePulse APM - Cloudflare D1 Database Schema
-- Optimized for Edge SQLite, Sentry Ingestion, Crash Analysis & APM Performance
-- ==============================================================================

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    platform TEXT NOT NULL DEFAULT 'php',
    public_key TEXT UNIQUE NOT NULL,
    secret_key TEXT,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_public_key ON projects(public_key);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);

-- Issues (Aggregated Crash Threads based on Fingerprint)
CREATE TABLE IF NOT EXISTS issues (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    title TEXT NOT NULL,
    culprit TEXT,
    type TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'error',
    status TEXT NOT NULL DEFAULT 'unresolved', -- 'unresolved', 'resolved', 'ignored'
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    events_count INTEGER NOT NULL DEFAULT 1,
    user_count INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_issues_proj_fingerprint ON issues(project_id, fingerprint);
CREATE INDEX IF NOT EXISTS idx_issues_proj_status_last_seen ON issues(project_id, status, last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_issues_last_seen ON issues(last_seen DESC);

-- Individual Crash Events
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY, -- Sentry event_id (32 hex characters)
    issue_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    platform TEXT NOT NULL DEFAULT 'php',
    environment TEXT DEFAULT 'production',
    release TEXT,
    server_name TEXT,
    message TEXT,
    user_json TEXT,       -- { id, email, ip_address, username }
    tags_json TEXT,       -- { env: 'production', php_version: '8.3', ... }
    contexts_json TEXT,   -- { os: {...}, runtime: { name: 'php', version: '8.3' } }
    request_json TEXT,    -- { url, method, headers, query_string, data }
    created_at INTEGER NOT NULL,
    FOREIGN KEY(issue_id) REFERENCES issues(id) ON DELETE CASCADE,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_events_issue_timestamp ON events(issue_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_proj_timestamp ON events(project_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);

-- Exceptions & Stacktraces for Events
CREATE TABLE IF NOT EXISTS exceptions (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    type TEXT NOT NULL,
    value TEXT NOT NULL,
    module TEXT,
    stacktrace_json TEXT NOT NULL, -- Array of frames with file, line, function, snippets
    FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_exceptions_event_id ON exceptions(event_id);

-- Breadcrumbs leading to the crash
CREATE TABLE IF NOT EXISTS breadcrumbs (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    category TEXT,
    level TEXT,
    type TEXT,
    message TEXT,
    data_json TEXT,
    FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_breadcrumbs_event_id ON breadcrumbs(event_id, timestamp ASC);

-- APM Performance: Transactions (Root Traces)
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY, -- Sentry event_id for transaction
    project_id TEXT NOT NULL,
    trace_id TEXT NOT NULL,
    span_id TEXT NOT NULL,
    name TEXT NOT NULL,
    op TEXT NOT NULL DEFAULT 'http.server',
    status TEXT,
    environment TEXT DEFAULT 'production',
    start_timestamp REAL NOT NULL,
    timestamp REAL NOT NULL,
    duration_ms REAL NOT NULL,
    tags_json TEXT,
    contexts_json TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transactions_proj_start ON transactions(project_id, start_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_trace_id ON transactions(trace_id);
CREATE INDEX IF NOT EXISTS idx_transactions_name ON transactions(project_id, name, duration_ms DESC);

-- APM Performance: Child Spans (Database, HTTP calls, caching, rendering)
CREATE TABLE IF NOT EXISTS spans (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    trace_id TEXT NOT NULL,
    span_id TEXT NOT NULL,
    parent_span_id TEXT,
    op TEXT NOT NULL,
    description TEXT,
    status TEXT,
    start_timestamp REAL NOT NULL,
    timestamp REAL NOT NULL,
    duration_ms REAL NOT NULL,
    data_json TEXT,
    FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_spans_tx_start ON spans(transaction_id, start_timestamp ASC);
CREATE INDEX IF NOT EXISTS idx_spans_trace_id ON spans(trace_id);

-- Default Demo Project Seed
INSERT OR IGNORE INTO projects (id, name, slug, platform, public_key, secret_key, created_at)
VALUES (
    'proj_default_php',
    'PHP Production App',
    'php-production-app',
    'php',
    '4a8c9b2e1f0d3a7e5b6c8a9d0e1f2a3b',
    '8f7e6d5c4b3a2019e8d7c6b5a4f3e2d1',
    1700000000
);
