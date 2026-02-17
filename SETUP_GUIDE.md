# Parallel Realms - Full Setup Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Parallel Realms System                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐              ┌──────────────────┐    │
│  │  Angular Frontend │              │  Express Backend │    │
│  │  (localhost:4200)│───────HTTP────│ (Docker:3000)   │    │
│  │                  │               │                  │    │
│  │ - Map Rendering  │               │ - Auth API       │    │
│  │ - Game Logic     │               │ - Game Save/Load │    │
│  │ - GPS Tracking   │               │ - File Storage   │    │
│  └──────────────────┘               └──────────────────┘    │
│                                              │               │
│                                     ┌────────▼────────┐     │
│                                     │  server-data/   │     │
│                                     │  ├── users/     │     │
│                                     │  └── games/     │     │
│                                     └─────────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start (Development)

### Prerequisites
- Node.js 20+
- npm 10+
- Docker Desktop

### Option 1: Backend in Docker + Frontend Local (Recommended)

#### Step 1: Start Backend in Docker
```bash
cd Parallel-Realms
docker-compose up -d
```

Verify the backend is running:
```bash
curl http://localhost:3000/api/health
```

#### Step 2: Start Angular Frontend
```bash
npm start
```

The frontend will be available at `http://localhost:4200`

### Option 2: Everything Local (Without Docker)

```bash
# Terminal 1: Start Backend
npm run start:backend

# Terminal 2: Start Frontend
npm start
```

### Option 3: Both in Docker Compose

Update `docker-compose.yml` to enable frontend service (uncomment the frontend section), then:

```bash
docker-compose up -d
```

## Testing the Connection

### 1. Check Backend Health
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{"status":"ok","timestamp":"2026-02-04T..."}
```

### 2. Test Authentication
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'
```

### 3. Test Game Save/Load
```bash
# Save game
curl -X POST http://localhost:3000/api/game/save \
  -H "Content-Type: application/json" \
  -d '{
    "userId":"user-123",
    "player":{"name":"Hero","health":100},
    "territories":[],
    "buildings":[],
    "monsters":[],
    "resourceNodes":[],
    "hasPlacedFirstFlag":false
  }'

# Load game
curl http://localhost:3000/api/game/load/user-123
```

## Docker Commands

### View Container Status
```bash
docker ps
docker-compose ps
```

### View Logs
```bash
# Live logs
docker-compose logs -f backend

# Last 50 lines
docker logs --tail 50 parallel-realms-backend
```

### Stop/Start Services
```bash
# Stop all
docker-compose down

# Start all
docker-compose up -d

# Restart backend
docker-compose restart backend
```

### Access Container Shell
```bash
docker exec -it parallel-realms-backend sh
```

### Clean Up
```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove everything
docker system prune -a
```

## File Structure

```
Parallel-Realms/
├── backend.ts                 # Express backend source
├── Dockerfile                 # Docker configuration
├── docker-compose.yml         # Docker Compose setup
├── .dockerignore              # Files to exclude from Docker
├── DOCKER_SETUP.md           # Docker documentation
├── package.json              # Dependencies & scripts
├── tsconfig.json             # TypeScript config
│
├── src/                       # Angular Frontend
│   ├── app/
│   │   ├── app.ts           # Root component
│   │   ├── app.html         # Root template
│   │   ├── services/
│   │   │   ├── auth/
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth-api.service.ts
│   │   │   ├── game/
│   │   │   │   ├── game.service.ts
│   │   │   │   ├── game-api.service.ts
│   │   ├── components/
│   │   │   ├── login/
│   │   │   │   ├── login.component.ts
│   │   │   │   ├── login.component.html
│   │   │   │   ├── login.component.scss
│   │   │   ├── game/
│   │   │   │   ├── game.component.ts
│   │   │   │   ├── game.component.html
│   │   │   │   ├── game.component.scss
│   │   ├── models/
│   │   │   ├── game.models.ts
│
└── server-data/               # Backend Data (Docker volume)
    ├── users/                 # User accounts
    │   └── user-*.json
    └── games/                 # Game saves
        └── user-*.json
```

## Development Workflow

### Making Changes to Backend

1. Edit `backend.ts`
2. Rebuild Docker image:
   ```bash
   docker-compose down
   docker build -t parallel-realms-backend .
   docker-compose up -d
   ```

3. Verify with:
   ```bash
   docker logs parallel-realms-backend
   curl http://localhost:3000/api/health
   ```

### Making Changes to Frontend

1. Edit files in `src/`
2. Angular dev server auto-reloads
3. Check `http://localhost:4200`

### Database Persistence

Game data is stored in Docker volumes:
- `server-data/users/` - User accounts (JSON)
- `server-data/games/` - Game saves (JSON)

Data persists even when containers stop, but is lost when volumes are removed:
```bash
docker volume prune  # WARNING: Deletes all unused volumes
```

## Production Deployment

### Docker Hub

Build and push image:
```bash
docker build -t yourname/parallel-realms-backend:1.0 .
docker push yourname/parallel-realms-backend:1.0
```

Update `docker-compose.yml`:
```yaml
image: yourname/parallel-realms-backend:1.0
environment:
  - NODE_ENV=production
restart: always
```

### Environment Variables

Create `.env` file:
```
NODE_ENV=production
PORT=3000
API_URL=https://your-domain.com
```

## Troubleshooting

### Backend won't start
```bash
# Check logs
docker logs parallel-realms-backend

# Check if port 3000 is in use
lsof -i :3000

# Rebuild from scratch
docker-compose down
docker system prune -a
docker build -t parallel-realms-backend .
docker-compose up -d
```

### Frontend can't reach backend
- Ensure Docker container is running: `docker ps`
- Check backend health: `curl http://localhost:3000/api/health`
- Check browser console for CORS errors
- Verify API URL in `src/app/services/game/game-api.service.ts`

### Port conflicts
```yaml
# In docker-compose.yml, change port mapping:
ports:
  - "3001:3000"  # Use 3001 instead of 3000
```

### Permission denied on server-data
```bash
chmod -R 755 server-data/
```

## Next Steps

1. **Upgrade to Database**: Replace JSON file storage with MongoDB or PostgreSQL
2. **Add API Authentication**: Implement JWT tokens
3. **Multiplayer Features**: Real-time game updates with WebSockets
4. **Cloud Deployment**: Deploy to AWS, Google Cloud, or DigitalOcean
5. **Performance Monitoring**: Add logging and analytics

## Resources

- [Express.js Documentation](https://expressjs.com/)
- [Angular Documentation](https://angular.io/docs)
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## Support

For issues or questions:
1. Check logs: `docker logs parallel-realms-backend`
2. Review error messages in browser console
3. Check GitHub issues (if applicable)
