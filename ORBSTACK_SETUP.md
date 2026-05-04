# Local Development Setup with Docker and OrbStack

This project is configured to run fully containerized for local development, meaning you don't need to manually install dependencies like Node.js, pnpm, MongoDB, or Redis on your machine.

We recommend [OrbStack](https://orbstack.dev/) as a lightweight, fast alternative to Docker Desktop for macOS.

## 1. Prerequisites
- Download and install [OrbStack](https://orbstack.dev/).
- Open OrbStack and ensure the Docker engine is running. Ensure it finishes initializing.
- Or use Docker Desktop if on Windows/Linux.

## 2. Start the Environment
To start the entire environment (Frontend, Backend, MongoDB, Redis), open a terminal in the project root and run:

```bash
docker-compose -f docker-compose.dev.yml up --build
```

Wait a few moments for the containers to build and start.

## 3. Access the Services
Once running, you can access your services at:
- **Website (Frontend):** [http://localhost:8080](http://localhost:8080)
- **Backend API:** [http://localhost:3000](http://localhost:3000)
- **MongoDB:** `mongodb://localhost:27017/bubble-chat`
- **Redis:** `redis://localhost:6379`

## 4. Development Workflow & Hot Reloading
The containers are configured using volume mounts. This means any coding changes you make in your IDE to `Backend/` or `Website/` will instantly be recognized inside the containers, triggering hot-reloading (via Vite and nodemon).

You do not need to restart the containers when writing code.

*Note: If you add new packages to `package.json`, you will need to stop the containers (Ctrl+C) and run `docker-compose -f docker-compose.dev.yml up --build` again to install the new dependencies.*
