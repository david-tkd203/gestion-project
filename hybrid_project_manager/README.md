# VINCULO Project Manager

Gestión híbrida de proyectos con sincronización GitHub, tableros Kanban,
diagramas BPMN, Gantt y sprints.

## Stack

- **Backend**: Django 5.0 + DRF + Daphne (ASGI) + Celery
- **Frontend**: React 18 + TypeScript + Vite + Three.js + BPMN.js
- **DB**: PostgreSQL 16
- **Cache/Queue**: Redis 7
- **Auth**: JWT (SimpleJWT)

## Quick Start

```bash
# Clonar
git clone https://github.com/david-tkd203/gestion-project.git
cd gestion-project

# Copiar y configurar entorno
cp .env.example .env

# Levantar todo
docker compose up --build
```

Servicios:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- PostgreSQL: puerto 5432
- Redis: puerto 6379

## Estructura

```
backend/
  config/         — settings, urls, asgi, wsgi, celery
  apps/
    core/         — modelos base, servicios compartidos
    tasks/        — gestión de tareas (CRUD + Kanban)
    sprints/      — sprints y planificación
    gantt/        — diagrama Gantt
    github_sync/  — sincronización con GitHub Issues

frontend/
  src/
    pages/        — Dashboard, Kanban, Gantt, Sprints, Login
    components/   — UI reutilizable (AlertsTab, ConnectionTab, etc.)
    api.ts        — cliente HTTP con JWT
```

## Licencia

MIT
