# Parallel Realms - Quick Reference

## 🚀 Quick Start

### Start Backend (Docker)
```bash
cd Parallel-Realms
docker-compose up -d
```

### Start Frontend
```bash
cd Parallel-Realms
npm start
```

### Access Game
```
http://localhost:4200
```

---

## 📊 System Status

| Service | URL | Status |
|---------|-----|--------|
| Frontend | http://localhost:4200 | ✅ Running |
| Backend | http://localhost:3000 | ✅ Running |
| API Health | http://localhost:3000/api/health | ✅ OK |

---

## 🔌 API Endpoints

```
Authentication
  POST   /api/auth/register
  POST   /api/auth/login

Game Data
  POST   /api/game/save
  GET    /api/game/load/:userId
  DELETE /api/game/delete/:userId
  GET    /api/game/list/:userId

System
  GET    /api/health
```

---

## 🐳 Docker Commands

```bash
# Status
docker-compose ps

# Logs (real-time)
docker-compose logs -f backend

# Restart
docker-compose restart backend

# Stop
docker-compose down

# Rebuild & Restart
docker-compose down
docker build -t parallel-realms-backend .
docker-compose up -d

# Shell Access
docker exec -it parallel-realms-backend sh
```

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Container configuration |
| `docker-compose.yml` | Service orchestration |
| `backend.ts` | Express API server |
| `src/app/services/` | Service layer |
| `src/app/components/` | UI components |
| `server-data/` | Persisted data |

---

## 🧪 Testing

### Test Backend
```bash
curl http://localhost:3000/api/health
```

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username":"testuser",
    "email":"test@example.com",
    "password":"password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'
```

---

## 📋 Workflow

### Development
```
1. Terminal 1: docker-compose up -d
2. Terminal 2: npm start
3. Open http://localhost:4200
4. Make changes (auto-reload)
5. docker-compose down (when done)
```

### Debugging
```bash
# View live logs
docker-compose logs -f backend

# Check container status
docker ps

# Access backend shell
docker exec -it parallel-realms-backend sh

# Check data
ls -la server-data/users/
ls -la server-data/games/
```

---

## ❌ Troubleshooting

### Backend won't start
```bash
docker logs parallel-realms-backend
docker-compose down -v
docker build --no-cache -t parallel-realms-backend .
docker-compose up -d
```

### Port already in use
```bash
# Edit docker-compose.yml
# Change: "3000:3000" → "3001:3000"
# Then restart
```

### Frontend can't reach API
```bash
# Check backend is running
curl http://localhost:3000/api/health

# Check browser console
# Check network tab in DevTools
```

### Data not saving
```bash
# Check volume
docker exec parallel-realms-backend ls -la /app/server-data/

# Check permissions
chmod -R 755 server-data/
```

---

## 📚 Documentation

- **SETUP_GUIDE.md** - Complete setup instructions
- **DOCKER_SETUP.md** - Docker-specific docs
- **DOCKER_COMPLETE.md** - Full summary
- **BACKEND_DOCKER_READY.md** - Ready to use guide

---

## 🛠️ Management Scripts

### Linux/Mac
```bash
./docker-manage.sh start      # Start
./docker-manage.sh stop       # Stop
./docker-manage.sh restart    # Restart
./docker-manage.sh rebuild    # Rebuild
./docker-manage.sh logs       # View logs
./docker-manage.sh status     # Status
./docker-manage.sh clean      # Cleanup
```

### Windows
```bash
docker-manage.bat start       # Start
docker-manage.bat stop        # Stop
docker-manage.bat restart     # Restart
docker-manage.bat rebuild     # Rebuild
docker-manage.bat logs        # View logs
docker-manage.bat status      # Status
docker-manage.bat clean       # Cleanup
```

---

## 💾 Data Locations

```
server-data/
├── users/           # User accounts
│   └── user-*.json
└── games/           # Game saves
    └── user-*.json
```

---

## 🔑 Key Info

- **Backend Port**: 3000
- **Frontend Port**: 4200
- **Database**: File-based (JSON)
- **Container Name**: parallel-realms-backend
- **Image Name**: parallel-realms-backend

---

## ✅ Success Checklist

- [ ] Docker installed
- [ ] Node.js 20+ installed
- [ ] Backend running: `docker-compose ps`
- [ ] Backend healthy: `curl http://localhost:3000/api/health`
- [ ] Frontend running: `npm start`
- [ ] Can access: http://localhost:4200
- [ ] Can register account
- [ ] Can login
- [ ] Game loads and runs

---

## 📞 Common Tasks

### Change Backend Port
Edit `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Change 3000 to 3001
```

### Enable Frontend in Docker
Edit `docker-compose.yml`, uncomment frontend section, then:
```bash
docker-compose up -d
```

### Check All Data
```bash
# List all users
ls server-data/users/

# List all game saves
ls server-data/games/

# View a save file
cat server-data/games/user-123.json | jq .
```

### Backup Data
```bash
# Copy server-data directory
cp -r server-data server-data.backup
```

### Reset Everything
```bash
# WARNING: Deletes all data!
docker-compose down -v
rm -rf server-data
docker build -t parallel-realms-backend .
docker-compose up -d
```

---

## 🎯 Next Steps

1. **Enhance Security**
   - Add password hashing
   - Implement JWT tokens
   - Add input validation

2. **Scale Up**
   - Switch to MongoDB
   - Add Redis caching
   - Implement WebSockets

3. **Deploy**
   - Push to Docker Hub
   - Deploy to cloud
   - Setup CI/CD

4. **Monitor**
   - Add logging
   - Add health checks
   - Add alerts

---

**Your Parallel Realms backend is ready to go! 🚀**
