# AI_GUARDRAILS.md — Rules for AI Coding Assistants Working on RoomSync

These rules are **mandatory** and must never be violated when generating or modifying code for this project.

## Structural Rules
1. Never change the existing folder structure defined in TRD.md without explicit instruction.
2. Never rename existing API endpoints, function names, or database columns without updating **all** references across routes, controllers, models, and frontend JS.
3. Never introduce new top-level folders unless explicitly requested.

## Technology Constraints
4. Use **Vanilla JavaScript only** on the frontend. Do NOT use React, Vue, Angular, jQuery, or any frontend framework/library.
5. Do NOT use TypeScript — this project is plain JavaScript (Node.js + browser JS) only.
6. Do NOT use Tailwind CSS or any CSS framework other than **Bootstrap 5**.
7. Use Bootstrap components (cards, modals, tables, navbar, badges, toasts) wherever a suitable one exists, instead of hand-rolled custom UI.
8. Avoid unnecessary npm packages — only add a dependency if it solves a real, non-trivial problem (e.g., `bcrypt`, `mysql2`, `dotenv`, `express-session`). Do not add packages "for convenience" that duplicate built-in functionality.

## Code Organization Rules
9. Controllers should handle request parsing, validation orchestration, and response formatting.

Business logic should reside in dedicated service modules where complexity justifies separation.

Models should contain database access only.
10. Keep **all SQL queries inside the model/database layer** (`models/`) — never write raw SQL inside routes or controllers.
11. Keep routes thin — a route file should only map HTTP verbs/paths to controller functions, with no logic of its own.
12. Use modular JavaScript on the frontend — one file per page/feature (`groceries.js`, `expenses.js`, etc.), each with clearly scoped functions. No giant single `app.js` file.
13. Avoid duplicate code — extract shared logic (e.g., fetch wrapper, date formatting, currency formatting) into shared utility files (`public/js/api.js`, `utils/`).

## Database Rules
14. Keep the SQL schema normalized to at least 3NF, as defined in DATABASE.md. Do not add redundant columns that duplicate data already available via a foreign key relationship.
15. Always use **parameterized queries** (`?` placeholders via `mysql2`) — never build SQL via string concatenation or template literals with unsanitized input.
16. Any new table must have an explicit primary key, appropriate foreign keys, and `NOT NULL`/`CHECK` constraints consistent with the patterns already in `database/schema.sql`.

## API Rules
17. Follow RESTful conventions strictly:
- `GET` for read operations.
- `POST` for resource creation.
- `PUT` for all update operations in this project.
- `PATCH` is intentionally not used to maintain a simple and consistent REST API.
- `DELETE` for resource removal.

Do not use `GET` for state-changing operations.
18. Every new endpoint must match the existing URL/resource naming pattern (plural nouns, `/api/<resource>`, `/api/<resource>/:id`).
19. Every new endpoint must be documented in API.md with request body, response shape, status codes, and validation rules.

## Validation & Security Rules
20. Validate all user inputs on both the client (for UX) and the server (as the source of truth) — never trust client-side validation alone.
21. Never hardcode credentials, API keys, or secrets anywhere in code — always read from `.env` via `process.env`.
22. Passwords must always be hashed (bcrypt) before storage — never store or log plaintext passwords.
23. Keep UI fully responsive — test all new pages/components at mobile (375px), tablet (768px), and desktop (1200px+) widths using Bootstrap's grid and utility classes.
24. Use semantic HTML — `<nav>`, `<main>`, `<section>`, `<table>`, `<form>`, `<button>` — instead of generic `<div>`/`<span>` soup, and ensure form inputs have associated `<label>` elements.

## Code Quality Rules
25. Use clean, meaningful comments that explain **why**, not just what — avoid comment noise like `// increment i`.
26. Write maintainable, readable code suitable for **college project evaluation and technical interviews** — prioritize clarity over cleverness.
27. Preserve backward compatibility when extending features — if a change would break an existing endpoint, frontend call, or database column used elsewhere, flag it explicitly instead of silently changing it.
28. Follow the naming conventions already established in the codebase (`camelCase` for JS, `snake_case` for SQL) — do not mix conventions within the same layer.

## Process Rules
29. Before making a structural or breaking change (renaming a route, changing a table schema, altering a response shape), explicitly state the change and its impact before applying it — do not make silent breaking changes.

## Repository & Version Control Rules
30. The `docs/` folder and everything inside it (TRD.md, IMPLEMENTATION.md, DATABASE.md, API.md, UI_UX.md, TESTING.md, PRD.md, AI_GUARDRAILS.md, etc.) must **never** be committed or pushed to the GitHub repository. Add `docs/` to `.gitignore` at the project root, and never `git add` files from that folder even if asked to stage "everything."