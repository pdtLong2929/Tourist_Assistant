# Login API Service
 
This directory contains the authentication microservice for the Tourist Assistant project. It is built using **Node.js** and **Express.js** to handle user authentication, account creation, and password management.

## Key Features
- **Traditional Authentication**: Register and Login using email and password with JWT.
- **Google OAuth Integration**: Login or sign up seamlessly using Google Accounts.
- **Password Resilience**: Built-in flow for "forgot password" and reset password via email.
- **Profile Retrival**: Fetch details of the currently authenticated user.
- **Stateless Sessions**: Employs JSON Web Tokens (JWT) for secure, stateless sessions.
- **Robust Database ORM**: Powered by Sequelize (primarily targeting PostgreSQL).

## Tech Stack & Dependencies
- **Runtime Environment**: Node.js
- **Framework**: Express.js
- **Database ORM**: Sequelize (`pg`, `pg-hstore` for PostgreSQL). Note: `mysql2` and `mongodb` drivers are also present but standard env is Postgres.
- **Security**: `bcryptjs` (password hashing), `jsonwebtoken` (JWTs), `cors` (Cross-Origin Resource Sharing).
- **Google Auth**: `google-auth-library`
- **Emails**: `nodemailer` (for sending password reset link)
- **Containerization**: Docker (using `node:24-alpine`).

## Folder Structure
- **`config/`**: Database connection and other configuration setup (`db.js`).
- **`controllers/`**: Core business logic and handling of API requests (`authController.js`).
- **`middleware/`**: Express middleware functions, notably token verification (`authMiddleware.js`).
- **`models/`**: Database models/schemas (`User.js` using Sequelize).
- **`routes/`**: API endpoint routing (`auth.js`).

## 🗺️ API Endpoints
All routes are prefixed with `/api/auth`:

| Method | Endpoint | Description | Auth Required |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Register a new user | No |
| `POST` | `/api/auth/login` | Login with email and password | No |
| `POST` | `/api/auth/google` | Login or register with a Google Token | No |
| `POST` | `/api/auth/forgot-password`| Send password recovery email | No |
| `POST` | `/api/auth/reset-password/:token` | Reset password using email token | No |
| `GET` | `/api/auth/me` | Get currently authenticated user's profile | Yes (JWT) |

## ⚙️ Environment Variables
Create a `.env` file in the root of the `login` folder. You can use `.env.example` as a reference:

```env
# Database Config
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_database_name
DB_DIALECT=postgres
DB_PORT=5432

# Server Config
PORT=5036  # Default used in server.js and Dockerfile

# JWT Config
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=1h

# Google Auth
GOOGLE_CLIENT_ID=your_google_client_id

# Email Config (Nodemailer - Gmail)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

## Docker Deployment
A `Dockerfile` is provided for running this app in an isolated container.
- **Base image:** `node:24-alpine`
- **Exposed port:** `5036` (by default)
- **Start Command:** `node server.js`

To build and run:
```bash
docker build -t tourist-assistant-login .
docker run -p 5036:5036 --env-file .env tourist-assistant-login
```

## Available Scripts
- `npm start`: Runs the server securely via `node server.js`.
- `npm run dev`: Runs the server with `nodemon` for hot-reloading during development.
