# Parallel Realms - Docker Setup

## Quick Start

### Prerequisites
- Docker Desktop installed and running
- Docker Compose

### Running the Backend in Docker

#### 1. Build and Start the Container

```bash
# Build the Docker image
docker build -t parallel-realms-backend .

# Run the container
docker run -p 3000:3000 -v $(pwd)/server-data:/app/server-data parallel-realms-backend
```

#### 2. Using Docker Compose (Recommended)

```bash
# Start the backend service
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop the service
docker-compose down
```

#### 3. Verify Backend is Running

```bash
# Check health
curl http://localhost:3000/api/health

# Should return:
# {"status":"ok","timestamp":"2026-02-04T..."}
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Game Save/Load
- `POST /api/game/save` - Save game state
- `GET /api/game/load/:userId` - Load game state
- `DELETE /api/game/delete/:userId` - Delete game save
- `GET /api/game/list/:userId` - List game saves

### Health Check
- `GET /api/health` - Health check endpoint

## Development

### Frontend Development (Local)
While the backend runs in Docker:

```bash
# In a separate terminal, run the Angular dev server
npm start

# Frontend will be at http://localhost:4200
# Backend API requests will go to http://localhost:3000
```

### Backend Development (Direct)
If you need to run the backend directly:

```bash
npm run start:backend
```

## Docker Commands

### View Running Containers
```bash
docker ps
```

### View Container Logs
```bash
docker logs parallel-realms-backend
docker logs parallel-realms-backend -f  # Follow logs
```

### Stop Container
```bash
docker stop parallel-realms-backend
```

### Remove Container
```bash
docker rm parallel-realms-backend
```

### Access Container Shell
```bash
docker exec -it parallel-realms-backend sh
```

## Data Persistence

Game saves are stored in the `server-data/` directory which is mounted as a volume. This ensures data persists even if the container is stopped or removed.

```
server-data/
├── users/          # User account data
│   └── user-*.json
└── games/          # Game save data
    └── user-*.json
```

## Production Deployment

For production, update the `docker-compose.yml`:

```yaml
environment:
  - NODE_ENV=production
  - PORT=3000
restart: always
```

Then build and deploy:

```bash
docker-compose -f docker-compose.yml up -d
```

## Troubleshooting

### Container fails to start
```bash
# View detailed error logs
docker logs parallel-realms-backend
```

### Port 3000 already in use
```bash
# Change the port mapping in docker-compose.yml
# From: "3000:3000"
# To: "3001:3000"
```

### Frontend can't reach backend
- Ensure Docker container is running: `docker ps`
- Check container IP: `docker inspect parallel-realms-backend`
- Update frontend API URL if needed

### Permission denied on server-data directory
```bash
# Fix permissions
chmod -R 755 server-data/
```
