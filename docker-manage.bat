@echo off
REM Parallel Realms Docker Management Script for Windows

setlocal enabledelayedexpansion

REM Colors (using basic Windows colors)
set "info=[INFO]"
set "success=[SUCCESS]"
set "error=[ERROR]"
set "warn=[WARNING]"

if "%1%"=="" goto help
if "%1%"=="start" goto start
if "%1%"=="stop" goto stop
if "%1%"=="restart" goto restart
if "%1%"=="rebuild" goto rebuild
if "%1%"=="logs" goto logs
if "%1%"=="status" goto status
if "%1%"=="clean" goto clean
if "%1%"=="help" goto help
goto help

:start
echo %info% Starting backend container...
docker-compose up -d
echo %success% Backend started on port 3000
echo %info% Waiting for health check...
timeout /t 3 /nobreak
powershell -Command "try { $response = Invoke-WebRequest http://localhost:3000/api/health -ErrorAction Stop; echo '%success% Backend is healthy!' } catch { echo '%error% Backend health check failed' }"
goto end

:stop
echo %info% Stopping backend container...
docker-compose down
echo %success% Backend stopped
goto end

:restart
echo %info% Restarting backend container...
docker-compose restart backend
echo %success% Backend restarted
timeout /t 2 /nobreak
powershell -Command "try { $response = Invoke-WebRequest http://localhost:3000/api/health -ErrorAction Stop; echo '%success% Backend is healthy!' } catch { echo '%error% Backend health check failed' }"
goto end

:rebuild
echo %info% Rebuilding backend image...
docker-compose down
docker build -t parallel-realms-backend . --no-cache
echo %success% Image rebuilt
echo %info% Starting container...
docker-compose up -d
echo %success% Backend started
timeout /t 3 /nobreak
powershell -Command "try { $response = Invoke-WebRequest http://localhost:3000/api/health -ErrorAction Stop; echo '%success% Backend is healthy!' } catch { echo '%error% Backend health check failed' }"
goto end

:logs
docker-compose logs -f backend
goto end

:status
echo %info% Container Status:
docker-compose ps
echo.
echo %info% Health Check:
powershell -Command "try { $response = Invoke-WebRequest http://localhost:3000/api/health -ErrorAction Stop; echo '%success% Backend is healthy'; $response.Content | ConvertFrom-Json | ConvertTo-Json } catch { echo '%error% Backend is unreachable' }"
goto end

:clean
echo %warn% This will remove containers, images, and unused volumes
set /p "response=Continue? (y/N): "
if /i "!response!"=="y" (
    docker-compose down
    docker system prune -a --volumes -f
    echo %success% Cleaned up Docker resources
) else (
    echo %warn% Cleanup cancelled
)
goto end

:help
echo.
echo Usage: %0 {start^|stop^|restart^|rebuild^|logs^|status^|clean^|help}
echo.
echo Commands:
echo   start      Start the backend container
echo   stop       Stop the backend container
echo   restart    Restart the backend container
echo   rebuild    Rebuild the Docker image and start container
echo   logs       Follow backend logs in real-time
echo   status     Show container and health status
echo   clean      Remove containers, images, and unused volumes
echo   help       Show this help message
echo.
echo Examples:
echo   %0 start      REM Start the backend
echo   %0 logs       REM View backend logs
echo   %0 rebuild    REM Rebuild and restart
echo.

:end
echo.
endlocal
