# Agent Guidelines for brs-test

## Mission

This repository is an API-first web client for SFEDU BRS (`grade.sfedu.ru`) with:
- local runtime via Express (`server.js` + `public/*`)
- deploy runtime via Vercel serverless handlers (`api/*`)
- native Android app via React Native (`BRSApp/*`)

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

BRSApp/                        # React Native mobile app (Android)
  index.js                     # entry point
  App.tsx                      # root component
  src/
    api/client.js              # API fetch layer (same endpoints)
    utils/storage.js            # AsyncStorage wrapper
    utils/helpers.js            # shared helpers (formatting, validation)
    theme/index.js              # design tokens (colors, fonts, spacing)
    components/
      StateLoading.js           # loading skeleton
      StateEmpty.js             # empty state
      StateError.js             # error state with retry
      GradeBadge.js             # grade chip (colored by tone)
      DisciplineCard.js         # discipline in list
      TeacherRow.js             # teacher avatar + name
      ModuleCard.js             # module with submodules
      JournalTable.js           # scrollable journal table
      SemesterPicker.js         # semester chip selector
    screens/
      LoginScreen.js            # token entry + remember + auto-login
      DashboardScreen.js        # semester picker + discipline list
      DetailScreen.js           # tabs: grade, journal, modules, teachers
    navigation/
      AppNavigator.js           # Stack navigator (Login → Main → Detail)
  android/                      # native Android project (generated)
  ios/                          # native iOS project (generated)
```

### Frontend: React SPA (Web)

- **Stack**: React 18 + htm (JSX-like via template literals) + ReactDOM
- **Import**: ESM from CDN (`esm.sh/react@18`, `esm.sh/react-dom@18`, `esm.sh/htm@3`)
- **Build**: None required — runs directly in browser as ESM module
- **File structure**: All React code in single `public/app.js`
- **Styling**: Vanilla CSS in `public/styles.css` (no CSS-in-JS)
- **State**: React hooks (`useState`, `useMemo`, `useEffect`, `useRef`)

### Mobile: React Native (Android)

- **Stack**: React Native 0.85 + React Navigation
- **Build**: `npx react-native run-android`
- **File structure**: Component-based in `BRSApp/src/`
- **Styling**: `StyleSheet.create()` matching web academic palette
- **State**: React hooks + AsyncStorage for persistence
- **API**: Direct fetch to Express backend at `10.0.2.2:3000` (Android emulator)

Key invariant: `server.js` must call handlers from `api/*`, not duplicate endpoint logic.

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
- Token/session state in memory + localStorage (web) / AsyncStorage (mobile) (`remember` mode).
- Semesters and discipline index are loaded first.
- Discipline details loaded per discipline.

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
- warm academic paper aesthetic (brownish paper tones, serif display font)
- dark ink + single accent (oxblood `#8A2417`)
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

### Web
- `npm start` -> `node server.js` (Express, port 3000)
- `npm run dev` -> `node server.js`

### Mobile (BRSApp/)
- `npx expo start` -> запуск Metro + QR код для Expo Go
- `npx eas-cli@latest build --platform android --profile preview` -> сборка APK в облаке

Notes:
- В локальной разработке порты могут конфликтовать (`EADDRINUSE`); убить процесс или поставить `PORT`.
- Vercel deploy использует `api/*` serverless handlers как источник API-поведения.
- Mobile приложение стучится напрямую к `grade.sfedu.ru`, **Express не нужен**.
- Для сборки APK требуется Expo аккаунт (бесплатно, 30 сборок/мес).

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

## React Native Migration

### Status: ✅ MIGRATED (Expo)

React Native (Expo SDK 56) project in `BRSApp/`. Стучится напрямую к `grade.sfedu.ru` — **backend не нужен**.

### Architecture

```
BRSApp/
  App.js                       # Root: SafeAreaProvider + Navigator
  index.js                     # AppRegistry entry
  app.json                     # Expo config (name, icons, android package)
  eas.json                     # EAS Build profiles (preview → APK)
  src/
    api/client.js              # fetchJson → grade.sfedu.ru (direct, no proxy)
    utils/storage.js           # getStoredAuth, setStoredAuth, clearStoredAuth (AsyncStorage)
    utils/helpers.js           # isLikelyToken, formatDisciplineType, formatTeacherShortName,
                               # formatSemesterLabel, getGradePresentation, getIndexTeachersForDiscipline
    theme/index.js             # colors (12 ink/paper/accent/grade tones), fonts, spacing
    components/
      StateLoading.js          # animated skeleton shimmer
      StateEmpty.js            # centered dash + title + desc
      StateError.js            # red left border, title, desc, retry button
      GradeBadge.js            # colored border + text by tone (excellent/good/mid/bad/muted)
      DisciplineCard.js        # title, grade badge, type, points, teachers preview
      TeacherRow.js            # avatar initials + full name + position
      ModuleCard.js            # module title + submodule list with rates
      JournalTable.js          # horizontal scroll table: date, type, topic, mark, attendance
      SemesterPicker.js        # semester chips in a flex-wrap row
    screens/
      LoginScreen.js           # token input, remember switch, auto-login
      DashboardScreen.js       # semester picker + discipline FlatList
      DetailScreen.js          # 4-tab detail view (grade/journal/modules/teachers)
    navigation/
      AppNavigator.js          # NativeStack: Login → Main → Detail
```

### Key Technical Decisions

| Area | Decision |
|------|----------|
| Framework | Expo SDK 56 + React Native |
| Navigation | @react-navigation/native-stack (3 screens) |
| Persistence | @react-native-async-storage/async-storage |
| API target | `https://grade.sfedu.ru/api/v1/student` (direct, no backend) |
| Design tokens | Ported from CSS variables → JS object |
| State per screen | Each screen owns its data (no global store) |
| Build | EAS Build (cloud), no Android Studio required |

### Что переписано из web-версии

| Компонент | Web | Mobile |
|-----------|-----|--------|
| UI фреймворк | React 18 + htm | Expo SDK 56 |
| Навигация | Browser routing (views) | React Navigation Stack |
| Стилизация | CSS (styles.css, 3237 строк) | StyleSheet.create() |
| Компоненты | div/span/button/table | View/Text/TouchableOpacity/FlatList/ScrollView |
| Хранение | localStorage | AsyncStorage |
| Тема | CSS custom properties | JS объект (theme/index.js) |
| Семестры | select element | touchable chips |
| Дисциплины | div list with counter | FlatList + DisciplineCard |
| Журнал | HTML table | ScrollView horizontal |
| Модули | article cards | View-based ModuleCard |
| Преподаватели | div rows with avatar | View-based TeacherRow |
| Backend | Express (proxy) | Не нужен |

### Available Scripts

```bash
cd BRSApp

# Запуск на телефоне (USB)
npx expo start
# Отсканировать QR код через Expo Go

# Сборка APK в облаке (без Android Studio)
npx eas-cli@latest build --platform android --profile preview
```

### Как собрать APK для одногруппников

1. Регистрация: https://expo.dev/signup (бесплатно, 30 сборок/мес)
2. Войти в EAS: `npx eas-cli@latest login`
3. Настроить проект: `npx eas-cli@latest build:configure`
4. Собрать APK: `npx eas-cli@latest build --platform android --profile preview`
5. Ссылка на APK появится в консоли → кидаешь в Telegram

### Prerequisites

1. Node.js ≥ 18
2. Expo аккаунт (бесплатный)
3. Телефон Android с USB-отладкой (для теста)
   ИЛИ просто собрать APK и скинуть (для одногруппников)

### API Configuration

App стучится напрямую к `https://grade.sfedu.ru/api/v1/student/`.
Никакого backend запускать не нужно. Работает из коробки.
