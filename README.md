<![CDATA[# MasterHub API ⚒️🇲🇩

> **Backend сервис маркетплейса мастеров Молдовы** — NestJS 11 · Prisma 7 · PostgreSQL 18 · Redis 7 · Docker

[![Node.js](https://img.shields.io/badge/Node.js-25-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-UNLICENSED-red)](#)

---

## 📖 Содержание

- [Архитектура](#-архитектура)
- [Технологический стек](#-технологический-стек)
- [Быстрый старт](#-быстрый-старт)
- [Переменные окружения](#-переменные-окружения)
- [Docker](#-docker)
- [Команды NPM](#-команды-npm)
- [Структура проекта](#-структура-проекта)
- [API-модули](#-api-модули)
- [База данных](#-база-данных)
- [Тестирование](#-тестирование)
- [Мониторинг](#-мониторинг)
- [CI/CD](#-cicd)
- [Продакшн деплой](#-продакшн-деплой)

---

## 🏗 Архитектура

```
┌──────────────────────────────────────────────────────────────┐
│                       Клиенты (Frontend)                     │
└──────────┬──────────────────────────┬────────────────────────┘
           │  REST API (HTTP/HTTPS)   │  WebSocket (Socket.IO)
           ▼                          ▼
┌──────────────────────────────────────────────────────────────┐
│                     NestJS API (порт 4000)                   │
│  ┌────────────┐  ┌──────────┐  ┌────────────┐  ┌─────────┐  │
│  │   Guards    │  │  Pipes   │  │Interceptors│  │ Filters │  │
│  └────────────┘  └──────────┘  └────────────┘  └─────────┘  │
│  ┌───────────────────────────────────────────────────────┐   │
│  │               30 бизнес-модулей                       │   │
│  │  Auth · Masters · Leads · Chat · Payments · Reviews   │   │
│  │  Tariffs · Bookings · Notifications · Analytics ...   │   │
│  └───────────────────────────────────────────────────────┘   │
└──────┬──────────────┬──────────────┬─────────────────────────┘
       │              │              │
       ▼              ▼              ▼
┌────────────┐ ┌────────────┐ ┌────────────┐
│ PostgreSQL │ │   Redis    │ │    S3/B2   │
│     18     │ │     7      │ │  Storage   │
│  (Prisma)  │ │(Cache/Bull)│ │ (Uploads)  │
└────────────┘ └────────────┘ └────────────┘
```

---

## 🛠 Технологический стек

| Категория       | Технология                                              |
| --------------- | ------------------------------------------------------- |
| **Runtime**     | Node.js 25, TypeScript 5.9                              |
| **Framework**   | NestJS 11 (Express)                                     |
| **ORM**         | Prisma 7 (PostgreSQL adapter)                           |
| **База данных** | PostgreSQL 18                                           |
| **Кэш/Очереди** | Redis 7, Bull Queues, ioredis                           |
| **Аутентификация** | JWT (Access + Refresh), Passport.js, OAuth2 (Google/FB) |
| **Реал-тайм**   | Socket.IO (WebSocket Gateway)                          |
| **Файлы**       | Backblaze B2 (S3-совместимый), Multer                   |
| **Платежи**     | MIA / MAIB QR                                           |
| **SMS/Уведомления** | Twilio (SMS + WhatsApp), Nodemailer (Email), Telegram Bot |
| **Безопасность** | Helmet, CORS, Rate Limiting (Throttler), Sanitize-HTML |
| **Документация** | Swagger / OpenAPI 3.0                                  |
| **Мониторинг**  | Prometheus, Grafana, Winston (логирование)              |
| **Тесты**       | Jest, Supertest, Chai                                   |
| **CI/CD**       | GitHub Actions (4 workflow'а)                           |
| **Контейнеры**  | Docker, Docker Compose (dev + prod)                     |

---

## 🚀 Быстрый старт

### Требования

- **Node.js** ≥ 25
- **npm** ≥ 10
- **Docker** + **Docker Compose** (рекомендуется)
- **PostgreSQL** 18 (если без Docker)
- **Redis** 7 (если без Docker)

### 1. Клонирование и установка

```bash
git clone <repository-url>
cd api-master
npm install
```

### 2. Настройка окружения

```bash
# Скопировать шаблон переменных
cp .env.docker.example .env

# Сгенерировать JWT-секреты
node scripts/generate-secrets.js
```

Откройте `.env` и заполните обязательные переменные (см. [раздел переменных окружения](#-переменные-окружения)).

### 3. Запуск через Docker (рекомендуется) 🐳

```bash
# Создать .env.docker из шаблона
cp .env.docker.example .env.docker

# Поднять все сервисы
docker-compose -f docker-compose.dev.yml up -d --build

# Проверить статус
docker ps
```

**Результат**: API, PostgreSQL, Redis, Prisma Studio, Redis Commander, Prometheus и Grafana — все запущены.

### 4. Подготовка базы данных

**Docker:**
```bash
# Применить миграции
npm run docker:migrate

# Сгенерировать Prisma Client
npm run docker:generate

# Заполнить тестовыми данными
npm run docker:seed
```

**Локально (без Docker):**
```bash
npm run prisma:migrate
npx prisma generate
npm run seed
```

### 5. Запуск в режиме разработки (без Docker)

```bash
npm run start:dev
```

### 6. Проверка работы

| Сервис               | URL                                               |
| -------------------- | ------------------------------------------------- |
| **API**              | http://localhost:4000                              |
| **Swagger Docs**     | http://localhost:4000/docs                         |
| **Health Check**     | http://localhost:4000/health                       |
| **Prisma Studio**    | http://localhost:5555                              |
| **Redis Commander**  | http://localhost:8081 (login: `admin` / `admin`)   |
| **Prometheus**       | http://localhost:9090                              |
| **Grafana**          | http://localhost:3001 (login: `admin` / `admin`)   |

---

## 🔐 Переменные окружения

<details>
<summary><strong>Полный список переменных (.env)</strong></summary>

| Переменная              | Обязательна | Описание                                        | Значение по умолчанию |
| ----------------------- | :---------: | ----------------------------------------------- | --------------------- |
| `NODE_ENV`              | ✅          | Окружение (`development` / `production`)         | `development`         |
| `PORT`                  | ❌          | Порт API                                         | `4000`                |
| `API_URL`               | ❌          | Публичный URL API                                | `http://localhost:4000` |
| `FRONTEND_URL`          | ✅ (prod)   | URL фронтенда (через запятую для нескольких)     | `http://localhost:3000` |
| **База данных**         |             |                                                  |                       |
| `DATABASE_URL`          | ✅          | Строка подключения PostgreSQL                    | —                     |
| **Redis**               |             |                                                  |                       |
| `REDIS_URL`             | ✅          | URL подключения Redis                            | `redis://redis:6379`  |
| `REDIS_HOST`            | ❌          | Хост Redis                                       | `redis`               |
| `REDIS_PORT`            | ❌          | Порт Redis                                       | `6379`                |
| **JWT & Шифрование**    |             |                                                  |                       |
| `JWT_ACCESS_SECRET`     | ✅          | Секрет для access-токенов (мин. 32 символа)      | —                     |
| `JWT_REFRESH_SECRET`    | ✅          | Секрет для refresh-токенов (мин. 32 символа)     | —                     |
| `JWT_ACCESS_EXPIRY`     | ❌          | Время жизни access-токена                        | `3d`                  |
| `ID_ENCRYPTION_SECRET`  | ✅          | Секрет шифрования ID (32 символа)                | —                     |
| `ENCRYPTION_KEY`        | ✅          | Ключ шифрования (64 hex-символа)                 | —                     |
| **OAuth (опционально)** |             |                                                  |                       |
| `GOOGLE_CLIENT_ID`      | ❌          | Google OAuth Client ID                           | —                     |
| `GOOGLE_CLIENT_SECRET`  | ❌          | Google OAuth Client Secret                       | —                     |
| `FACEBOOK_APP_ID`       | ❌          | Facebook App ID                                  | —                     |
| `FACEBOOK_APP_SECRET`   | ❌          | Facebook App Secret                              | —                     |
| **Платежи MIA**         |             |                                                  |                       |
| `MIA_CLIENT_ID`         | ❌          | MIA/MAIB Client ID                               | —                     |
| `MIA_CLIENT_SECRET`     | ❌          | MIA/MAIB Client Secret                           | —                     |
| `MIA_BASE_URL`          | ❌          | Базовый URL MIA API                              | `https://api.maib.md` |
| `MIA_SANDBOX`           | ❌          | Включить sandbox-режим                           | `true`                |
| **Файловое хранилище**  |             |                                                  |                       |
| `B2_APPLICATION_KEY_ID` | ❌          | Backblaze B2 Key ID                              | —                     |
| `B2_APPLICATION_KEY`    | ❌          | Backblaze B2 Application Key                     | —                     |
| `B2_BUCKET`             | ❌          | Название бакета                                  | `moldmasters-uploads` |
| `B2_REGION`             | ❌          | Регион B2                                        | `eu-central-003`      |
| **Уведомления**         |             |                                                  |                       |
| `TWILIO_ACCOUNT_SID`    | ❌          | Twilio Account SID                               | —                     |
| `TWILIO_AUTH_TOKEN`     | ❌          | Twilio Auth Token                                | —                     |
| `TWILIO_PHONE_NUMBER`   | ❌          | Номер Twilio для SMS                             | —                     |
| `TELEGRAM_BOT_TOKEN`    | ❌          | Telegram Bot Token                               | —                     |
| `TELEGRAM_CHAT_ID`      | ❌          | Telegram Chat ID                                 | —                     |
| `EMAIL_ENABLED`         | ❌          | Включить отправку email                          | `false`               |
| `SMS_ENABLED`           | ❌          | Включить отправку SMS                            | `false`               |
| **Rate Limiting**       |             |                                                  |                       |
| `RATE_LIMIT_TTL`        | ❌          | Окно лимита (мс)                                 | `60000`               |
| `RATE_LIMIT_MAX`        | ❌          | Макс. запросов в окне                            | `100`                 |

</details>

---

## 🐳 Docker

### Режим разработки (Dev)

```bash
# Поднять все сервисы
npm run docker:dev:up

# Полная пересборка (без кэша)
npm run docker:dev:build

# Логи API
npm run docker:logs

# Остановить
npm run docker:dev:down
```

**Сервисы dev-стека:**

| Контейнер                    | Порт  | Назначение                  |
| ---------------------------- | ----- | --------------------------- |
| `masterhub-api-dev`          | 4000  | NestJS API                  |
| `masterhub-postgres`         | 5432  | PostgreSQL                  |
| `masterhub-redis`            | 6379  | Redis                       |
| `masterhub-redis-commander`  | 8081  | Redis GUI                   |
| `masterhub-prisma-studio`    | 5555  | Визуальный редактор БД      |
| `masterhub-prometheus-dev`   | 9090  | Сбор метрик                 |
| `masterhub-grafana-dev`      | 3001  | Дашборды мониторинга        |

### Режим продакшн (Prod)

```bash
# Поднять продакшн стек
npm run docker:prod:up

# Пересборка с нуля
npm run docker:prod:rebuild

# Логи
npm run docker:prod:logs

# Остановить
npm run docker:prod:down
```

**Продакшн стек** использует порты `4001` (API), `5433` (PostgreSQL), `6380` (Redis), `9091` (Prometheus), `3002` (Grafana).

### Dockerfile

Многоступенчатая сборка с оптимизацией:

```
builder       → Компиляция TypeScript + Prisma Generate
dependencies  → Только production-зависимости
production    → Минимальный Alpine образ + non-root user + dumb-init + healthcheck
development   → Полная среда с hot-reload
```

---

## 📜 Команды NPM

### Разработка

| Команда                | Описание                              |
| ---------------------- | ------------------------------------- |
| `npm run start:dev`    | Запуск с hot-reload (watch mode)      |
| `npm run start:debug`  | Запуск с дебаггером                   |
| `npm run build`        | Сборка TypeScript → JavaScript        |
| `npm run start:prod`   | Запуск из собранного `dist/`          |
| `npm run lint`         | ESLint проверка + автофикс            |
| `npm run format`       | Prettier форматирование               |

### Prisma & База данных

| Команда                          | Описание                             |
| -------------------------------- | ------------------------------------ |
| `npm run prisma:generate`        | Генерация Prisma Client             |
| `npm run prisma:migrate`         | Создание и применение миграции       |
| `npm run prisma:studio`          | Запуск Prisma Studio (GUI)           |
| `npm run prisma:reset`           | ⚠️ Полный сброс БД                   |
| `npm run seed`                   | Заполнение БД тестовыми данными      |
| `npm run local:recreate:db`      | Полное пересоздание БД (reset → migrate → generate → seed) |

### Docker

| Команда                          | Описание                              |
| -------------------------------- | ------------------------------------- |
| `npm run docker:dev:up`          | Поднять dev-стек                      |
| `npm run docker:dev:down`        | Остановить dev-стек                   |
| `npm run docker:dev:build`       | Пересобрать без кэша                  |
| `npm run docker:logs`            | Логи API контейнера                   |
| `npm run docker:migrate`         | Миграции в dev-контейнере             |
| `npm run docker:migrate:create`  | Создать новую миграцию                |
| `npm run docker:seed`            | Сид данных в dev-контейнере           |
| `npm run docker:generate`        | Prisma Generate в контейнере          |
| `npm run docker:studio`          | Запуск Prisma Studio контейнера       |
| `npm run docker:dev:recreate`    | Полное пересоздание dev-БД            |
| `npm run docker:prod:up`         | Поднять prod-стек                     |
| `npm run docker:prod:rebuild`    | Пересобрать и обновить prod           |

### Redis

| Команда                | Описание                              |
| ---------------------- | ------------------------------------- |
| `npm run redis:cli`    | Подключиться к Redis CLI              |
| `npm run redis:keys`   | Показать все cache-ключи              |
| `npm run redis:flush`  | ⚠️ Очистить все данные Redis           |
| `npm run redis:commander` | Запуск Redis Commander GUI         |

### Тестирование

| Команда                | Описание                              |
| ---------------------- | ------------------------------------- |
| `npm test`             | Юнит-тесты                           |
| `npm run test:watch`   | Юнит-тесты в watch-режиме            |
| `npm run test:cov`     | Юнит-тесты с покрытием               |
| `npm run test:e2e`     | E2E тесты                            |
| `npm run test:api`     | API-тесты                            |

### Утилиты

| Команда                       | Описание                         |
| ----------------------------- | -------------------------------- |
| `npm run generate:secrets`    | Генерация JWT/шифровальных ключей |
| `npm run backup`              | Резервное копирование БД         |
| `npm run restore`             | Восстановление из бэкапа         |

---

## 📂 Структура проекта

```
api-master/
├── .github/
│   ├── dependabot.yml          # Автообновление зависимостей
│   └── workflows/
│       ├── backend-ci.yml      # CI: lint + тесты
│       ├── docker-build.yml    # CI: сборка Docker-образа
│       ├── docker-health.yml   # CI: проверка healthcheck
│       └── pr-checks.yml      # CI: проверки PR
├── docker/
│   ├── backups/               # Бэкапы БД
│   ├── grafana/               # Конфиги Grafana (dashboards + datasources)
│   ├── prometheus.yml         # Конфиг Prometheus
│   └── redis.conf             # Конфиг Redis
├── prisma/
│   ├── migrations/            # SQL миграции
│   ├── schema.prisma          # Схема базы данных
│   └── seed.ts                # Сидинг тестовых данных
├── scripts/
│   └── generate-secrets.js    # Генератор секретов
├── src/
│   ├── app.module.ts          # Корневой модуль приложения
│   ├── main.ts                # Точка входа (bootstrap)
│   ├── config/                # Конфигурация (Winston, etc.)
│   ├── common/                # Общие утилиты
│   │   ├── constants/         # Константы
│   │   ├── decorators/        # Кастомные декораторы
│   │   ├── filters/           # Фильтры исключений
│   │   ├── guards/            # Guards (Auth, Roles, etc.)
│   │   ├── helpers/           # Вспомогательные функции
│   │   ├── interceptors/      # Interceptors (Transform, Timeout, etc.)
│   │   ├── interfaces/        # Общие интерфейсы
│   │   └── pipes/             # Валидационные пайпы
│   ├── middleware/             # Express middleware
│   └── modules/               # >>> Бизнес-модули (см. ниже) <<<
├── test/
│   ├── api/                   # API / E2E тесты
│   ├── unit/                  # Юнит-тесты
│   ├── jest-e2e.json          # Конфиг E2E тестов
│   └── jest-unit.json         # Конфиг юнит-тестов
├── uploads/                   # Локальные загрузки (dev)
├── logs/                      # Логи Winston
├── Dockerfile                 # Многоступенчатый Dockerfile
├── docker-compose.dev.yml     # Docker Compose для разработки
├── docker-compose.prod.yml    # Docker Compose для продакшна
├── package.json
├── tsconfig.json
└── eslint.config.mjs
```

---

## 🧩 API-модули

Проект содержит **30 бизнес-модулей** в `src/modules/`:

| Модуль                | Описание                                              |
| --------------------- | ----------------------------------------------------- |
| `admin`               | Административная панель (статистика, управление)      |
| `analytics`           | Аналитика и метрики                                   |
| `audit`               | Аудит-логирование действий                            |
| `auth`                | Аутентификация (JWT, OAuth2, Refresh tokens)          |
| `bookings`            | Управление бронированиями                             |
| `cache-warming`       | Прогрев кэша популярных данных                        |
| `categories`          | Категории услуг                                       |
| `chat`                | Чат в реальном времени (WebSocket)                    |
| `cities`              | Справочник городов Молдовы                            |
| `email`               | Email-уведомления (Nodemailer)                        |
| `export`              | Экспорт данных (Excel, PDF)                           |
| `favorites`           | Избранные мастера                                     |
| `files`               | Загрузка и хранение файлов (S3/B2)                    |
| `ideas`               | Идеи / предложения пользователей                      |
| `leads`               | Заявки от клиентов + антиспам                         |
| `masters`             | Профили мастеров, поиск, фильтрация                   |
| `notifications`       | Push/SMS/Email уведомления                            |
| `payments`            | Платежи (MIA/MAIB QR)                                 |
| `phone-verification`  | Верификация по номеру телефона                        |
| `promotions`          | Промо-акции и скидки                                  |
| `recommendations`     | Рекомендательная система                              |
| `reports`             | Жалобы и отчёты                                       |
| `reviews`             | Отзывы и рейтинги мастеров                            |
| `security`            | Безопасность (rate limiting, brute-force protection)  |
| `shared`              | Общие сервисы (Prisma, Redis, etc.)                   |
| `tariffs`             | Тарифные планы (Free / Premium)                       |
| `tasks`               | Фоновые задачи (Bull Queues)                          |
| `users`               | Управление пользователями                             |
| `verification`        | Верификация мастеров                                  |
| `websocket`           | WebSocket Gateway (Socket.IO)                         |

---

## 🗄 База данных

### Prisma ORM

- **Схема**: `prisma/schema.prisma`
- **Migrации**: `prisma/migrations/`
- **Сид**: `prisma/seed.ts`
- **Адаптер**: `@prisma/adapter-pg` (нативный PostgreSQL драйвер)

### Полезные команды

```bash
# Визуальный редактор БД
npm run prisma:studio

# Создать новую миграцию
npx prisma migrate dev --name описание_миграции

# Применить миграции (продакшн)
npx prisma migrate deploy

# Полный сброс (⚠️ удалит все данные!)
npm run prisma:reset
```

---

## 🧪 Тестирование

```bash
# Юнит-тесты
npm test

# С покрытием
npm run test:cov

# E2E / API-тесты
npm run test:e2e
npm run test:api

# Watch-режим (при разработке)
npm run test:watch
```

**Конфигурации**: `test/jest-unit.json`, `test/jest-e2e.json`

---

## 📊 Мониторинг

### Prometheus + Grafana

Метрики собираются через `@willsoto/nestjs-prometheus` и `prom-client`:

- **Prometheus**: http://localhost:9090 — сбор и хранение метрик
- **Grafana**: http://localhost:3001 — дашборды визуализации

Конфигурации в `docker/prometheus.yml` и `docker/grafana/`.

### Логирование (Winston)

Структурированное логирование с ротацией файлов:

- **Директория**: `logs/`
- **Формат**: JSON (prod) / Colorized (dev)
- **Ротация**: `winston-daily-rotate-file`

### Health Check

```bash
curl http://localhost:4000/health
```

API использует `@nestjs/terminus` для проверки здоровья сервисов (БД, Redis).

---

## ⚙️ CI/CD

GitHub Actions workflows в `.github/workflows/`:

| Workflow              | Триггер     | Описание                                    |
| --------------------- | ----------- | ------------------------------------------- |
| `backend-ci.yml`      | push / PR   | Lint → Unit-тесты → Type-check              |
| `docker-build.yml`    | push / PR   | Сборка Docker-образа                        |
| `docker-health.yml`   | push / PR   | Проверка healthcheck в Docker               |
| `pr-checks.yml`       | PR          | Полная проверка PR (lint, тесты, сборка)    |

**Dependabot** настроен для автоматического обновления npm-зависимостей и GitHub Actions.

---

## 🚀 Продакшн деплой

### Чек-лист перед деплоем

- [ ] Установить `NODE_ENV=production`
- [ ] Сгенерировать безопасные секреты (`npm run generate:secrets`)
- [ ] Заменить дефолтные пароли PostgreSQL, Grafana, Redis
- [ ] Настроить `FRONTEND_URL` (обязателен в production!)
- [ ] Настроить SSL/TLS (reverse proxy — Nginx / Traefik)
- [ ] Настроить Backblaze B2 для файлов
- [ ] Настроить резервное копирование БД

### Деплой через Docker

```bash
# 1. Создать .env.production с prod-значениями
cp .env.docker.example .env.production
# Отредактировать .env.production

# 2. Поднять prod-стек
npm run docker:prod:up

# 3. Применить миграции
npm run docker:migrate:prod

# 4. (Первый раз) Заполнить справочные данные
npm run docker:seed:prod
```

### Безопасность в продакшне

- ✅ **Non-root** пользователь в Docker-контейнере
- ✅ **Helmet** — HTTP security headers (HSTS, CSP, etc.)
- ✅ **Rate Limiting** — защита от DDoS/brute-force
- ✅ **CORS** — только разрешённые домены
- ✅ **Validation** — глобальная валидация входных данных
- ✅ **Sanitize-HTML** — защита от XSS
- ✅ **Graceful Shutdown** — корректное завершение при SIGTERM/SIGINT
- ✅ **Secret Validation** — проверка секретов при старте в production

---

## 📜 Лицензия

**UNLICENSED** — Проприетарный проект.

© 2026 MasterHub Team. Все права защищены.
]]>
