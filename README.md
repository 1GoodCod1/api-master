# MoldMasters Project ⚒️🇲🇩

A comprehensive platform designed for searching and managing service professionals (masters) in Moldova.

---

## 🏗 Project Structure

The project is organized as a **Monorepo**, separating the system into two main parts for better scalability and deployment flexibility.

*   **[`/backend`](./backend)** — NestJS API, PostgreSQL, Prisma ORM, Redis, Bull Queues, and Websockets.
*   **[`/frontend`](./frontend)** — React application powered by Vite, RTK Query, and TailwindCSS.

---

## 🚀 Quick Start

### 1. Environment Setup (.env)
Navigate to the `backend` directory, copy the example configuration, and fill in the required variables:
```bash
cd backend
cp .env.example .env
```
**Minimum required settings:**
- `DATABASE_URL`: Database connection string.
  *(Docker default: `postgresql://{user}:{password}@postgres:5432/project3`)*
- `JWT_ACCESS_SECRET`: A long random string for token security.
- `ID_ENCRYPTION_SECRET`: A 32-character secret for ID masking.

### 2. Launch with Docker (Recommended) 🐳
Copy Docker env templates (if not present) and start the stack:
```bash
# From project root
cp backend/.env.docker.example backend/.env.docker
cp frontend/.env.docker.example frontend/.env.docker
docker-compose -f docker-compose.dev.yml up -d --build
```

### 3. Database Operations (Migrations & Seeding)
After the containers are running, you need to prepare the database.

**Using Docker:**
```bash
# Apply database migrations
docker exec -it moldmasters-api-dev npx prisma migrate dev

# Populate the database with test data (masters, categories, etc.)
docker exec -it moldmasters-api-dev npm run seed
```

**Local (Manual):**
```bash
cd backend
npm install
npm run prisma:migrate
npx prisma generate
npm run seed
```

---

## 🛠 System Components

- **API Documentation:** `http://localhost:4000/docs` (Swagger)
- **Frontend Application:** `http://localhost:3000`
- **Database Management:** `npx prisma studio` (accessible locally or via container on port `5555`)

---

## 📜 Contacts & License
**MoldMasters Team** | All rights reserved © 2026
