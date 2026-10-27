# Project Context — VINCULO Project Manager (hybrid_project_manager)

**Project**: `hybrid_project_manager` (VINCULOsync)  
**Last Updated**: 2026-10-26  
**Persistence Mode**: `atl` (Local file persistence)

---

## Executive Summary

**VINCULO Project Manager** es una plataforma integral de gestión híbrida de proyectos diseñada para sincronizar la planificación predictiva y ágil en equipos multidisciplinarios.

Combina:
1. **Ágil**: Sprints (SP0 a SP7), tableros Kanban interactivos, backlog y control de estados de flujo.
2. **Predictivo / Procesos**: Diagramas de Gantt con cálculo de dependencias y fechas de semanas calendario, flujos de modelado de procesos de negocio con BPMN.js.
3. **Sincronización GitHub**: Mapeo directo de repositorios, ramas por área, commits y alertas de fallos o fixes vía webhooks y API de GitHub.
4. **Motor de Ingesta**: Importador automatizado (`import_vinculo`) para planillas Excel (`Tareas_VINCULOsync_FINAL.xlsx`) que estructura tareas, áreas, dependencias y criterios de aceptación (`☐`, `✅`).
5. **Experiencia Visual**: Interfaz web reactiva con componentes 3D (Three.js/Fiber) y mapa de avance gamificado.

---

## Technical Stack & Architecture

### Backend
- **Framework**: Django 5.0 + Django REST Framework (DRF)
- **ASGI / WebSockets**: Daphne + Django Channels 4 + Channels-Redis
- **Background Jobs**: Celery 5.3 + Redis 7
- **Database**: PostgreSQL 16
- **Auth**: JWT con `djangorestframework-simplejwt` + Perfiles de usuario (`director`, `arquitecto`, `lector`)
- **Email Engine**: Plantillas MJML compiladas a HTML

### Frontend
- **Core**: React 18.3 + TypeScript + Vite 5.4 + React Router 6
- **Visualización & 3D**: Three.js + `@react-three/fiber` + `@react-three/drei`
- **Diagramación BPMN**: `bpmn-js` 17.11
- **Animaciones & UI**: Anime.js + Lucide React + CSS personalizado

### Infraestructura
- **Docker Compose**: Orquestación de 5 servicios (`db`, `redis`, `backend`, `celery`, `frontend`)
- **Deploy**: Preparado para entornos contenerizados (ej. Dokploy / Traefik / Docker standalone)

---

## Project Structure

```
hybrid_project_manager/
├── .atl/                   # Contexto de orquestación y skill registry
├── backend/
│   ├── config/             # Configuración Django, ASGI, URLs, Celery
│   ├── apps/
│   │   ├── core/           # Modelos base (Proyecto, Sprint, Tarea, Area, UserProfile, Evento), importador Excel
│   │   ├── tasks/          # Endpoints CRUD de tareas y estados de Kanban
│   │   ├── sprints/        # Gestión y métricas de sprints
│   │   ├── gantt/          # Endpoints y lógica de cronogramas Gantt
│   │   └── github_sync/    # Sincronización con GitHub (conexiones, branches, commits, alertas)
│   ├── templates/emails/   # Fuentes MJML y HTML compilados
├── frontend/
│   ├── src/
│   │   ├── pages/          # Dashboard, Kanban, Gantt, SprintFlow, SprintStatus, BpmnPage, GameMapPage, GitHubPage
│   │   ├── components/     # Modales de tareas, GanttChart, GameMap, pestañas de conexión/alertas
│   │   ├── api.ts          # Cliente HTTP centralizado con token JWT
│   │   └── ThreeBackground.tsx # Renderizado de fondo 3D
├── docker-compose.yml      # Entorno de ejecución multi-contenedor
└── README.md
```
