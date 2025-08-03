#!/bin/bash

# Portfolio Optimization Dashboard - Demo Setup Script
# This script sets up a complete demo environment with sample data

set -e

echo "🚀 Portfolio Optimization Dashboard - Demo Setup"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEMO_DOMAIN=${DEMO_DOMAIN:-"demo.portfolio-dashboard.com"}
API_DOMAIN=${API_DOMAIN:-"api-demo.portfolio-dashboard.com"}
ENVIRONMENT=${ENVIRONMENT:-"demo"}

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    print_success "Docker found"
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    print_success "Docker Compose found"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    print_success "Node.js found: $(node --version)"
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed"
        exit 1
    fi
    print_success "Python found: $(python3 --version)"
}

# Create demo environment file
create_demo_env() {
    print_status "Creating demo environment configuration..."
    
    # Backend environment
    cat > backend/.env.demo << EOF
# Demo Environment Configuration
ENVIRONMENT=demo
DEBUG=false

# Database
DATABASE_URL=postgresql://demo_user:demo_password@localhost:5432/portfolio_demo
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20

# Redis
REDIS_URL=redis://localhost:6379/0

# Security (Demo keys - DO NOT USE IN PRODUCTION)
JWT_SECRET_KEY=demo_jwt_secret_key_not_for_production_use
JWT_REFRESH_SECRET_KEY=demo_jwt_refresh_secret_key_not_for_production
ENCRYPTION_KEY=demo_encryption_key_32_bytes_long
SECRET_KEY=demo_secret_key_for_session_management

# Market Data API (Using Alpha Vantage free tier for demo)
ALPHA_VANTAGE_API_KEY=demo
MARKET_DATA_PROVIDER=alpha_vantage
USE_MOCK_DATA=true  # Use mock data for demo

# Email (Disabled for demo)
EMAIL_ENABLED=false

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,https://${DEMO_DOMAIN}

# Demo Mode
DEMO_MODE=true
DEMO_USER_EMAIL=demo@portfolio-dashboard.com
DEMO_USER_PASSWORD=DemoPass2024!
AUTO_RESET_INTERVAL=86400  # Reset demo data daily

# Rate Limiting (Relaxed for demo)
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=100
EOF

    # Frontend environment
    cat > frontend/.env.demo << EOF
# Demo Frontend Configuration
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000
REACT_APP_ENVIRONMENT=demo
REACT_APP_VERSION=1.0.0-demo
REACT_APP_DEMO_MODE=true
REACT_APP_DEMO_AUTO_LOGIN=true
REACT_APP_SHOW_DEMO_NOTICE=true
EOF

    print_success "Environment files created"
}

# Set up demo database
setup_demo_database() {
    print_status "Setting up demo database..."
    
    # Start PostgreSQL container
    docker run -d \
        --name portfolio-demo-postgres \
        -e POSTGRES_USER=demo_user \
        -e POSTGRES_PASSWORD=demo_password \
        -e POSTGRES_DB=portfolio_demo \
        -p 5432:5432 \
        postgres:15-alpine || print_warning "PostgreSQL container already exists"
    
    # Wait for PostgreSQL to be ready
    print_status "Waiting for PostgreSQL to be ready..."
    sleep 10
    
    # Run migrations
    cd backend
    python3 -m venv venv_demo
    source venv_demo/bin/activate
    pip install -r requirements.txt
    
    # Create tables
    alembic upgrade head
    
    print_success "Database setup complete"
    cd ..
}

# Set up Redis for demo
setup_demo_redis() {
    print_status "Setting up Redis cache..."
    
    docker run -d \
        --name portfolio-demo-redis \
        -p 6379:6379 \
        redis:7-alpine || print_warning "Redis container already exists"
    
    print_success "Redis setup complete"
}

# Create demo data
create_demo_data() {
    print_status "Creating demo data..."
    
    # Create Python script for demo data
    cat > scripts/create_demo_data.py << 'EOF'
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from backend.app.database.connection_pool import db_pool, initialize_database_pools
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

async def create_demo_data():
    """Create comprehensive demo data."""
    
    # Initialize database
    await initialize_database_pools()
    
    async with db_pool.get_session() as session:
        # Create demo user
        await session.execute(text("""
            INSERT INTO users (email, username, hashed_password, is_active, is_demo, created_at)
            VALUES (:email, :username, :password, true, true, :created_at)
            ON CONFLICT (email) DO NOTHING
            RETURNING id
        """), {
            "email": "demo@portfolio-dashboard.com",
            "username": "demo_user",
            "password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLyBt1Q2q7C",  # DemoPass2024!
            "created_at": datetime.utcnow()
        })
        
        result = await session.execute(text("SELECT id FROM users WHERE email = :email"), {
            "email": "demo@portfolio-dashboard.com"
        })
        user_id = result.scalar()
        
        # Create sample portfolios
        portfolios = [
            {
                "name": "Conservative Growth Portfolio",
                "description": "A balanced approach with 60% stocks and 40% bonds for steady growth",
                "target_return": 0.08,
                "risk_tolerance": "moderate"
            },
            {
                "name": "Technology Innovation Fund",
                "description": "High-growth technology stocks with focus on AI and cloud computing",
                "target_return": 0.15,
                "risk_tolerance": "aggressive"
            },
            {
                "name": "Dividend Income Strategy",
                "description": "Focus on high-quality dividend-paying stocks for regular income",
                "target_return": 0.06,
                "risk_tolerance": "conservative"
            },
            {
                "name": "Global Diversification Mix",
                "description": "Internationally diversified portfolio across developed and emerging markets",
                "target_return": 0.10,
                "risk_tolerance": "moderate"
            },
            {
                "name": "ESG Sustainable Growth",
                "description": "Environmental, Social, and Governance focused investments",
                "target_return": 0.09,
                "risk_tolerance": "moderate"
            }
        ]
        
        # Portfolio holdings
        portfolio_holdings = {
            "Conservative Growth Portfolio": [
                ("SPY", 0.30, "S&P 500 ETF"),
                ("AGG", 0.25, "Aggregate Bond ETF"),
                ("VEA", 0.15, "Developed Markets ETF"),
                ("BND", 0.15, "Vanguard Total Bond"),
                ("GLD", 0.10, "Gold ETF"),
                ("VNQ", 0.05, "Real Estate ETF")
            ],
            "Technology Innovation Fund": [
                ("AAPL", 0.20, "Apple Inc."),
                ("MSFT", 0.20, "Microsoft Corporation"),
                ("GOOGL", 0.15, "Alphabet Inc."),
                ("NVDA", 0.15, "NVIDIA Corporation"),
                ("AMZN", 0.10, "Amazon.com Inc."),
                ("META", 0.10, "Meta Platforms Inc."),
                ("TSLA", 0.10, "Tesla Inc.")
            ],
            "Dividend Income Strategy": [
                ("VYM", 0.25, "Vanguard High Dividend Yield ETF"),
                ("JNJ", 0.15, "Johnson & Johnson"),
                ("PG", 0.15, "Procter & Gamble"),
                ("KO", 0.15, "Coca-Cola Company"),
                ("PEP", 0.10, "PepsiCo Inc."),
                ("MCD", 0.10, "McDonald's Corporation"),
                ("T", 0.10, "AT&T Inc.")
            ],
            "Global Diversification Mix": [
                ("VTI", 0.30, "Total US Market ETF"),
                ("VXUS", 0.25, "Total International Stock ETF"),
                ("VWO", 0.15, "Emerging Markets ETF"),
                ("VNQI", 0.10, "Global Real Estate ETF"),
                ("VTEB", 0.10, "Tax-Exempt Bond ETF"),
                ("IAU", 0.10, "Gold Trust ETF")
            ],
            "ESG Sustainable Growth": [
                ("ESGU", 0.35, "ESG US Stock ETF"),
                ("ESGD", 0.25, "ESG International ETF"),
                ("ICLN", 0.15, "Clean Energy ETF"),
                ("ESGE", 0.10, "ESG Emerging Markets ETF"),
                ("SUSL", 0.10, "ESG Revenue ETF"),
                ("EAGG", 0.05, "ESG Aggregate Bond ETF")
            ]
        }
        
        # Create portfolios and holdings
        for portfolio_data in portfolios:
            # Insert portfolio
            await session.execute(text("""
                INSERT INTO portfolios (user_id, name, description, target_return, created_at, updated_at)
                VALUES (:user_id, :name, :description, :target_return, :created_at, :updated_at)
                ON CONFLICT (user_id, name) DO NOTHING
                RETURNING id
            """), {
                "user_id": user_id,
                "name": portfolio_data["name"],
                "description": portfolio_data["description"],
                "target_return": portfolio_data["target_return"],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
            
            result = await session.execute(text(
                "SELECT id FROM portfolios WHERE user_id = :user_id AND name = :name"
            ), {
                "user_id": user_id,
                "name": portfolio_data["name"]
            })
            portfolio_id = result.scalar()
            
            if portfolio_id and portfolio_data["name"] in portfolio_holdings:
                # Insert holdings
                for symbol, allocation, name in portfolio_holdings[portfolio_data["name"]]:
                    await session.execute(text("""
                        INSERT INTO portfolio_holdings 
                        (portfolio_id, asset_symbol, asset_name, allocation_percentage, created_at)
                        VALUES (:portfolio_id, :symbol, :name, :allocation, :created_at)
                        ON CONFLICT (portfolio_id, asset_symbol) DO UPDATE
                        SET allocation_percentage = :allocation, updated_at = :created_at
                    """), {
                        "portfolio_id": portfolio_id,
                        "symbol": symbol,
                        "name": name,
                        "allocation": allocation,
                        "created_at": datetime.utcnow()
                    })
                
                # Create optimization results
                await session.execute(text("""
                    INSERT INTO optimization_results 
                    (portfolio_id, optimization_method, expected_return, volatility, sharpe_ratio, status, created_at)
                    VALUES (:portfolio_id, :method, :return, :volatility, :sharpe, :status, :created_at)
                    ON CONFLICT DO NOTHING
                """), {
                    "portfolio_id": portfolio_id,
                    "method": "markowitz",
                    "return": portfolio_data["target_return"] + 0.02,  # Slightly optimized
                    "volatility": 0.12 if portfolio_data["risk_tolerance"] == "conservative" else 0.18,
                    "sharpe": 0.85 if portfolio_data["risk_tolerance"] == "conservative" else 0.65,
                    "status": "completed",
                    "created_at": datetime.utcnow()
                })
        
        await session.commit()
        print("✓ Demo data created successfully!")

if __name__ == "__main__":
    asyncio.run(create_demo_data())
EOF

    # Run the script
    cd backend
    source venv_demo/bin/activate
    cd ..
    python scripts/create_demo_data.py
    
    print_success "Demo data created"
}

# Build and start services
start_demo_services() {
    print_status "Starting demo services..."
    
    # Create docker-compose for demo
    cat > docker-compose.demo.yml << EOF
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: portfolio-demo-backend
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=demo
      - DATABASE_URL=postgresql://demo_user:demo_password@postgres:5432/portfolio_demo
      - REDIS_URL=redis://redis:6379/0
    volumes:
      - ./backend:/app
    depends_on:
      - postgres
      - redis
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: portfolio-demo-frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:8000
      - REACT_APP_DEMO_MODE=true
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend

  postgres:
    image: postgres:15-alpine
    container_name: portfolio-demo-postgres-compose
    environment:
      - POSTGRES_USER=demo_user
      - POSTGRES_PASSWORD=demo_password
      - POSTGRES_DB=portfolio_demo
    volumes:
      - demo_postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: portfolio-demo-redis-compose

  nginx:
    image: nginx:alpine
    container_name: portfolio-demo-nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx/demo.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend
      - frontend

volumes:
  demo_postgres_data:
EOF

    # Create nginx config for demo
    mkdir -p nginx
    cat > nginx/demo.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:8000;
    }

    upstream frontend {
        server frontend:3000;
    }

    server {
        listen 80;
        server_name localhost;

        location /api {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location /ws {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
EOF

    # Stop any existing demo containers
    docker-compose -f docker-compose.demo.yml down

    # Start services
    docker-compose -f docker-compose.demo.yml up -d

    print_success "Demo services started"
}

# Create demo reset script
create_reset_script() {
    print_status "Creating demo reset script..."
    
    cat > scripts/reset_demo.sh << 'EOF'
#!/bin/bash
# Reset demo data to original state

echo "Resetting demo data..."

# Run the demo data creation script
cd /app
python scripts/create_demo_data.py

echo "Demo data reset complete!"
EOF

    chmod +x scripts/reset_demo.sh
    
    # Set up cron job for daily reset
    if command -v crontab &> /dev/null; then
        (crontab -l 2>/dev/null; echo "0 0 * * * cd $(pwd) && ./scripts/reset_demo.sh > /tmp/demo_reset.log 2>&1") | crontab -
        print_success "Daily reset cron job configured"
    else
        print_warning "Crontab not available - manual reset required"
    fi
}

# Display demo information
display_demo_info() {
    echo ""
    echo "=============================================="
    echo -e "${GREEN}✓ Demo Setup Complete!${NC}"
    echo "=============================================="
    echo ""
    echo "🌐 Access the demo at:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend API: http://localhost:8000"
    echo "   API Docs: http://localhost:8000/docs"
    echo ""
    echo "📧 Demo Login Credentials:"
    echo "   Email: demo@portfolio-dashboard.com"
    echo "   Password: DemoPass2024!"
    echo ""
    echo "📊 Sample Portfolios Available:"
    echo "   • Conservative Growth Portfolio"
    echo "   • Technology Innovation Fund"
    echo "   • Dividend Income Strategy"
    echo "   • Global Diversification Mix"
    echo "   • ESG Sustainable Growth"
    echo ""
    echo "🔧 Useful Commands:"
    echo "   View logs: docker-compose -f docker-compose.demo.yml logs -f"
    echo "   Stop demo: docker-compose -f docker-compose.demo.yml down"
    echo "   Reset data: ./scripts/reset_demo.sh"
    echo ""
    echo "📝 Notes:"
    echo "   - Demo data resets daily at midnight"
    echo "   - All features are available in read-only mode"
    echo "   - Market data is mocked for consistent demo experience"
    echo ""
}

# Main execution
main() {
    print_status "Starting Portfolio Optimization Dashboard Demo Setup"
    
    check_prerequisites
    create_demo_env
    setup_demo_database
    setup_demo_redis
    create_demo_data
    start_demo_services
    create_reset_script
    
    # Wait for services to be ready
    print_status "Waiting for services to start..."
    sleep 20
    
    # Check if services are running
    if curl -s http://localhost:8000/health > /dev/null; then
        print_success "Backend is running"
    else
        print_error "Backend failed to start"
    fi
    
    if curl -s http://localhost:3000 > /dev/null; then
        print_success "Frontend is running"
    else
        print_warning "Frontend is still starting..."
    fi
    
    display_demo_info
}

# Run main function
main