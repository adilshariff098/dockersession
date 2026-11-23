# Todo app

React + TypeScript frontend, Spring Boot REST API, and PostgreSQL persistence. Create, edit, complete, search, filter, and delete tasks.

## Layout

```text
frontend/       React, TypeScript, Vite
backend/        Spring Boot, Maven wrapper, JPA, validation, Flyway
.env.example    Example database settings
```

## Requirements

- Node.js 22.12+ and npm.
- JDK 21+ on PATH.
- A running PostgreSQL server and an existing database/user.
- Maven is provided by the backend's Maven wrapper.

## Database

The backend defaults to `localhost:5433`, database `todo_app`, user `todo_app`. Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, and `DB_PASSWORD` to use another server. Flyway creates the tables automatically when the backend starts.

The existing project-local PostgreSQL runtime and saved tasks remain in the ignored `.local/` directory. To start that database manually, run from the repository root:

```powershell
& '.\.local\postgres\pgsql\bin\pg_ctl.exe' start -D '.\.local\postgres-data' -l '.\.local\postgres.log' -o '-h localhost -p 5433' -w
```

To stop it:

```powershell
& '.\.local\postgres\pgsql\bin\pg_ctl.exe' stop -D '.\.local\postgres-data' -m fast -w
```

Keep the existing `.env` and `.local/postgres-data` together. The password in `.env` belongs to that database; editing the file does not change the PostgreSQL role password.

## Run the backend

In one PowerShell terminal:

```powershell
cd 'C:\Users\muzam\Desktop\github\todo app\backend'
$env:DB_HOST = 'localhost'
$env:DB_PORT = '5433'
$env:DB_NAME = 'todo_app'
$env:DB_USERNAME = 'todo_app'
$env:DB_PASSWORD = (Get-Content -LiteralPath '..\.env' | Where-Object { $_ -match '^DB_PASSWORD=' }) -replace '^DB_PASSWORD=', ''
.\mvnw.cmd spring-boot:run
```

The password command reads the existing root `.env`; Spring Boot does not load that file automatically. If using your own PostgreSQL server, set `DB_PASSWORD` to that user's password instead and adjust the other connection settings.

The API listens on **http://localhost:8080**. Health: **http://localhost:8080/actuator/health**.

## Run the frontend

In another PowerShell terminal:

```powershell
cd 'C:\Users\muzam\Desktop\github\todo app\frontend'
npm.cmd ci
npm.cmd run dev
```

Open **http://localhost:5173**. The browser calls `http://localhost:8080/api/todos` directly. The backend allows requests from `http://localhost:5173` through CORS. Use Ctrl+C in each terminal to stop the frontend and backend.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/todos` | List tasks, newest first |
| GET | `/api/todos/{id}` | Get one task |
| POST | `/api/todos` | Create a task |
| PUT | `/api/todos/{id}` | Update a task |
| PATCH | `/api/todos/{id}/completion` | Change completion |
| DELETE | `/api/todos/{id}` | Delete a task |

Create/update body:

```json
{"title":"Learn Spring Boot","description":"Build one small feature","completed":false}
```

Completion body: `{"completed":true}`. Titles are required and limited to 160 characters; notes are optional and limited to 1000. IDs are UUIDs.

## Verify

With PostgreSQL running and the connection environment variables set in your backend terminal:

```powershell
.\mvnw.cmd verify
```

Integration tests use a separate `todo_test` schema and roll back task changes.

From the frontend directory:

```powershell
npm.cmd run build
npm.cmd run lint
```

Credentials, local database files, dependencies, and build output are excluded by `.gitignore`.

For Docker Compose, override `DB_HOST` to the PostgreSQL service name (for example, `db`) and `DB_PORT` to `5432`. A separate backend container cannot reach the database container using `localhost`. Publish database port `5433:5432` to access it from your host at `localhost:5433`.




# Docker Setup

## Prerequisites

- Docker Desktop
- Docker Compose V2

## Environment Setup

Copy the example environment file:

```powershell
Copy-Item .env.example .env
```

Update DB_PASSWORD in .env.

## Build and Start

From the repository root:

```bash
docker compose up --build
```

The application will be available at:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8080/api/todos
- Backend health: http://localhost:8080/actuator/health
- PostgreSQL: localhost:5433

## Run in Background

```bash
docker compose up --build -d
```

## View Running Containers

```bash
docker compose ps
```

## View Logs

```bash
docker compose logs -f
```

Individual services:

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

## Stop Application

```bash
docker compose down
```

This stops and removes the containers and network,
but preserves the PostgreSQL named volume.

## Rebuild Application

```bash
docker compose up --build -d
```

## Remove Containers and Database Volume

```bash
docker compose down -v
```

WARNING: This permanently removes the Compose-managed
PostgreSQL data volume.
