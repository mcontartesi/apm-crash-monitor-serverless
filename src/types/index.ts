/**
 * FlarePulse APM - TypeScript Definitions
 * 100% Cloudflare Serverless, Sentry-Compatible Engine
 */

export interface Env {
  DB: D1Database;
  ADMIN_USER?: string;
  ADMIN_PASSWORD?: string;
  JWT_SECRET?: string;
  APP_NAME?: string;
  APP_ENV?: string;
}

// ----------------------------------------------------------------------
// Sentry Protocol Payload Types
// ----------------------------------------------------------------------

export interface SentryStackFrame {
  filename?: string;
  function?: string;
  module?: string;
  lineno?: number;
  colno?: number;
  abs_path?: string;
  context_line?: string;
  pre_context?: string[];
  post_context?: string[];
  in_app?: boolean;
  vars?: Record<string, unknown>;
}

export interface SentryStacktrace {
  frames?: SentryStackFrame[];
}

export interface SentryExceptionValue {
  type: string;
  value: string;
  module?: string;
  thread_id?: number;
  stacktrace?: SentryStacktrace;
  raw_stacktrace?: SentryStacktrace;
}

export interface SentryBreadcrumb {
  timestamp: number | string;
  type?: string;
  category?: string;
  level?: string;
  message?: string;
  data?: Record<string, unknown>;
}

export interface SentryUser {
  id?: string;
  email?: string;
  ip_address?: string;
  username?: string;
  segment?: string;
  [key: string]: unknown;
}

export interface SentryRequest {
  url?: string;
  method?: string;
  data?: unknown;
  query_string?: string | Record<string, string>;
  cookies?: string | Record<string, string>;
  headers?: Record<string, string>;
  env?: Record<string, string>;
}

export interface SentrySpan {
  span_id: string;
  parent_span_id?: string;
  trace_id: string;
  op: string;
  description?: string;
  status?: string;
  start_timestamp: number;
  timestamp: number;
  data?: Record<string, unknown>;
  tags?: Record<string, string>;
}

export interface SentryEventPayload {
  event_id?: string;
  message?: string | { message?: string; formatted?: string };
  timestamp?: number | string;
  start_timestamp?: number | string;
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  platform?: string;
  logger?: string;
  server_name?: string;
  release?: string;
  dist?: string;
  environment?: string;
  culprit?: string;
  transaction?: string;
  type?: 'transaction' | 'event' | 'default';
  fingerprint?: string[];
  modules?: Record<string, string>;
  extra?: Record<string, unknown>;
  tags?: Record<string, string>;
  contexts?: {
    trace?: {
      trace_id?: string;
      span_id?: string;
      op?: string;
      status?: string;
      [key: string]: unknown;
    };
    runtime?: {
      name?: string;
      version?: string;
      [key: string]: unknown;
    };
    os?: {
      name?: string;
      version?: string;
      [key: string]: unknown;
    };
    app?: Record<string, unknown>;
    device?: Record<string, unknown>;
    [key: string]: unknown;
  };
  user?: SentryUser;
  request?: SentryRequest;
  exception?: {
    values: SentryExceptionValue[];
  };
  breadcrumbs?: SentryBreadcrumb[] | { values: SentryBreadcrumb[] };
  spans?: SentrySpan[];
  sdk?: {
    name?: string;
    version?: string;
    integrations?: string[];
    packages?: Array<{ name: string; version: string }>;
  };
}

export interface SentryEnvelopeHeader {
  event_id?: string;
  dsn?: string;
  sdk?: Record<string, unknown>;
  sent_at?: string;
  trace?: Record<string, unknown>;
}

export interface SentryEnvelopeItemHeader {
  type: 'event' | 'transaction' | 'session' | 'sessions' | 'client_report' | 'attachment' | 'user_report' | string;
  length?: number;
  content_type?: string;
  filename?: string;
}

export interface SentryEnvelopeItem {
  header: SentryEnvelopeItemHeader;
  payload: unknown;
}

export interface SentryEnvelope {
  header: SentryEnvelopeHeader;
  items: SentryEnvelopeItem[];
}

export interface SentryAuthHeaders {
  sentry_version?: string;
  sentry_client?: string;
  sentry_key: string;
  sentry_secret?: string;
}

// ----------------------------------------------------------------------
// Database Relational Models
// ----------------------------------------------------------------------

export interface DbProject {
  id: string;
  name: string;
  slug: string;
  platform: string;
  public_key: string;
  secret_key?: string;
  created_at: number;
}

export interface DbIssue {
  id: string;
  project_id: string;
  fingerprint: string;
  title: string;
  culprit?: string;
  type: string;
  level: string;
  status: 'unresolved' | 'resolved' | 'ignored';
  first_seen: number;
  last_seen: number;
  events_count: number;
  user_count: number;
}

export interface DbEvent {
  id: string;
  issue_id: string;
  project_id: string;
  timestamp: number;
  platform: string;
  environment: string;
  release?: string;
  server_name?: string;
  message?: string;
  user_json?: string;
  tags_json?: string;
  contexts_json?: string;
  request_json?: string;
  created_at: number;
}

export interface DbException {
  id: string;
  event_id: string;
  type: string;
  value: string;
  module?: string;
  stacktrace_json: string;
}

export interface DbBreadcrumb {
  id: string;
  event_id: string;
  timestamp: number;
  category?: string;
  level?: string;
  type?: string;
  message?: string;
  data_json?: string;
}

export interface DbTransaction {
  id: string;
  project_id: string;
  trace_id: string;
  span_id: string;
  name: string;
  op: string;
  status?: string;
  environment: string;
  start_timestamp: number;
  timestamp: number;
  duration_ms: number;
  tags_json?: string;
  contexts_json?: string;
  created_at: number;
}

export interface DbSpan {
  id: string;
  transaction_id: string;
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  op: string;
  description?: string;
  status?: string;
  start_timestamp: number;
  timestamp: number;
  duration_ms: number;
  data_json?: string;
}

// ----------------------------------------------------------------------
// User Auth & Session
// ----------------------------------------------------------------------

export interface AuthSessionPayload {
  username: string;
  role: 'admin';
  exp: number;
}
