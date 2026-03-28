# Agent Guidelines for brs-test

## Project Overview

This is a Node.js/Express backend API project that proxies requests to an external grade service (grade.sfedu.ru). It serves a static frontend and provides API endpoints for student data.

## Build & Commands

### Running the Project
```bash
npm start          # Start the production server (node server.js)
```

### No Additional Commands
- No linting configured
- No tests currently exist
- No TypeScript

## Code Style Guidelines

### General
- Use ES Modules (`import`/`export`, not CommonJS `require`)
- Use 4 spaces for indentation
- No semicolons at end of statements
- Use `const` by default, `let` only when reassignment needed, avoid `var`

### Imports & Exports
- Use named exports for utilities (`export async function gradeFetch`)
- Use default exports for route handlers (`export default async function handler`)
- Import with `.js` extension in specifiers: `import { gradeFetch } from "./_gradeFetch.js"`
- Group imports: built-in modules first, then external, then local

### Naming Conventions
- **Variables/functions**: camelCase (`gradeFetch`, `semesterID`)
- **Constants**: SCREAMING_SNAKE_CASE for config values (`GRADE_ORIGIN`, `API_BASE`)
- **Files**: kebab-case (`_gradeFetch.js`, `semester_list.js`)
- **Route handlers**: name the function `handler`

### Types
- No TypeScript; use JSDoc comments if needed for clarity
- Use descriptive variable names to indicate intent

### HTTP API Patterns
```javascript
export default async function handler(req, res) {
    // Validate method
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    // Extract and validate query params
    const token = req.query.token;
    if (!token) {
        return res.status(400).json({ error: "token is required" });
    }

    // Use try/catch for upstream failures
    try {
        const { res: up, text } = await gradeFetch("/endpoint?" + qs);
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(up.status).send(text);
    } catch (e) {
        return res.status(502).json({ error: "Upstream request failed", details: e.message });
    }
}
```

### Error Handling
- Return appropriate HTTP status codes:
  - `400` for bad request / missing required params
  - `405` for method not allowed
  - `502` for upstream failures
- Include error message in JSON response: `{ error: "description" }`
- Include `details` field for debugging when applicable

### Async/Await
- Always wrap async route handlers in try/catch
- Use `finally` to clear timeouts
- Handle AbortError specifically for timeouts (optional)

### Security
- Validate all required query parameters
- Use `encodeURIComponent()` for user input in URLs
- Set appropriate Content-Type headers
- Use `new URLSearchParams()` for building query strings (preferred)

### Fetch/Network
- Use AbortController with timeout for all fetch calls
- Set 12-second timeout: `const timeoutMs = 12_000`
- Always include user-agent header
- Use `redirect: "follow"` for proxy endpoints

### Project Structure
```
api/
  _gradeFetch.js      # Shared fetch utility with timeout
  student/
    index.js          # GET /api/student endpoint
    semester_list.js   # GET /api/student/semester_list endpoint
    discipline/
      journal.js      # GET /api/student/discipline/journal endpoint
public/
  index.html          # Frontend static files
server.js             # Main Express app entry point
```

### Testing
- Test files go in `api/test.js`
- Run specific test: No test framework configured yet
- Add tests for new API endpoints covering success and error cases
