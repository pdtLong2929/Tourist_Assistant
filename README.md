# Tourist Assistant

Welcome to the **Tourist Assistant** project. This is an AI-driven repository designed to provide a premium tourist assistance experience.

## 🚀 Getting Started

Follow these steps to set up and run the project on your local machine.

### 1. Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (Version 18 or later recommended)
- [Git](https://git-scm.com/)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

### 2. Clone the Repository

Clone the project to your local machine:
```bash
git clone https://github.com/your-username/Tourist_Assistant.git
cd Tourist_Assistant
```

### 3. Navigate and Install Dependencies

The project's frontend is located in the `frontend/aetherion` directory. You will need to install the dependencies for this specific project:

```bash
cd frontend/aetherion
npm install
```

### 4. Run the Development Server

To start the application in development mode:

```bash
npm run dev
```

Once the server is running, you can access the application at:
[http://localhost:3000](http://localhost:3000)

---

## 🛠️ Project Structure

- **`frontend/`**: Contains the web application logic and UI components.
  - **`aetherion/`**: The core Next.js project.
    - **`src/`**: Contains the source code (components, pages, styles).
- **`README.md`**: This file.
- **`.gitignore`**: Defines which files Git should ignore (e.g., `node_modules`, `.next`, `.env`).

---

## 🏗️ Available Scripts

Inside the `frontend/aetherion` folder, you can run the following:

| Command | Action |
| :--- | :--- |
| `npm run dev` | Runs the app in development mode. |
| `npm run build` | Builds the project for production. |
| `npm run start` | Starts the production-ready server. |
| `npm run lint` | Runs ESLint to check for code quality and style issues. |

---

## 🤝 Contributing

1. Create a new branch: `git checkout -b feature-name`
2. Commit your changes: `git commit -m 'verb: changes summary'`
3. Push to the branch: `git push origin feature-name`
4. Create a Pull Request.

---

## 📝 Documenting Environment Variables (Optional)

If the project requires secret keys, please contact the lead developer for the `.env` configuration file or check if a `.env.example` file is provided in the `frontend/aetherion` directory.
