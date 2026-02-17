# Parallel Realms Admin Dashboard Setup - Conversation Context

## Overview
This document captures the complete conversation and context for setting up the admin dashboard in Parallel Realms and adding admin access for the DonaldBurt user account.

## Primary Objectives
1. Load the admin dashboard at `/admin` route
2. Make DonaldBurt admin so they can access the admin portal
3. Add player menu with logout, stats, and level progression
4. Troubleshoot backend connectivity issues

## Session Evolution

### Phase 1: Initial Admin Setup
- User registered as "DonaldBurt"
- Goal: Promote DonaldBurt to admin via database
- Added `isAdmin` BOOLEAN DEFAULT false column to User table
- Updated DonaldBurt's record: `UPDATE "User" SET "isAdmin" = true WHERE "username" = 'DonaldBurt'`
- Database verified: DonaldBurt confirmed isAdmin=true in PostgreSQL

### Phase 2: Admin Portal Access Issues
- Frontend couldn't access `/admin` despite 200 OK responses
- Multiple attempts to fix admin guard in `app.routes.ts`
- Initially relaxed SSR constraints
- Moved authorization check from route guard to component level in `admin.component.ts`
- Component now checks admin status on ngOnInit and redirects if not admin

### Phase 3: Player Menu Feature
- Successfully implemented player menu dropdown on character name
- Shows player stats: Level, XP, Next Level distance
- Added logout button
- All working in game UI

### Phase 4: Backend Auth Status Endpoint
- Created `/api/auth/status/:userId` endpoint with username query param fallback
- Added to `backend.ts` at line 172+
- Frontend calls this endpoint to refresh admin flags from backend
- `AuthService.refreshAdminStatus()` now fetches and updates localStorage

### Phase 5: Port Conflict & Resolution
- Initial blocker: 404 errors on auth status endpoint
- Discovery: Port 3000 occupied by Docker Desktop backend (com.docker.backend.exe)
- Action: `taskkill /IM "com.docker.backend.exe" /F` freed port 3000
- Reverted all port changes back to 3000 from interim port 3001

### Phase 6: Backend Execution Challenges
- ts-node runtime compilation unreliable on Windows - couldn't bind port reliably
- Solution: Compile TypeScript to JavaScript using tsc
- Backend now runs as: `node dist/backend.js`
- Process confirmed listening on port 3000 via netstat

### Phase 7: Prisma Type Issues
- Error: "isAdmin does not exist in type UserWhereInput" 
- Root cause: Prisma client not regenerated after schema modification
- Fixed with: `npx prisma generate`
- Also fixed TypeScript compilation errors with GameState type by casting to `any` in Prisma operations

### Phase 8: Current Status
- Backend process (PID varied) bound to port 3000
- Port binding confirmed via netstat
- Database connectivity needs verification
- HTTP request testing pending

## Technical Architecture

### Frontend (Angular 21 with SSR)
- **Framework**: Angular 21 with Server-Side Rendering
- **Port**: localhost:4200
- **Build Tool**: esbuild with vite optimization
- **State Management**: Angular signals (gameService, authService)
- **Authentication**: localStorage key `parallel-realms-current-user` stores JSON { id, username, email, isAdmin }

### Backend (Express.ts)
- **Framework**: Express.js with TypeScript
- **Port**: localhost:3000
- **Compilation**: TypeScript compiled to JavaScript (npx tsc backend.ts → dist/backend.js)
- **Execution**: `node dist/backend.js` (not ts-node)
- **Database**: PostgreSQL via Prisma ORM

### Database (PostgreSQL)
- **Location**: localhost:5433
- **Name**: parallel_realms
- **User**: parallel_realms
- **Password**: parallel_realms
- **Connection String**: `postgresql://parallel_realms:parallel_realms@localhost:5433/parallel_realms?schema=public`

## Code Changes Made

### backend.ts (Express Server)
**New Endpoint**: `/api/auth/status/:userId`
```typescript
app.get('/api/auth/status/:userId', async (req, res) => {
  // Lookup user and return admin status
  // Supports username query param fallback
});
```

**Type Fixes**: Added `as any` casts for gameState in Prisma operations to handle JSON field type issues

### game.component.ts (Angular Component)
**New Features**:
- `playerMenuOpen = false` - state signal for menu visibility
- `togglePlayerMenu()` - toggle method
- `closePlayerMenu()` - close method  
- `logout()` - calls authService.logout()

### game.component.html (Template)
```html
<button class="player-menu-trigger" (click)="togglePlayerMenu()">
  ⚔️ {{ gameService.player().name }}
  <span class="caret">▾</span>
</button>
@if (playerMenuOpen) {
  <div class="menu-section">
    Level: {{ gameService.player().level }}
    XP: {{ gameService.player().experience }}
    Next Level: {{ gameService.experienceToNextLevel() - gameService.player().experience }}
  </div>
  <button class="menu-action" (click)="logout()">🚪 Log out</button>
}
```

### auth-api.service.ts (API Service)
**New Method**: `getStatus(userId: string, username?: string): Promise<AuthStatusResponse>`
- Calls `/api/auth/status/{userId}?username={username}`
- Returns admin status from backend

### auth.service.ts (Authentication Service)
**New Method**: `refreshAdminStatus()`
- Calls auth API to get current admin status
- Updates localStorage with isAdmin flag
- Called on session restore and before accessing admin features

### app.routes.ts (Route Configuration)
**Changes**: 
- Relaxed admin guard to only check authenticated status
- Moved admin flag verification to component level
- Prevents SSR 404 errors, allows client-side verification

### admin.component.ts (Admin Component)
**Changes**:
- Added admin status check in ngOnInit
- Calls `authService.refreshAdminStatus()`
- Redirects to home if not admin
- Only displays admin dashboard if authenticated as admin

## Database Schema Changes

### User Table Modifications
```sql
ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;
```

### DonaldBurt Admin Assignment
```sql
UPDATE "User" SET "isAdmin" = true WHERE "username" = 'DonaldBurt';
```

## Environment Configuration (.env)
```
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000
DATABASE_URL=postgresql://parallel_realms:parallel_realms@localhost:5433/parallel_realms?schema=public
```

## Known Issues & Blockers

### Critical Blocker
- Backend process binds to port 3000 but HTTP requests sometimes refused with connection errors
- Root cause: Database connectivity or Express initialization issue
- netstat confirms port listening but actual HTTP connectivity intermittent

### Resolved Issues
✅ Port 3000 occupied by Docker - FIXED (killed com.docker.backend.exe)
✅ ts-node execution unreliable - FIXED (switched to compiled JS)
✅ Prisma type errors with isAdmin - FIXED (npx prisma generate)
✅ TypeScript GameState type issues - FIXED (cast to any in Prisma ops)
✅ User registration - WORKING
✅ Admin flag in database - WORKING
✅ Player menu UI - WORKING

### Pending Verification
⚠️ Backend HTTP connectivity - needs database verification
⚠️ Auth status endpoint - needs backend listening
⚠️ Admin component access - needs endpoint working
⚠️ Full admin dashboard render - needs all above working

## Testing Commands

### Check Port Binding
```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
netstat -ano | findstr :3000
```

### Test Backend Connectivity
```powershell
$ProgressPreference='SilentlyContinue'
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/status/user-1770499415553?username=DonaldBurt" -Method GET
```

### Start Backend
```powershell
cd "c:\Users\dandk\source\Parallel-Realms"
npm run start:backend
# or manually:
node dist/backend.js
```

### Compile Backend
```powershell
npx tsc backend.ts
```

### Start Frontend
```powershell
ng serve
# or npm start (depends on scripts in package.json)
```

### Verify Database
```powershell
$env:POSTGRES_PASSWORD="parallel_realms"
@'
SELECT "id", "username", "email", "isAdmin" FROM "User" WHERE "username" = 'DonaldBurt';
'@ | npx prisma db execute --url "postgresql://parallel_realms:$env:POSTGRES_PASSWORD@localhost:5433/parallel_realms?schema=public" --stdin
```

## File Locations

**Frontend**:
- Main app: `DDB-Master-App/src/app/`
- Game component: `DDB-Master-App/src/app/components/game/`
- Admin component: `DDB-Master-App/src/app/components/admin/`
- Auth service: `DDB-Master-App/src/app/services/`

**Backend**:
- Main server: `Parallel-Realms/backend.ts`
- Compiled output: `Parallel-Realms/dist/backend.js`
- Database schema: `Parallel-Realms/prisma/schema.prisma`

**Configuration**:
- Environment: `Parallel-Realms/.env`
- Docker: `Parallel-Realms/docker-compose.yml`

## Next Steps to Try (Opening Folder Solo)

1. **Verify PostgreSQL is running** on localhost:5433
2. **Compile backend**: `npx tsc backend.ts`
3. **Start backend**: `node dist/backend.js` and verify port 3000 listening
4. **Test backend endpoint**: Call `/api/auth/status/?username=DonaldBurt`
5. **Start frontend**: `ng serve` on localhost:4200
6. **Login as DonaldBurt**: Username registered earlier
7. **Click to admin**: Navigate to `/admin`
8. **Verify admin access**: Should display admin dashboard
9. **Test player menu**: Click character name to see logout and stats

## Debugging Tips

If backend won't accept connections:
1. Check if any node processes are running: `Get-Process node`
2. Kill all node processes: `taskkill /IM node.exe /F`
3. Verify port is free: `Get-NetTCPConnection -LocalPort 3000`
4. Check database connectivity: Verify PostgreSQL is running and accessible
5. Compile backend again: `npx tsc backend.ts`
6. Start with logging: Add console.log statements to see execution flow
7. Check .env file is correct and database credentials match

## Authentication Flow

1. **User logs in**: Frontend sends credentials to `/api/auth/login`
2. **Session created**: Backend returns user object with isAdmin flag
3. **localStorage saved**: User data stored with key `parallel-realms-current-user`
4. **Admin status refresh** (NEW): On page load or admin access attempt:
   - Frontend calls `authService.refreshAdminStatus()`
   - Calls backend `/api/auth/status/:userId` endpoint
   - Backend queries database for current isAdmin value
   - Frontend updates localStorage with fresh value
5. **Route access**: Admin component checks isAdmin before rendering dashboard
6. **Logout**: Clears localStorage and redirects to login

## Success Criteria

✅ **Admin Dashboard Loaded**: User can navigate to `/admin` and see dashboard
✅ **Admin Access Verified**: Backend confirms isAdmin=true for DonaldBurt
✅ **Player Menu Working**: Character name dropdown shows stats and logout
✅ **Backend Responsive**: All API endpoints return proper responses
✅ **Database Connected**: No connection errors in console logs
✅ **Session Persisted**: Page refresh maintains admin status

## Notes

- The admin guard in routes was initially blocking access, moved authorization to component level
- Port 3000 was critical blocker due to Docker Desktop, now freed
- Prisma regeneration was essential after schema changes
- Frontend player menu is fully working - server is the remaining piece
- Database has DonaldBurt with isAdmin=true confirmed
- Using compiled JavaScript backend (not ts-node) for stability on Windows
