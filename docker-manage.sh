#!/bin/bash
# Parallel Realms Docker Management Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Parallel Realms Docker Manager       ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Commands
start() {
    echo -e "${BLUE}Starting backend container...${NC}"
    docker-compose up -d
    print_success "Backend started on port 3000"
    echo -e "${YELLOW}Waiting for health check...${NC}"
    sleep 3
    if curl -s http://localhost:3000/api/health > /dev/null; then
        print_success "Backend is healthy!"
    else
        print_error "Backend health check failed"
    fi
}

stop() {
    echo -e "${BLUE}Stopping backend container...${NC}"
    docker-compose down
    print_success "Backend stopped"
}

restart() {
    echo -e "${BLUE}Restarting backend container...${NC}"
    docker-compose restart backend
    print_success "Backend restarted"
    sleep 2
    if curl -s http://localhost:3000/api/health > /dev/null; then
        print_success "Backend is healthy!"
    else
        print_error "Backend health check failed"
    fi
}

rebuild() {
    echo -e "${BLUE}Rebuilding backend image...${NC}"
    docker-compose down
    docker build -t parallel-realms-backend . --no-cache
    print_success "Image rebuilt"
    echo -e "${BLUE}Starting container...${NC}"
    docker-compose up -d
    print_success "Backend started"
    sleep 3
    if curl -s http://localhost:3000/api/health > /dev/null; then
        print_success "Backend is healthy!"
    else
        print_error "Backend health check failed"
    fi
}

logs() {
    docker-compose logs -f backend
}

status() {
    echo -e "${BLUE}Container Status:${NC}"
    docker-compose ps
    echo ""
    echo -e "${BLUE}Health Check:${NC}"
    if curl -s http://localhost:3000/api/health > /dev/null; then
        print_success "Backend is healthy"
        curl -s http://localhost:3000/api/health | jq '.'
    else
        print_error "Backend is unreachable"
    fi
}

clean() {
    echo -e "${YELLOW}This will remove containers, images, and unused volumes${NC}"
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose down
        docker system prune -a --volumes -f
        print_success "Cleaned up Docker resources"
    else
        print_warning "Cleanup cancelled"
    fi
}

help() {
    echo ""
    echo "Usage: $0 {start|stop|restart|rebuild|logs|status|clean|help}"
    echo ""
    echo "Commands:"
    echo "  start      Start the backend container"
    echo "  stop       Stop the backend container"
    echo "  restart    Restart the backend container"
    echo "  rebuild    Rebuild the Docker image and start container"
    echo "  logs       Follow backend logs in real-time"
    echo "  status     Show container and health status"
    echo "  clean      Remove containers, images, and unused volumes"
    echo "  help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start      # Start the backend"
    echo "  $0 logs       # View backend logs"
    echo "  $0 rebuild    # Rebuild and restart"
    echo ""
}

# Main
print_header

case "${1:-help}" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    rebuild)
        rebuild
        ;;
    logs)
        logs
        ;;
    status)
        status
        ;;
    clean)
        clean
        ;;
    help|--help|-h)
        help
        ;;
    *)
        print_error "Unknown command: $1"
        help
        exit 1
        ;;
esac

echo ""
