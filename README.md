# QnA_platform

A simple Q&A platform built with Express and SQLite.

## How to run the app

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Open your browser and visit:
   ```text
   http://localhost:3000
   ```

The app will create the SQLite database automatically on first run if it does not already exist.

## SQLite library used

The app uses Better SQLite3 for database access.

- Package: `better-sqlite3`
- Database file: `qna.db`
- Connection setup: [src/connect.js](src/connect.js)

## Where CSRF is enforced

CSRF protection is enforced in [src/app.js](src/app.js) inside the middleware that runs before route handlers.

The enforcement logic lives in [src/middleware/csrfMiddleware.js](src/middleware/csrfMiddleware.js) and is applied from [src/app.js](src/app.js).

It:
- checks for a CSRF token cookie
- requires the `x-csrf-token` header for all non-GET requests
- rejects requests with `403` if the header does not match the cookie

## Where parameterised queries are used

Parameterised queries are used in the database and in backend scripts in:

- [src/connect.js](src/connect.js) for tables creation and initial data insertion
- [src/routes/questionRoutes.js](src/routes/questionRoutes.js) for question and comment inserts/updates
- [src/routes/commentRoutes.js](src/routes/commentRoutes.js) for reply and like operations

These queries use placeholders such as `?` instead of concatenating user input directly into SQL.
