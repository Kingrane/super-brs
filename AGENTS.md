# Agent Guidelines for brs-test

## Mission

This repository is an API-first web client for SFEDU BRS (`grade.sfedu.ru`) with:
- local runtime via Express (`server.js` + `public/*`)
- deploy runtime via Vercel serverless handlers (`api/*`)

Primary mission for any contributor/agent:
1. Keep API behavior consistent across local and Vercel runtimes.
2. Preserve upstream compatibility (proxy-style behavior, no lossy transformations).
3. Keep the frontend resilient, responsive, and production-like.
4. Improve design quality without reducing readability/accessibility.

---

## Current Architecture

```text
api/
  _gradeFetch.js               # upstream fetch with timeout + user-agent
  _http.js                     # shared HTTP helpers (error + passthrough)
  _studentApi.js               # student proxy helpers + query validation
  student/
    semester_list.js           # GET /api/student/semester_list
    index.js                   # GET /api/student/index
    discipline/
      journal.js               # GET /api/student/discipline/journal
      subject.js               # GET /api/student/discipline/subject

public/
  index.html                   # main UI (minimal React root)
  app.js                       # React SPA (React 18 + htm, no build step)
  styles.css                   # visual system + responsive layout
  favicon.svg                  # app icon

server.js                      # Express app that mounts same handlers from api/*
package.json                   # scripts (start/dev)
vercel.json                    # Vercel static settings
```

### Frontend: React SPA

- **Stack**: React 18 + htm (JSX-like via template literals) + ReactDOM
- **Import**: ESM from CDN (`esm.sh/react@18`, `esm.sh/react-dom@18`, `esm.sh/htm@3`)
- **Build**: None required — runs directly in browser as ESM module
- **File structure**: All React code in single `public/app.js` (837 lines)
- **Styling**: Vanilla CSS in `public/styles.css` (no CSS-in-JS)
- **State**: React hooks (`useState`, `useMemo`, `useEffect`, `useRef`)

> **Note on future migration**: If needed, React can later be migrated to a Vite-based build (using JSX, separate component files in `src/`, etc.). Current approach (htm + CDN) is intentionally simple — no build step needed, works directly in browser.

Key invariant: `server.js` must call handlers from `api/*`, not duplicate endpoint logic.

Key invariant: All React code lives in `public/app.js` — no separate `src/` build step.

---

## API Documentation Coverage Target

Base docs: `https://grade.sfedu.ru/restapi/`

Student-facing endpoints to support at minimum:
- `GET /api/v1/student/semester_list`
- `GET /api/v1/student`
- `GET /api/v1/student/discipline/journal`
- `GET /api/v1/student/discipline/subject`

When adding new functionality, follow this policy:
1. Add serverless handler in `api/student/**`.
2. Reuse shared helpers (`_studentApi.js`, `_http.js`, `_gradeFetch.js`).
3. Mount in `server.js` via `app.all` + adapter.
4. Add frontend consumer only after endpoint works in both runtimes.

---

## Backend Contract Rules

### Methods and Validation
- Every handler must enforce method via `requireMethod(req, res, "GET")` (or needed method).
- Required query params must be validated before upstream calls.
- Token validation is intentionally tolerant (minimum length check) because token format may vary by environment.

### Error Response Format
Always return:

```json
{
  "error": "Human readable message",
  "details": "Optional technical details"
}
```

Status codes:
- `400` invalid/missing request params
- `405` method not allowed
- `502` upstream timeout/network failure/transport issue

### Upstream Pass-through
- Keep upstream status code.
- Keep upstream body as-is.
- Preserve upstream `content-type` when available.

### Network/Timeout Requirements
- Use `AbortController` timeout in upstream requests.
- Timeout stays at `12_000` ms unless explicitly changed.
- Keep `user-agent` header in upstream requests.

---

## Frontend Product Rules

### UX States (Mandatory)
Each async block must support:
- loading skeleton
- empty state
- error state with retry action
- success state

### Data Flow
- Token/session state in memory + localStorage (`remember` mode).
- Semesters and discipline index are loaded first.
- Discipline details loaded per discipline, cached by key:
  - `semesterID:disciplineID`

### Rendering Requirements
- Discipline list must be interactive and keyboard-safe.
- Tabs must work without layout shift.
- Debug panel should remain available for troubleshooting API response shapes.

### Language and Domain Copy
- UI copy should be Russian-first.
- Domain naming should prefer `БРС ЮФУ` over generic English labels.
- Discipline types should be localized in UI:
  - `exam` -> `Экзамен`
  - `credit` -> `Зачет`
  - `difftest` -> `Дифференцированный зачет`
  - `coursework` -> `Курсовая работа`
  - `practice` -> `Практика`

### Grades/Progress Display Policy
- Primary badge should show percentage where possible (`Rate / MaxCurrentRate`).
- Keep color semantics consistent:
  - excellent / good / mid / bad / muted
- If percentage cannot be computed, fallback to normalized mapping from known marks.

---

## Visual System Rules

Current visual direction:
- warm academic glass aesthetic
- neutral background + a single teal accent
- compact, service-like density (no oversized decorative blocks)

Do:
- preserve clear hierarchy and spacing rhythm
- keep responsive behavior stable (mobile first fallback)
- maintain readable contrast and visible focus states

Do not:
- switch to random palette/theme each change
- introduce visual noise that reduces clarity
- break desktop/mobile parity of key actions

---

## Runtime and Scripts

`package.json` scripts:
- `npm start` -> `node server.js`
- `npm run dev` -> `node server.js`

Notes:
- In local development, port conflicts (`EADDRINUSE`) are environment issues; kill previous process or set `PORT`.
- Vercel deploy should keep `api/*` serverless handlers as source of API behavior.

---

## Quality Checklist Before Finishing Any Task

Backend:
- [ ] Handler exists in `api/*` and uses shared helpers.
- [ ] `server.js` route is mounted for local runtime.
- [ ] Method + params + error schema verified.
- [ ] Upstream status/body/content-type passthrough preserved.

Frontend:
- [ ] Loading/empty/error/retry states present.
- [ ] Mobile layout checked (`<=768px`) and desktop checked.
- [ ] Russian copy and domain terms are consistent.
- [ ] No console errors from changed logic.

Project:
- [ ] `node --check` passes for edited JS files.
- [ ] `git status --short` reviewed for accidental artifacts.
- [ ] AGENTS.md updated if architecture/contracts changed.

---

## Change Management Policy

When updating this repo, avoid hidden drift:
1. If endpoint contract changes, update `AGENTS.md` and frontend expectations.
2. If UI behavior changes, ensure fallback for incomplete API response shape.
3. If a new endpoint is added, wire it in both serverless and local Express path.

Use small, verifiable increments. Prefer correctness and stability over flashy rewrites.

---

## React Native Migration Plan

### Overview

Цель - создать мобильное приложение из существующего web-приложения БРС ЮФУ.

### Что можно переиспользовать

- **Бизнес-логика**: API вызовы, валидация токена, кеширование данных
- **Состояние**: React hooks (`useState`, `useMemo`, `useEffect`, `useRef`)
- **Архитектура данных**: структуры Semester, Discipline, Journal, Module

### Что переписывать

| Компонент | Web (текущее) | Mobile (новое) |
|-----------|---------------|----------------|
| UI фреймворк | React + htm | React Native |
| Навигация | browser routing | React Navigation |
| Стилизация | CSS / styles.css | StyleSheet |
| Компоненты | `<div>`, `<span>`, `<button>` | `<View>`, `<Text>`, `<TouchableOpacity>` |
| Хранение | localStorage | AsyncStorage |
| HTTP | fetch | fetch / axios |

### Этапы миграции

#### Этап 1: Подготовка (1-2 дня)
- [ ] Настроить проект: `npx react-native init BRSApp`
- [ ] Создать папку `src/api` - скопировать логику API из `public/app.js`
- [ ] Настроить React Navigation (Stack + Bottom Tabs)

#### Этап 2: Экраны авторизации (1 день)
- [ ] Экран входа (LoginScreen)
- [ ] Логика валидации токена
- [ ] Сохранение токена в AsyncStorage

#### Этап 3: Основные экраны (2-3 дня)
- [ ] Экран списка семестров (SemesterListScreen)
- [ ] Экран списка дисциплин (DisciplineListScreen)
- [ ] Экран деталей дисциплины с табами (GradeDetailScreen)

#### Этап 4: UI компоненты (1-2 дня)
- [ ] Создать переиспользуемые компоненты: Card, Button, Input, Badge
- [ ] Адаптировать цветовую систему из styles.css

#### Этап 5: Сборка (1 день)
- [ ] Настроить Android/iOS сборку
- [ ] Протестировать на устройстве

### Альтернатива: Capacitor / PWA

Если полноценное нативное приложение не требуется:
- Использовать **Capacitor** для обёртки web-приложения
- Минусы: webview, не нативный UI
- Плюсы: минимум изменений кода

### Рекомендация

Для БРС ЮФУ оптимален **React Native** (полная миграция) учитывая:
- Ежедневное использование студентами
- Нужны push-уведомления о новых баллах
- Работа офлайн (кеш оценок)
- Нативный UI важнее для мобильного опыта
