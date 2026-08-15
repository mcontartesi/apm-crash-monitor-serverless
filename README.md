# ⚡ FlarePulse APM (Cloudflare Serverless)

> **Un APM y Monitor de Errores (Crash Monitor) 100% Serverless para Cloudflare, totalmente compatible con el SDK oficial de Sentry (`sentry-php` ^4.x, Sentry JS, Cloudflare Workers).**

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers%20%26%20D1-orange?logo=cloudflare)](https://workers.cloudflare.com/)
[![Sentry Compatible](https://img.shields.io/badge/Sentry%20SDK-Compatible%20v4.x-purple?logo=sentry)](https://github.com/getsentry/sentry-php)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-Passing%20(13%2F13)-emerald)](https://github.com/)

---

## 🌟 Características Principales / Key Features

- 🚀 **100% Serverless en Cloudflare**: Corre sobre **Cloudflare Workers** y **Cloudflare D1 (SQLite en el Edge)** con cero servidores que mantener y costos prácticamente nulos ($0 en el tier gratuito de Cloudflare).
- 🔌 **Compatibilidad Nativa con Sentry**: Ingiere eventos y envelopes oficiales de Sentry (`/api/:projectId/envelope/`, `/api/:projectId/store/`, `/api/envelope/`). Compatible con la última versión de [`sentry/sentry: ^4.x`](https://github.com/getsentry/sentry-php).
- 💥 **Crash Reporting & Smart Fingerprinting**: Agrupación inteligente de excepciones (Exception Type, Stacktrace In-App top frames, Culprit, Breadcrumbs, Tags, Contextos de entorno y superglobales de PHP).
- ⚡ **APM Performance & Waterfall Spans**: Monitoreo de rendimiento en tiempo real, transacciones raíz y spans hijos (consultas SQL/Base de datos, llamadas HTTP externas, caching, renderizado) con cálculo de percentiles p50/p95.
- 🖥️ **Dashboard Web Moderno Integrado**: Interfaz oscura de alto rendimiento servida directamente por el Worker sin dependencias externas pesadas. Visualizador interactivo de stacktraces, resaltado de líneas de código, línea de tiempo de breadcrumbs y gráfico de cascada (flamegraph).
- 🔐 **Autenticación Protegida por `.env`**: Autenticación de administrador con usuario y contraseña definidos en variables de entorno / Worker Secrets, firmados con tokens JWT (`jose`).
- 🤖 **Auto-Deploy con Cloudflare**: Configuración lista para Wrangler y flujo de CI/CD automatizado en GitHub Actions.

---

## 🏛️ Arquitectura del Sistema

```
+---------------------------------------------------------------------------------------+
|                                    Aplicaciones Cliente                               |
|  [ PHP App (sentry/sentry ^4.x) ]   [ JS / Frontend SDK ]   [ Cloudflare Workers SDK ] |
+-------------------------------------------+-------------------------------------------+
                                            | Sentry Envelopes / Store POST
                                            v
+---------------------------------------------------------------------------------------+
|                       Cloudflare Worker (Hono REST & Ingestion Engine)               |
|                                                                                       |
|   /api/:projectId/envelope/  --> [ Parser de Envelopes Sentry ]                       |
|   /api/:projectId/store/     --> [ Normalizador de Eventos ]                          |
|                                      |                                                |
|                     +----------------+----------------+                               |
|                     |                                 |                               |
|                     v                                 v                               |
|           [ Motor de Crashes ]             [ Motor de APM ]                           |
|           - Fingerprint & Agrupación       - Transacciones & Trazas                   |
|           - Extracción de Stacktrace       - Spans en Cascada (Waterfall)             |
|           - Breadcrumbs & Tags de PHP      - Métricas de Latencia p50/p95             |
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
|                    Dashboard & Panel de Control (Cloudflare Worker UI)                |
|   - Feed de errores en tiempo real y vista detallada de excepciones                   |
|   - Timeline de breadcrumbs e inspección de contexto (Versión PHP, OS, Headers)       |
|   - Explorador de APM con gráfico de cascada de spans interactivo                     |
|   - Gestor de Proyectos y generador de DSN listo para copiar en PHP                   |
|   - Autenticación con sesión JWT configurada vía .env                                 |
+---------------------------------------------------------------------------------------+
```

---

## 🚀 Inicio Rápido / Quick Start

### 1. Clonar el repositorio e instalar dependencias

```bash
git clone https://github.com/your-username/apm-crash-monitor-serverless.git
cd apm-crash-monitor-serverless
npm install
```

### 2. Configurar variables de entorno

Copia el archivo `.env.example` a `.dev.vars` (para desarrollo local) o `.env`:

```bash
cp .env.example .dev.vars
```

Edita los valores en `.dev.vars`:
```ini
ADMIN_USER=admin
ADMIN_PASSWORD=mi-password-seguro-123
JWT_SECRET=super-secret-jwt-key-minimum-32-characters-long
APP_NAME=FlarePulse APM
APP_ENV=development
```

### 3. Inicializar la Base de Datos Cloudflare D1 Local

```bash
npm run d1:init-local
```

### 4. Iniciar el servidor local

```bash
npm run dev
```

Abre tu navegador en `http://localhost:8787` e inicia sesión con el usuario y contraseña configurados.

---

## 🐘 Integración en PHP con `sentry/sentry` (^4.x)

### Paso 1: Instalar Sentry PHP vía Composer

En tu proyecto PHP:

```bash
composer require sentry/sentry:^4.0
```

### Paso 2: Inicializar el SDK con tu DSN

```php
<?php

require_once __DIR__ . '/vendor/autoload.php';

// Inicializa Sentry apuntando a tu instancia de FlarePulse APM
\Sentry\init([
    'dsn' => 'https://4a8c9b2e1f0d3a7e5b6c8a9d0e1f2a3b@your-worker.workers.dev/proj_default_php',
    'traces_sample_rate' => 1.0,      // Monitoreo de APM al 100%
    'profiles_sample_rate' => 1.0,
    'environment' => 'production',
    'release' => 'my-php-app@1.0.0',
]);

// Contexto de Usuario y Tags
\Sentry\configureScope(function (\Sentry\State\Scope $scope): void {
    $scope->setUser([
        'id' => 'user_123',
        'email' => 'admin@empresa.com',
        'username' => 'carlos_admin'
    ]);
    $scope->setTag('php_version', PHP_VERSION);
});
```

### Paso 3: Monitoreo de Rendimiento (APM Spans en Cascada)

```php
// Iniciar transacción de ruta
$transactionContext = new \Sentry\Tracing\TransactionContext();
$transactionContext->setName('POST /api/v1/pedidos');
$transactionContext->setOp('http.server');
$transaction = \Sentry\startTransaction($transactionContext);

// Span hijo: Consulta a Base de Datos MySQL
$dbSpanContext = new \Sentry\Tracing\SpanContext();
$dbSpanContext->setOp('db.sql.query');
$dbSpanContext->setDescription('INSERT INTO orders (user_id, total) VALUES (:user, :total)');
$dbSpan = $transaction->startChild($dbSpanContext);

// ... Ejecutar consulta SQL ...
usleep(30000); // 30ms
$dbSpan->finish();

// Span hijo: Llamada a pasarela de pagos externa
$httpSpanContext = new \Sentry\Tracing\SpanContext();
$httpSpanContext->setOp('http.client');
$httpSpanContext->setDescription('POST https://api.stripe.com/v1/charges');
$httpSpan = $transaction->startChild($httpSpanContext);

// ... Llamada cURL ...
usleep(85000); // 85ms
$httpSpan->finish();

// Finalizar transacción raíz
$transaction->finish();
```

---

## 🧪 Pruebas Automatizadas

El proyecto cuenta con una suite completa de pruebas unitarias y de integración con **Vitest**:

```bash
npm test
```

### Pruebas cubiertas:
- ✅ **Sentry Envelope Parser**: Decodificación de flujos multidocumento delimitados por saltos de línea (`\n`).
- ✅ **Smart Fingerprinting**: Agrupación determinística SHA-256 de excepciones PHP y culprits.
- ✅ **Event Normalizer**: Procesamiento de stacktraces (marcos pre/context/post), superglobales, tags y duraciones de spans en APM.
- ✅ **Sentry Auth & DSN**: Validación de encabezados `X-Sentry-Auth`, parámetros de URL y seguridad JWT.
- ✅ **API Ingestion Routes**: Respuestas estándar Sentry (`{ id: eventId }`) y salud del sistema.

---

## ☁️ Despliegue en Producción (Cloudflare Workers)

### Opción A: Despliegue con Wrangler CLI

1. **Crea la base de datos D1 en Cloudflare:**
   ```bash
   npx wrangler d1 create flarepulse-db
   ```

2. **Copia el `database_id` devuelto y pégalo en `wrangler.jsonc`:**
   ```json
   "d1_databases": [
     {
       "binding": "DB",
       "database_name": "flarepulse-db",
       "database_id": "tu-d1-database-id-aqui"
     }
   ]
   ```

3. **Aplica el esquema SQL en la base de datos remota:**
   ```bash
   npm run d1:init-remote
   ```

4. **Establece las credenciales seguras (Secrets) en Cloudflare:**
   ```bash
   npx wrangler secret put ADMIN_USER
   npx wrangler secret put ADMIN_PASSWORD
   npx wrangler secret put JWT_SECRET
   ```

5. **Despliega el Worker:**
   ```bash
   npm run deploy
   ```

### Opción B: CI/CD Automático con GitHub Actions

El repositorio incluye el flujo `.github/workflows/deploy.yml`. Solo necesitas agregar a los Secrets de tu repositorio en GitHub:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

---

## 📁 Estructura del Proyecto

```
apm-crash-monitor-serverless/
├── .github/workflows/deploy.yml  # CI/CD para auto-deploy en Cloudflare
├── schema/schema.sql             # Esquema D1 SQLite optimizado con índices
├── src/
│   ├── index.ts                  # Punto de entrada del Cloudflare Worker (Hono)
│   ├── config.ts                 # Manejador de configuración y credenciales
│   ├── types/index.ts            # Definiciones de TypeScript para Sentry y D1
│   ├── db/
│   │   └── client.ts             # Cliente D1 con transacciones y consultas por lotes
│   ├── sentry/
│   │   ├── auth.ts               # Validador de cabeceras Sentry DSN y X-Sentry-Auth
│   │   ├── envelope.ts           # Parser de Envelopes Sentry (multi-item stream)
│   │   ├── fingerprint.ts        # Algoritmo de agrupamiento inteligente de crashes
│   │   └── normalizer.ts         # Normalizador de eventos PHP, stacktraces y spans
│   ├── api/
│   │   ├── auth.ts               # Autenticación de admin y cookies JWT
│   │   ├── ingest.ts             # Endpoints oficiales de ingesta (/envelope, /store)
│   │   ├── issues.ts             # API REST para incidencias y stacktraces
│   │   ├── performance.ts        # API REST para transacciones y cascada de spans
│   │   ├── projects.ts           # API REST para proyectos y generación de DSN
│   │   └── stats.ts              # API REST para métricas y KPIs del dashboard
│   └── ui/
│       └── html.ts               # Dashboard Web interactivo integrado
├── examples/php-app/
│   ├── composer.json             # Dependencia sentry/sentry ^4.0
│   ├── test-sentry.php           # Script ejecutable de prueba en PHP
│   └── README.md                 # Guía paso a paso para PHP
├── test/                         # Suite de tests con Vitest
├── wrangler.jsonc                # Configuración de Cloudflare Workers y D1
├── tsconfig.json                 # Configuración de TypeScript
└── README.md                     # Documentación completa
```

---

## 📄 Licencia

Este proyecto está bajo la licencia [MIT](LICENSE).
