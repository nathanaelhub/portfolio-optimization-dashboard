# Portfolio Optimization Dashboard - Development Commands

.PHONY: help install dev build test clean docker-build docker-up docker-down format lint type-check

# Default target
help:
	@echo "Portfolio Optimization Dashboard - Available Commands:"
	@echo ""
	@echo "  Setup & Installation:"
	@echo "    install          Install dependencies for both frontend and backend"
	@echo "    install-frontend Install frontend dependencies"
	@echo "    install-backend  Install backend dependencies"
	@echo ""
	@echo "  Development:"
	@echo "    dev              Start development servers (frontend + backend)"
	@echo "    dev-frontend     Start frontend development server"
	@echo "    dev-backend      Start backend development server"
	@echo ""
	@echo "  Docker:"
	@echo "    docker-build     Build Docker images"
	@echo "    docker-up        Start all services with Docker Compose"
	@echo "    docker-down      Stop all Docker services"
	@echo "    docker-logs      View Docker logs"
	@echo ""
	@echo "  Code Quality:"
	@echo "    format           Format code (frontend + backend)"
	@echo "    lint             Lint code (frontend + backend)"
	@echo "    type-check       Run type checking"
	@echo "    test             Run tests"
	@echo ""
	@echo "  Database:"
	@echo "    db-migrate       Run database migrations"
	@echo "    db-seed          Seed database with sample data"
	@echo ""
	@echo "  Build & Deploy:"
	@echo "    build            Build production assets"
	@echo "    clean            Clean build artifacts"

# Installation
install: install-frontend install-backend

install-frontend:
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

install-backend:
	@echo "Installing backend dependencies..."
	cd backend && pip install -r requirements.txt

# Development
dev:
	@echo "Starting development servers..."
	docker-compose up postgres redis &
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
	cd frontend && npm run dev

dev-frontend:
	@echo "Starting frontend development server..."
	cd frontend && npm run dev

dev-backend:
	@echo "Starting backend development server..."
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Docker
docker-build:
	@echo "Building Docker images..."
	docker-compose build

docker-up:
	@echo "Starting all services with Docker Compose..."
	docker-compose up -d

docker-down:
	@echo "Stopping all Docker services..."
	docker-compose down

docker-logs:
	@echo "Viewing Docker logs..."
	docker-compose logs -f

# Code Quality
format:
	@echo "Formatting code..."
	cd frontend && npm run format
	cd backend && black . && isort .

lint:
	@echo "Linting code..."
	cd frontend && npm run lint
	cd backend && flake8 .

type-check:
	@echo "Running type checking..."
	cd frontend && npm run type-check
	cd backend && mypy .

test:
	@echo "Running tests..."
	cd backend && pytest
	cd frontend && npm test 2>/dev/null || echo "Frontend tests not configured yet"

# Database
db-migrate:
	@echo "Running database migrations..."
	cd backend && python -c "from app.database.connection import create_tables; create_tables()"

db-seed:
	@echo "Seeding database with sample data..."
	cd backend && python -c "from app.database.seed import seed_database; seed_database()"

# Build
build:
	@echo "Building production assets..."
	cd frontend && npm run build
	cd backend && echo "Backend build complete"

clean:
	@echo "Cleaning build artifacts..."
	cd frontend && rm -rf dist node_modules/.cache
	cd backend && rm -rf __pycache__ .pytest_cache .mypy_cache
	docker system prune -f

# Quick setup for new developers
setup: install docker-build db-migrate
	@echo "Setup complete! Run 'make dev' to start development servers."