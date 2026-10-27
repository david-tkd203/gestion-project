# Testing Capabilities — VINCULO Project Manager

**Strict TDD Mode**: true  
**Detected**: 2026-10-26  
**Persistence Mode**: `atl`

---

## Testing Capabilities

### Test Runners

- **Backend**: `pytest` con `pytest-django`
  - Configuración: `backend/pytest.ini` apuntando a `config.settings_test`
  - Base de datos de prueba: SQLite en memoria (`:memory:`)
  - Channels layer: `channels.layers.InMemoryChannelLayer`
  - Cache: `django.core.cache.backends.locmem.LocMemCache`
  - Celery: `CELERY_TASK_ALWAYS_EAGER = True`
  - Password hasher: `MD5PasswordHasher` para pruebas rápidas
  - Fixtures reutilizables en `backend/tests/conftest.py` (`api_client`, `user`, `director_user`, `proyecto`, `sprint`, `area`, `tarea`)
- **Frontend**: `vitest` con `@testing-library/react` y `jsdom`
  - Configuración: `frontend/vitest.config.ts` y setup en `frontend/src/setupTests.ts`
  - Scripts en `package.json`: `"test": "vitest run"`, `"test:watch": "vitest"`

### Test Layers

| Layer       | Available | Tool | Observaciones |
| ----------- | --------- | ---- | ------------- |
| Unit        | ✅        | `pytest` / `vitest` | Modelos, utilidades y funciones API probadas |
| Integration | ✅        | `pytest` / DRF `APIClient` | Endpoints de autenticación JWT y tareas probados |
| E2E         | ❌        | —    | No hay frameworks E2E configurados (ej. Playwright o Cypress) |

### Coverage

- **Backend**:
  - **Available**: ✅
  - **Command**: `cd backend && pytest --cov=apps`
- **Frontend**:
  - **Available**: ✅
  - **Command**: `cd frontend && npm run test -- --coverage`

### Quality Tools

| Tool         | Available | Command |
| ------------ | --------- | ------- |
| Test Runner (Backend)  | ✅ | `cd backend && pytest` |
| Test Runner (Frontend) | ✅ | `cd frontend && npm test` |
| Type checker (Frontend)| ✅ | `cd frontend && npm run build` / `tsc` |

---

## Execution Instructions

### Backend (Python / Django)

```bash
# Correr suite completa de pruebas
cd backend
pytest

# Correr con reporte de cobertura
pytest --cov=apps

# Correr archivo específico
pytest tests/test_models.py -v
```

### Frontend (React / Vite)

```bash
# Correr suite completa una sola vez
cd frontend
npm test

# Correr en modo interactivo (watch)
npm run test:watch

# Correr archivo específico
npx vitest run src/__tests__/api.test.ts
```
