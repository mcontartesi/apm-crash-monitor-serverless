/**
 * apm-crash-monitor-serverless - Embedded Web Dashboard
 * Clean, dark UI served directly by Cloudflare Worker
 */

export function renderDashboardHtml(appName = 'apm-crash-monitor-serverless'): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName} - Serverless APM & Crash Monitor</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-base: #090d16;
      --bg-surface: #0f172a;
      --bg-surface-elevated: #1e293b;
      --bg-surface-hover: #273549;
      --border-subtle: #1e293b;
      --border-strong: #334155;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --accent-primary: #6366f1;
      --accent-primary-hover: #4f46e5;
      --accent-cyan: #06b6d4;
      --accent-emerald: #10b981;
      --accent-amber: #f59e0b;
      --accent-rose: #f43f5e;
      --accent-purple: #a855f7;
      --radius-sm: 6px;
      --radius-md: 10px;
      --radius-lg: 14px;
      --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-base);
      color: var(--text-main);
      font-family: var(--font-sans);
      font-size: 14px;
      line-height: 1.5;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    a { color: var(--accent-cyan); text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* Top Navigation Bar */
    .navbar {
      background-color: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border-subtle);
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .nav-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 800;
      font-size: 16px;
      letter-spacing: -0.02em;
      color: #fff;
    }
    .brand-badge {
      background: var(--bg-surface-elevated);
      color: var(--text-muted);
      border: 1px solid var(--border-strong);
      padding: 3px 8px;
      border-radius: var(--radius-sm);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .nav-tabs {
      display: flex;
      gap: 4px;
      background: var(--bg-surface);
      padding: 4px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
    }
    .nav-tab {
      padding: 6px 14px;
      border-radius: var(--radius-sm);
      font-weight: 600;
      font-size: 13px;
      color: var(--text-muted);
      cursor: pointer;
      border: none;
      background: transparent;
      transition: all 0.15s ease;
    }
    .nav-tab:hover { color: var(--text-main); background: var(--bg-surface-hover); }
    .nav-tab.active { color: #fff; background: var(--accent-primary); }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* Container Layout */
    .app-container {
      max-width: 1380px;
      width: 100%;
      margin: 0 auto;
      padding: 24px;
      flex: 1;
    }

    /* Metric Cards Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .metric-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 18px 20px;
      position: relative;
      overflow: hidden;
    }
    .metric-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--card-accent, var(--accent-primary));
    }
    .metric-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-dim);
      margin-bottom: 6px;
    }
    .metric-value {
      font-size: 26px;
      font-weight: 800;
      color: #fff;
      font-family: var(--font-mono);
    }
    .metric-sub {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    /* Action & Filter Bar */
    .filter-bar {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 18px;
      flex-wrap: wrap;
    }
    .search-input-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-base);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      padding: 6px 12px;
      flex: 1;
      min-width: 240px;
    }
    .search-input-wrap input {
      background: transparent;
      border: none;
      outline: none;
      color: #fff;
      font-size: 13px;
      width: 100%;
    }
    .select-dropdown {
      background: var(--bg-base);
      color: var(--text-main);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      padding: 7px 12px;
      font-size: 13px;
      outline: none;
      cursor: pointer;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      border-radius: var(--radius-sm);
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s ease;
    }
    .btn-primary { background: var(--accent-primary); color: #fff; }
    .btn-primary:hover { background: var(--accent-primary-hover); }
    .btn-secondary { background: var(--bg-surface-elevated); color: var(--text-main); border-color: var(--border-strong); }
    .btn-secondary:hover { background: var(--bg-surface-hover); }
    .btn-success { background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald); border-color: rgba(16, 185, 129, 0.3); }
    .btn-success:hover { background: rgba(16, 185, 129, 0.25); }
    .btn-danger { background: rgba(244, 63, 94, 0.15); color: var(--accent-rose); border-color: rgba(244, 63, 94, 0.3); }
    .btn-danger:hover { background: rgba(244, 63, 94, 0.25); }
    .btn-sm { padding: 4px 8px; font-size: 11px; }

    /* Tables & Lists */
    .table-container {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .data-table th {
      background: var(--bg-surface-elevated);
      color: var(--text-dim);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 12px 16px;
      font-weight: 700;
      border-bottom: 1px solid var(--border-subtle);
    }
    .data-table td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border-subtle);
      color: var(--text-muted);
    }
    .data-table tr:hover td {
      background: rgba(255, 255, 255, 0.02);
      color: var(--text-main);
    }
    .data-table tr.clickable { cursor: pointer; }

    /* Badges & Tags */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .badge-error, .badge-fatal { background: rgba(244, 63, 94, 0.15); color: var(--accent-rose); border: 1px solid rgba(244, 63, 94, 0.3); }
    .badge-warning { background: rgba(245, 158, 11, 0.15); color: var(--accent-amber); border: 1px solid rgba(245, 158, 11, 0.3); }
    .badge-info { background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan); border: 1px solid rgba(6, 182, 212, 0.3); }
    .badge-resolved { background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald); border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-ignored { background: rgba(100, 116, 139, 0.2); color: var(--text-dim); }

    /* Issue Item Row */
    .issue-title {
      font-size: 14px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 4px;
    }
    .issue-culprit {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--text-dim);
    }

    /* Stack Trace Viewer */
    .stacktrace-box {
      background: #060910;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      overflow: hidden;
      margin-top: 16px;
    }
    .stack-header {
      background: var(--bg-surface-elevated);
      padding: 10px 16px;
      border-bottom: 1px solid var(--border-subtle);
      font-weight: 700;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .stack-frame {
      border-bottom: 1px solid #141c2c;
      padding: 10px 16px;
    }
    .frame-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: var(--font-mono);
      font-size: 12px;
      margin-bottom: 6px;
    }
    .frame-function { color: var(--accent-cyan); font-weight: 600; }
    .frame-file { color: var(--text-muted); }
    .frame-line { color: var(--accent-amber); font-weight: 700; }
    .code-lines {
      background: #020408;
      border-radius: var(--radius-sm);
      padding: 6px 0;
      font-family: var(--font-mono);
      font-size: 12px;
      line-height: 1.6;
      overflow-x: auto;
    }
    .code-row {
      display: flex;
      padding: 1px 12px;
    }
    .code-row.highlight {
      background: rgba(244, 63, 94, 0.2);
      border-left: 3px solid var(--accent-rose);
    }
    .line-no {
      color: var(--text-dim);
      width: 45px;
      user-select: none;
      text-align: right;
      padding-right: 12px;
    }
    .line-text {
      color: #e2e8f0;
      white-space: pre;
    }

    /* APM Waterfall Chart */
    .waterfall-container {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 16px;
      margin-top: 16px;
    }
    .span-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .span-info {
      width: 320px;
      min-width: 320px;
    }
    .span-op {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--accent-cyan);
    }
    .span-desc {
      font-size: 12px;
      font-family: var(--font-mono);
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .span-bar-wrapper {
      flex: 1;
      background: rgba(255, 255, 255, 0.04);
      height: 20px;
      border-radius: var(--radius-sm);
      position: relative;
    }
    .span-bar {
      position: absolute;
      height: 100%;
      background: linear-gradient(90deg, var(--accent-primary), var(--accent-cyan));
      border-radius: var(--radius-sm);
      min-width: 4px;
    }
    .span-duration {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-muted);
      width: 80px;
      text-align: right;
    }

    /* Breadcrumbs Timeline */
    .timeline {
      position: relative;
      padding-left: 20px;
      border-left: 2px solid var(--border-strong);
      margin-top: 14px;
    }
    .timeline-item {
      position: relative;
      margin-bottom: 14px;
      padding-left: 10px;
    }
    .timeline-item::before {
      content: '';
      position: absolute;
      left: -26px;
      top: 4px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--accent-cyan);
      border: 2px solid var(--bg-surface);
    }
    .timeline-category {
      font-size: 11px;
      font-weight: 700;
      color: var(--accent-cyan);
      text-transform: uppercase;
    }
    .timeline-msg {
      color: #fff;
      font-size: 13px;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }
    .modal-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-lg);
      width: 100%;
      max-width: 520px;
      padding: 24px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
    }
    .form-group {
      margin-bottom: 16px;
    }
    .form-group label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-dim);
      margin-bottom: 6px;
    }
    .form-control {
      width: 100%;
      background: var(--bg-base);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      padding: 8px 12px;
      color: #fff;
      font-size: 13px;
      outline: none;
    }
    .form-control:focus {
      border-color: var(--accent-primary);
    }

    /* Code Snippet Box */
    .code-box {
      background: #020408;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      padding: 14px;
      font-family: var(--font-mono);
      font-size: 12px;
      color: #38bdf8;
      position: relative;
      white-space: pre-wrap;
      word-break: break-all;
      margin: 10px 0;
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: var(--text-dim);
    }
    .empty-state h3 { color: #fff; margin-bottom: 6px; font-size: 16px; }

    .hidden { display: none !important; }
  </style>
</head>
<body>

  <!-- Top Navigation Bar -->
  <header class="navbar">
    <div class="nav-brand">
      <span>apm-crash-monitor-serverless</span>
      <span class="brand-badge">Workers & D1</span>
    </div>

    <div class="nav-tabs" id="main-nav-tabs">
      <button class="nav-tab active" data-tab="issues">Crashes & Issues</button>
      <button class="nav-tab" data-tab="performance">APM Performance</button>
      <button class="nav-tab" data-tab="projects">Projects & DSN</button>
      <button class="nav-tab" data-tab="docs">PHP Integration</button>
    </div>

    <div class="nav-actions">
      <select id="project-selector" class="select-dropdown">
        <option value="">All Projects</option>
      </select>
      <button id="btn-create-project-modal" class="btn btn-primary btn-sm">+ New Project</button>
      <button id="btn-logout" class="btn btn-secondary btn-sm" title="Log out">Logout</button>
    </div>
  </header>

  <!-- Main Container -->
  <main class="app-container">

    <!-- KPI Metrics Strip -->
    <section class="metrics-grid">
      <div class="metric-card" style="--card-accent: var(--accent-rose);">
        <div class="metric-label">Unresolved Issues</div>
        <div class="metric-value" id="kpi-unresolved">0</div>
        <div class="metric-sub">Active crash threads</div>
      </div>
      <div class="metric-card" style="--card-accent: var(--accent-amber);">
        <div class="metric-label">24h Crash Events</div>
        <div class="metric-value" id="kpi-events-24h">0</div>
        <div class="metric-sub">Total exception reports</div>
      </div>
      <div class="metric-card" style="--card-accent: var(--accent-cyan);">
        <div class="metric-label">APM Transactions</div>
        <div class="metric-value" id="kpi-transactions-24h">0</div>
        <div class="metric-sub">Monitored endpoints</div>
      </div>
      <div class="metric-card" style="--card-accent: var(--accent-emerald);">
        <div class="metric-label">Avg Response Time</div>
        <div class="metric-value" id="kpi-avg-duration">0.0 ms</div>
        <div class="metric-sub">Serverless latency</div>
      </div>
    </section>

    <!-- Tab 1: Issues / Crashes -->
    <section id="tab-issues" class="tab-content">
      <div class="filter-bar">
        <div class="search-input-wrap">
          <input type="text" id="issues-search" placeholder="Search exceptions, files, culprits..." />
        </div>
        <select id="issues-status-filter" class="select-dropdown">
          <option value="unresolved">Unresolved Only</option>
          <option value="resolved">Resolved</option>
          <option value="ignored">Ignored</option>
          <option value="all">All Statuses</option>
        </select>
        <select id="issues-level-filter" class="select-dropdown">
          <option value="all">All Levels</option>
          <option value="error">Errors</option>
          <option value="fatal">Fatal</option>
          <option value="warning">Warnings</option>
        </select>
        <button id="btn-refresh-issues" class="btn btn-secondary btn-sm">Refresh</button>
      </div>

      <!-- Issues List View -->
      <div id="issues-table-wrap" class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Issue / Exception</th>
              <th>Events</th>
              <th>Status</th>
              <th>First Seen</th>
              <th>Last Seen</th>
            </tr>
          </thead>
          <tbody id="issues-tbody">
            <tr><td colspan="5" class="empty-state">Loading issues...</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Single Issue Detail Drawer / View -->
      <div id="issue-detail-view" class="hidden">
        <button id="btn-back-to-issues" class="btn btn-secondary btn-sm" style="margin-bottom: 16px;">Back to Issues</button>
        <div class="table-container" style="padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px;">
            <div>
              <div id="detail-issue-badge" style="margin-bottom: 6px;"></div>
              <h2 id="detail-issue-title" style="color: #fff; font-size: 20px; font-weight: 800;"></h2>
              <div id="detail-issue-culprit" class="issue-culprit" style="margin-top: 4px; font-size: 13px;"></div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button id="btn-issue-resolve" class="btn btn-success btn-sm">Mark Resolved</button>
              <button id="btn-issue-ignore" class="btn btn-secondary btn-sm">Ignore</button>
              <button id="btn-issue-delete" class="btn btn-danger btn-sm">Delete</button>
            </div>
          </div>

          <!-- Stack Trace Viewer -->
          <div class="stacktrace-box">
            <div class="stack-header">
              <span>Stack Trace</span>
              <span id="detail-stack-count" style="color: var(--text-dim); font-size: 12px;"></span>
            </div>
            <div id="detail-stack-frames"></div>
          </div>

          <!-- Context & Breadcrumbs Split -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px;">
            <!-- Breadcrumbs -->
            <div class="metric-card">
              <div class="metric-label">Breadcrumbs Timeline</div>
              <div id="detail-breadcrumbs" class="timeline"></div>
            </div>

            <!-- Tags & Environment -->
            <div class="metric-card">
              <div class="metric-label">Runtime & Environment Context</div>
              <div id="detail-context-table" style="font-family: var(--font-mono); font-size: 12px; margin-top: 8px;"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Tab 2: APM Performance -->
    <section id="tab-performance" class="tab-content hidden">
      <div class="filter-bar">
        <div class="search-input-wrap">
          <input type="text" id="apm-search" placeholder="Search transaction routes (e.g. GET /api/users)..." />
        </div>
        <select id="apm-op-filter" class="select-dropdown">
          <option value="all">All Operations</option>
          <option value="http.server">HTTP Server</option>
          <option value="cli.worker">CLI / Worker</option>
        </select>
        <button id="btn-refresh-apm" class="btn btn-secondary btn-sm">Refresh</button>
      </div>

      <!-- Transactions List -->
      <div id="apm-table-wrap" class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Transaction Name</th>
              <th>Operation</th>
              <th>Duration</th>
              <th>Environment</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody id="apm-tbody">
            <tr><td colspan="5" class="empty-state">Loading APM transactions...</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Transaction Waterfall Span Detail -->
      <div id="apm-detail-view" class="hidden">
        <button id="btn-back-to-apm" class="btn btn-secondary btn-sm" style="margin-bottom: 16px;">Back to Transactions</button>
        <div class="table-container" style="padding: 20px;">
          <h2 id="apm-detail-title" style="color: #fff; font-size: 18px; font-weight: 800;"></h2>
          <div id="apm-detail-meta" style="color: var(--text-muted); font-size: 12px; margin-bottom: 16px;"></div>

          <div class="waterfall-container">
            <div style="font-weight: 700; font-size: 13px; margin-bottom: 12px;">Trace Spans Waterfall</div>
            <div id="apm-waterfall-rows"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Tab 3: Projects & DSN Manager -->
    <section id="tab-projects" class="tab-content hidden">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h2 style="font-size: 18px; font-weight: 800; color: #fff;">Configured Projects</h2>
        <button class="btn btn-primary btn-sm" onclick="openCreateProjectModal()">+ Add New Project</button>
      </div>
      <div id="projects-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px;">
        <!-- Project cards injected here -->
      </div>
    </section>

    <!-- Tab 4: PHP Integration & Quickstart -->
    <section id="tab-docs" class="tab-content hidden">
      <div class="table-container" style="padding: 24px; max-width: 900px; margin: 0 auto;">
        <h2 style="font-size: 20px; font-weight: 800; color: #fff; margin-bottom: 8px;">PHP Integration Guide (Sentry SDK ^4.x)</h2>
        <p style="color: var(--text-muted); margin-bottom: 20px;">
          apm-crash-monitor-serverless is fully compatible with the official <strong style="color: #fff;">sentry-php</strong> SDK.
        </p>

        <h3 style="color: var(--accent-cyan); font-size: 15px; margin-top: 16px;">1. Install Sentry PHP via Composer</h3>
        <div class="code-box">composer require sentry/sentry:^4.0</div>

        <h3 style="color: var(--accent-cyan); font-size: 15px; margin-top: 20px;">2. Initialize in your PHP Application Entrypoint</h3>
        <div class="code-box" id="docs-code-init">&lt;?php
require_once __DIR__ . '/vendor/autoload.php';

\\Sentry\\init([
    'dsn' => 'https://4a8c9b2e1f0d3a7e5b6c8a9d0e1f2a3b@your-worker.workers.dev/proj_default_php',
    'traces_sample_rate' => 1.0,
    'profiles_sample_rate' => 1.0,
    'environment' => 'production'
]);
</div>

        <h3 style="color: var(--accent-cyan); font-size: 15px; margin-top: 20px;">3. Performance Monitoring (APM Spans & DB Tracing)</h3>
        <div class="code-box">&lt;?php
$transactionContext = new \\Sentry\\Tracing\\TransactionContext();
$transactionContext->setName('GET /api/checkout');
$transactionContext->setOp('http.server');
$transaction = \\Sentry\\startTransaction($transactionContext);

// Custom Child Span (e.g. MySQL Database Query)
$spanContext = new \\Sentry\\Tracing\\SpanContext();
$spanContext->setOp('db.sql.query');
$spanContext->setDescription('SELECT * FROM orders WHERE user_id = :id');
$span = $transaction->startChild($spanContext);

// Execute query...
usleep(45000); // 45ms simulation
$span->finish();

// Finish parent transaction
$transaction->finish();
</div>

        <h3 style="color: var(--accent-cyan); font-size: 15px; margin-top: 20px;">4. Test Live Crash Simulation</h3>
        <p style="color: var(--text-muted); margin-bottom: 10px;">Trigger a test PHP crash event directly to your Worker endpoint:</p>
        <button id="btn-test-crash-sim" class="btn btn-danger">Send Simulated PHP Crash Event</button>
      </div>
    </section>

  </main>

  <!-- Create Project Modal -->
  <div id="modal-create-project" class="modal-overlay hidden">
    <div class="modal-card">
      <h3 style="color: #fff; font-size: 18px; font-weight: 700; margin-bottom: 16px;">Create New Monitoring Project</h3>
      <div class="form-group">
        <label>Project Name</label>
        <input type="text" id="new-proj-name" class="form-control" placeholder="e.g. Production API / PHP App" />
      </div>
      <div class="form-group">
        <label>Platform</label>
        <select id="new-proj-platform" class="form-control">
          <option value="php">PHP (sentry-php)</option>
          <option value="javascript">JavaScript / Browser</option>
          <option value="cloudflare-worker">Cloudflare Worker</option>
        </select>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px;">
        <button class="btn btn-secondary" onclick="closeCreateProjectModal()">Cancel</button>
        <button id="btn-save-project" class="btn btn-primary">Create Project</button>
      </div>
    </div>
  </div>

  <!-- Login Modal -->
  <div id="modal-login" class="modal-overlay hidden">
    <div class="modal-card">
      <div style="text-align: center; margin-bottom: 20px;">
        <span class="brand-badge" style="font-size: 12px;">apm-crash-monitor-serverless</span>
        <h3 style="color: #fff; font-size: 20px; font-weight: 800; margin-top: 8px;">Admin Authentication</h3>
        <p style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">Enter the credentials configured in your environment</p>
      </div>
      <div id="login-error" style="color: var(--accent-rose); font-size: 12px; margin-bottom: 12px;" class="hidden"></div>
      <div class="form-group">
        <label>Username</label>
        <input type="text" id="login-username" class="form-control" placeholder="admin" />
      </div>
      <div class="form-group">
        <label>Password</label>
        <input type="password" id="login-password" class="form-control" placeholder="••••••••" />
      </div>
      <button id="btn-submit-login" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Sign In</button>
    </div>
  </div>

  <!-- Client JavaScript -->
  <script>
    let currentProjects = [];
    let selectedProjectId = '';
    let currentIssueId = null;

    // Check Auth on load
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          document.getElementById('modal-login').classList.remove('hidden');
        } else {
          document.getElementById('modal-login').classList.add('hidden');
          initDashboard();
        }
      } catch (err) {
        document.getElementById('modal-login').classList.remove('hidden');
      }
    }

    // Login Handler
    document.getElementById('btn-submit-login').addEventListener('click', async () => {
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;
      const errBox = document.getElementById('login-error');

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) {
          errBox.textContent = data.error || 'Login failed';
          errBox.classList.remove('hidden');
        } else {
          document.getElementById('modal-login').classList.add('hidden');
          initDashboard();
        }
      } catch (err) {
        errBox.textContent = 'Server connection error';
        errBox.classList.remove('hidden');
      }
    });

    document.getElementById('btn-logout').addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      location.reload();
    });

    // Navigation Tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        tab.classList.add('active');
        const targetTab = tab.getAttribute('data-tab');
        document.getElementById('tab-' + targetTab).classList.remove('hidden');

        if (targetTab === 'issues') loadIssues();
        if (targetTab === 'performance') loadApm();
        if (targetTab === 'projects') loadProjects();
      });
    });

    async function initDashboard() {
      await loadProjects();
      await loadStats();
      await loadIssues();
    }

    async function loadProjects() {
      const res = await fetch('/api/projects');
      const data = await res.json();
      currentProjects = data.projects || [];

      // Update selector
      const selector = document.getElementById('project-selector');
      selector.innerHTML = '<option value="">All Projects</option>' + 
        currentProjects.map(p => '<option value="' + p.id + '">' + p.name + ' (' + p.platform + ')</option>').join('');

      // Update projects tab grid
      const grid = document.getElementById('projects-grid');
      if (currentProjects.length === 0) {
        grid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><h3>No Projects Found</h3><p>Create your first project to start monitoring.</p></div>';
      } else {
        grid.innerHTML = currentProjects.map(p => \`
          <div class="metric-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <strong style="color: #fff; font-size: 15px;">\${p.name}</strong>
              <span class="badge badge-info">\${p.platform}</span>
            </div>
            <div class="metric-label" style="margin-top: 10px;">SENTRY DSN</div>
            <div class="code-box">\${p.dsn}</div>
            <div style="display: flex; gap: 8px; margin-top: 12px;">
              <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText('\${p.dsn}'); alert('DSN copied to clipboard');">Copy DSN</button>
            </div>
          </div>
        \`).join('');
      }
    }

    document.getElementById('project-selector').addEventListener('change', (e) => {
      selectedProjectId = e.target.value;
      loadStats();
      loadIssues();
      loadApm();
    });

    async function loadStats() {
      const url = selectedProjectId ? '/api/stats?projectId=' + selectedProjectId : '/api/stats';
      const res = await fetch(url);
      const data = await res.json();

      document.getElementById('kpi-unresolved').textContent = data.unresolvedIssuesCount || 0;
      document.getElementById('kpi-events-24h').textContent = data.totalEventsCount || 0;
      document.getElementById('kpi-transactions-24h').textContent = data.totalTransactionsCount || 0;
      document.getElementById('kpi-avg-duration').textContent = (data.avgDurationMs || 0) + ' ms';
    }

    async function loadIssues() {
      const search = document.getElementById('issues-search').value.trim();
      const status = document.getElementById('issues-status-filter').value;
      const level = document.getElementById('issues-level-filter').value;

      let url = '/api/issues?status=' + status + '&level=' + level;
      if (selectedProjectId) url += '&projectId=' + selectedProjectId;
      if (search) url += '&search=' + encodeURIComponent(search);

      const res = await fetch(url);
      const data = await res.json();
      const tbody = document.getElementById('issues-tbody');

      if (!data.issues || data.issues.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><h3>No Crashes Found</h3><p>Your application is running without unhandled exceptions.</p></td></tr>';
        return;
      }

      tbody.innerHTML = data.issues.map(iss => {
        const badgeClass = iss.level === 'fatal' || iss.level === 'error' ? 'badge-error' : (iss.level === 'warning' ? 'badge-warning' : 'badge-info');
        const statusBadge = iss.status === 'resolved' ? '<span class="badge badge-resolved">Resolved</span>' : '';
        const firstSeen = new Date(iss.first_seen).toLocaleDateString();
        const lastSeen = new Date(iss.last_seen).toLocaleTimeString();

        return \`
          <tr class="clickable" onclick="viewIssueDetail('\${iss.id}')">
            <td>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                <span class="badge \${badgeClass}">\${iss.type}</span>
                \${statusBadge}
                <span class="issue-title">\${escapeHtml(iss.title)}</span>
              </div>
              <div class="issue-culprit">\${escapeHtml(iss.culprit || 'Unknown Culprit')}</div>
            </td>
            <td><strong style="color: #fff; font-family: var(--font-mono);">\${iss.events_count}</strong></td>
            <td><span class="badge badge-\${iss.status}">\${iss.status}</span></td>
            <td>\${firstSeen}</td>
            <td>\${lastSeen}</td>
          </tr>
        \`;
      }).join('');
    }

    async function viewIssueDetail(issueId) {
      currentIssueId = issueId;
      document.getElementById('issues-table-wrap').classList.add('hidden');
      document.getElementById('issue-detail-view').classList.remove('hidden');

      const res = await fetch('/api/issues/' + issueId);
      const data = await res.json();
      const iss = data.issue;
      const event = data.latestEvent;

      document.getElementById('detail-issue-title').textContent = iss.title;
      document.getElementById('detail-issue-culprit').textContent = iss.culprit || '';
      document.getElementById('detail-issue-badge').innerHTML = \`<span class="badge badge-\${iss.level}">\${iss.level}</span> <span class="badge badge-\${iss.status}">\${iss.status}</span>\`;

      // Stack frames
      const stackContainer = document.getElementById('detail-stack-frames');
      const exceptions = data.exceptions || [];
      if (exceptions.length > 0 && exceptions[0].stacktrace && exceptions[0].stacktrace.length > 0) {
        const frames = exceptions[0].stacktrace;
        document.getElementById('detail-stack-count').textContent = frames.length + ' frames';
        stackContainer.innerHTML = frames.map(f => {
          let codeBlock = '';
          if (f.context_line || (f.pre_context && f.pre_context.length > 0)) {
            const startLine = (f.lineno || 1) - (f.pre_context ? f.pre_context.length : 0);
            let rowsHtml = '';
            (f.pre_context || []).forEach((line, idx) => {
              rowsHtml += '<div class="code-row"><div class="line-no">' + (startLine + idx) + '</div><div class="line-text">' + escapeHtml(line) + '</div></div>';
            });
            if (f.context_line) {
              rowsHtml += '<div class="code-row highlight"><div class="line-no">' + (f.lineno || '') + '</div><div class="line-text">' + escapeHtml(f.context_line) + '</div></div>';
            }
            (f.post_context || []).forEach((line, idx) => {
              rowsHtml += '<div class="code-row"><div class="line-no">' + ((f.lineno || 1) + 1 + idx) + '</div><div class="line-text">' + escapeHtml(line) + '</div></div>';
            });
            codeBlock = '<div class="code-lines">' + rowsHtml + '</div>';
          }

          return \`
            <div class="stack-frame">
              <div class="frame-meta">
                <span class="frame-function">\${escapeHtml(f.function)}()</span>
                <span class="frame-file">\${escapeHtml(f.filename)}</span>
                <span class="frame-line">line \${f.lineno || '?'}</span>
              </div>
              \${codeBlock}
            </div>
          \`;
        }).join('');
      } else {
        stackContainer.innerHTML = '<div style="padding: 16px; color: var(--text-dim);">No stack trace frames captured for this event.</div>';
      }

      // Breadcrumbs
      const bcContainer = document.getElementById('detail-breadcrumbs');
      const breadcrumbs = data.breadcrumbs || [];
      if (breadcrumbs.length > 0) {
        bcContainer.innerHTML = breadcrumbs.map(b => \`
          <div class="timeline-item">
            <div class="timeline-category">\${escapeHtml(b.category || 'generic')} \${b.level ? '• ' + b.level : ''}</div>
            <div class="timeline-msg">\${escapeHtml(b.message || JSON.stringify(b.data || ''))}</div>
          </div>
        \`).join('');
      } else {
        bcContainer.innerHTML = '<div style="color: var(--text-dim);">No breadcrumbs recorded.</div>';
      }

      // Context info table
      const ctxTable = document.getElementById('detail-context-table');
      if (event) {
        ctxTable.innerHTML = \`
          <div style="margin-bottom: 6px;"><strong style="color: #fff;">Platform:</strong> \${event.platform}</div>
          <div style="margin-bottom: 6px;"><strong style="color: #fff;">Environment:</strong> \${event.environment}</div>
          <div style="margin-bottom: 6px;"><strong style="color: #fff;">Server:</strong> \${event.server_name || 'N/A'}</div>
          <div style="margin-bottom: 6px;"><strong style="color: #fff;">Event ID:</strong> \${event.id}</div>
        \`;
      }
    }

    document.getElementById('btn-back-to-issues').addEventListener('click', () => {
      document.getElementById('issue-detail-view').classList.add('hidden');
      document.getElementById('issues-table-wrap').classList.remove('hidden');
    });

    document.getElementById('btn-issue-resolve').addEventListener('click', async () => {
      if (!currentIssueId) return;
      await fetch('/api/issues/' + currentIssueId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' })
      });
      loadIssues();
      loadStats();
      document.getElementById('btn-back-to-issues').click();
    });

    document.getElementById('btn-issue-ignore').addEventListener('click', async () => {
      if (!currentIssueId) return;
      await fetch('/api/issues/' + currentIssueId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ignored' })
      });
      loadIssues();
      loadStats();
      document.getElementById('btn-back-to-issues').click();
    });

    document.getElementById('btn-issue-delete').addEventListener('click', async () => {
      if (!currentIssueId || !confirm('Permanently delete this issue?')) return;
      await fetch('/api/issues/' + currentIssueId, { method: 'DELETE' });
      loadIssues();
      loadStats();
      document.getElementById('btn-back-to-issues').click();
    });

    document.getElementById('btn-refresh-issues').addEventListener('click', loadIssues);
    document.getElementById('issues-status-filter').addEventListener('change', loadIssues);
    document.getElementById('issues-level-filter').addEventListener('change', loadIssues);
    document.getElementById('issues-search').addEventListener('input', debounce(loadIssues, 300));

    // APM Tab Functions
    async function loadApm() {
      const search = document.getElementById('apm-search').value.trim();
      const op = document.getElementById('apm-op-filter').value;
      let url = '/api/performance/transactions?op=' + op;
      if (selectedProjectId) url += '&projectId=' + selectedProjectId;
      if (search) url += '&search=' + encodeURIComponent(search);

      const res = await fetch(url);
      const data = await res.json();
      const tbody = document.getElementById('apm-tbody');

      if (!data.transactions || data.transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><h3>No APM Traces Recorded</h3><p>Instrument your application with Sentry\\startTransaction to trace performance.</p></td></tr>';
        return;
      }

      tbody.innerHTML = data.transactions.map(tx => \`
        <tr class="clickable" onclick="viewTransactionDetail('\${tx.id}')">
          <td><strong style="color: #fff; font-family: var(--font-mono);">\${escapeHtml(tx.name)}</strong></td>
          <td><span class="badge badge-info">\${tx.op}</span></td>
          <td><strong style="color: \${tx.duration_ms > 500 ? 'var(--accent-rose)' : 'var(--accent-emerald)'}; font-family: var(--font-mono);">\${tx.duration_ms} ms</strong></td>
          <td>\${tx.environment}</td>
          <td>\${new Date(tx.start_timestamp * 1000).toLocaleTimeString()}</td>
        </tr>
      \`).join('');
    }

    async function viewTransactionDetail(txId) {
      document.getElementById('apm-table-wrap').classList.add('hidden');
      document.getElementById('apm-detail-view').classList.remove('hidden');

      const res = await fetch('/api/performance/transactions/' + txId);
      const data = await res.json();
      const tx = data.transaction;
      const spans = data.spans || [];

      document.getElementById('apm-detail-title').textContent = tx.name;
      document.getElementById('apm-detail-meta').textContent = \`Total Duration: \${tx.duration_ms} ms | Trace ID: \${tx.trace_id} | \${tx.environment}\`;

      const totalDuration = Math.max(1, tx.duration_ms);
      const rowsContainer = document.getElementById('apm-waterfall-rows');

      let html = \`
        <div class="span-row" style="background: rgba(99, 102, 241, 0.08); border-radius: var(--radius-sm);">
          <div class="span-info">
            <div class="span-op">\${tx.op} (ROOT)</div>
            <div class="span-desc">\${escapeHtml(tx.name)}</div>
          </div>
          <div class="span-bar-wrapper">
            <div class="span-bar" style="left: 0%; width: 100%;"></div>
          </div>
          <div class="span-duration">\${tx.duration_ms} ms</div>
        </div>
      \`;

      for (const span of spans) {
        const leftPercent = Math.min(99, (span.relative_start_ms / totalDuration) * 100);
        const widthPercent = Math.max(1, Math.min(100 - leftPercent, (span.duration_ms / totalDuration) * 100));

        html += \`
          <div class="span-row">
            <div class="span-info" style="padding-left: 12px;">
              <div class="span-op">\${span.op}</div>
              <div class="span-desc">\${escapeHtml(span.description || span.op)}</div>
            </div>
            <div class="span-bar-wrapper">
              <div class="span-bar" style="left: \${leftPercent.toFixed(1)}%; width: \${widthPercent.toFixed(1)}%;"></div>
            </div>
            <div class="span-duration">\${span.duration_ms} ms</div>
          </div>
        \`;
      }

      rowsContainer.innerHTML = html;
    }

    document.getElementById('btn-back-to-apm').addEventListener('click', () => {
      document.getElementById('apm-detail-view').classList.add('hidden');
      document.getElementById('apm-table-wrap').classList.remove('hidden');
    });

    document.getElementById('btn-refresh-apm').addEventListener('click', loadApm);
    document.getElementById('apm-op-filter').addEventListener('change', loadApm);
    document.getElementById('apm-search').addEventListener('input', debounce(loadApm, 300));

    // Test Crash Simulation Button
    document.getElementById('btn-test-crash-sim').addEventListener('click', async () => {
      const btn = document.getElementById('btn-test-crash-sim');
      btn.disabled = true;
      btn.textContent = 'Sending simulated crash...';

      const simPayload = {
        event_id: crypto.randomUUID().replace(/-/g, ''),
        timestamp: Date.now() / 1000,
        platform: 'php',
        environment: 'production',
        server_name: 'api-worker-prod-01',
        exception: {
          values: [
            {
              type: 'PDOException',
              value: 'SQLSTATE[HY000] [2002] Connection refused to database replica cluster',
              stacktrace: {
                frames: [
                  {
                    filename: 'app/Http/Controllers/OrderController.php',
                    function: 'checkout',
                    lineno: 74,
                    in_app: true,
                    pre_context: ['    $order = new Order($request->all());', '    $gateway = new StripePaymentGateway();'],
                    context_line: '    $dbResult = DB::table("orders")->insert($order->toArray());',
                    post_context: ['    $gateway->charge($order->total);', '    return response()->json($order);']
                  }
                ]
              }
            }
          ]
        },
        breadcrumbs: [
          { timestamp: (Date.now() - 5000) / 1000, category: 'http', message: 'POST /api/v1/checkout HTTP/1.1' },
          { timestamp: (Date.now() - 2000) / 1000, category: 'db', message: 'Connecting to cluster mysql-primary.internal:3306' }
        ]
      };

      const envelopeText = JSON.stringify({ event_id: simPayload.event_id }) + '\\n' +
        JSON.stringify({ type: 'event', content_type: 'application/json' }) + '\\n' +
        JSON.stringify(simPayload);

      try {
        const res = await fetch('/api/envelope', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: envelopeText
        });
        if (res.ok) {
          alert('Simulated crash successfully sent. Refreshing issues tab.');
          document.querySelector('.nav-tab[data-tab="issues"]').click();
          loadStats();
        } else {
          alert('Failed to send simulation');
        }
      } catch (e) {
        alert('Error sending: ' + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Send Simulated PHP Crash Event';
      }
    });

    // Create Project Modal Functions
    function openCreateProjectModal() {
      document.getElementById('modal-create-project').classList.remove('hidden');
    }
    function closeCreateProjectModal() {
      document.getElementById('modal-create-project').classList.add('hidden');
    }
    document.getElementById('btn-create-project-modal').addEventListener('click', openCreateProjectModal);

    document.getElementById('btn-save-project').addEventListener('click', async () => {
      const name = document.getElementById('new-proj-name').value.trim();
      const platform = document.getElementById('new-proj-platform').value;
      if (!name) return alert('Project name is required');

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, platform })
      });

      if (res.ok) {
        closeCreateProjectModal();
        document.getElementById('new-proj-name').value = '';
        await loadProjects();
        alert('Project created successfully');
      } else {
        alert('Failed to create project');
      }
    });

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }

    checkAuth();
  </script>
</body>
</html>`;
}
