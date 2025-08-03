# Production Deployment Guide

This comprehensive guide walks you through deploying the Portfolio Optimization Dashboard to production environments with real-world configurations, monitoring, and live demo setup.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables & API Keys](#environment-variables--api-keys)
3. [Cloud Provider Setup](#cloud-provider-setup)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Database Setup](#database-setup)
7. [Monitoring & Observability](#monitoring--observability)
8. [Custom Domain Setup](#custom-domain-setup)
9. [Live Demo Configuration](#live-demo-configuration)
10. [Post-Deployment Checklist](#post-deployment-checklist)

## Prerequisites

### Required Tools
```bash
# Install required CLI tools
brew install kubectl helm terraform
brew install awscli  # or gcloud, az

# Verify installations
kubectl version --client
helm version
terraform version
```

### Required Accounts
- **Cloud Provider**: AWS, GCP, or Azure account
- **Market Data API**: Alpha Vantage, IEX Cloud, or Polygon.io
- **Domain Registrar**: For custom domain
- **Monitoring**: Grafana Cloud (optional) or self-hosted
- **Container Registry**: Docker Hub, ECR, GCR, or ACR

## Environment Variables & API Keys

### 1. Market Data API Setup

#### Alpha Vantage (Free Tier Available)
```bash
# Sign up at https://www.alphavantage.co/support/#api-key
ALPHA_VANTAGE_API_KEY="your_api_key_here"
MARKET_DATA_PROVIDER="alpha_vantage"
```

#### IEX Cloud (Production Grade)
```bash
# Sign up at https://iexcloud.io/
IEX_CLOUD_API_KEY="pk_your_publishable_key"
IEX_CLOUD_SECRET_KEY="sk_your_secret_key"
MARKET_DATA_PROVIDER="iex_cloud"
```

#### Polygon.io (Best for Real-time)
```bash
# Sign up at https://polygon.io/
POLYGON_API_KEY="your_api_key_here"
MARKET_DATA_PROVIDER="polygon"
```

### 2. Create Production Environment File

```bash
# backend/.env.production
# Database
DATABASE_URL=postgresql://portfolio_user:strong_password@postgres-primary:5432/portfolio_db
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=30

# Redis
REDIS_URL=redis://redis-cluster:6379/0
REDIS_PASSWORD=your_redis_password

# Security
JWT_SECRET_KEY=$(openssl rand -base64 32)
JWT_REFRESH_SECRET_KEY=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
SECRET_KEY=$(openssl rand -base64 32)

# Market Data API
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
IEX_CLOUD_API_KEY=your_iex_cloud_key
POLYGON_API_KEY=your_polygon_key
MARKET_DATA_PROVIDER=alpha_vantage  # or iex_cloud, polygon

# Email (for notifications)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=your_sendgrid_api_key
FROM_EMAIL=noreply@portfolio-dashboard.com

# Monitoring
SENTRY_DSN=https://your_key@sentry.io/project_id
PROMETHEUS_ENABLED=true
GRAFANA_API_KEY=your_grafana_api_key

# Cloud Storage (for exports/backups)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
S3_BUCKET_NAME=portfolio-dashboard-storage

# GDPR Compliance
GDPR_ENABLED=true
DATA_RETENTION_DAYS=2555  # 7 years

# Environment
ENVIRONMENT=production
DEBUG=false
ALLOWED_HOSTS=portfolio-dashboard.com,api.portfolio-dashboard.com
CORS_ALLOWED_ORIGINS=https://portfolio-dashboard.com,https://www.portfolio-dashboard.com
```

```bash
# frontend/.env.production
REACT_APP_API_URL=https://api.portfolio-dashboard.com
REACT_APP_WS_URL=wss://api.portfolio-dashboard.com
REACT_APP_ENVIRONMENT=production
REACT_APP_VERSION=$VERSION
REACT_APP_SENTRY_DSN=https://your_key@sentry.io/project_id
REACT_APP_GA_TRACKING_ID=UA-XXXXXXXXX-X  # Google Analytics
```

## Cloud Provider Setup

### AWS Deployment

#### 1. Create EKS Cluster
```bash
# terraform/aws/main.tf
provider "aws" {
  region = "us-east-1"
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "19.0.0"

  cluster_name    = "portfolio-dashboard-cluster"
  cluster_version = "1.27"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  node_groups = {
    main = {
      desired_capacity = 3
      max_capacity     = 10
      min_capacity     = 3

      instance_types = ["t3.large"]

      k8s_labels = {
        Environment = "production"
      }
    }
  }
}

# Apply Terraform
terraform init
terraform plan
terraform apply
```

#### 2. Configure kubectl
```bash
aws eks update-kubeconfig --region us-east-1 --name portfolio-dashboard-cluster
```

### GCP Deployment

#### 1. Create GKE Cluster
```bash
# Create project
gcloud projects create portfolio-dashboard-prod
gcloud config set project portfolio-dashboard-prod

# Enable APIs
gcloud services enable container.googleapis.com

# Create cluster
gcloud container clusters create portfolio-dashboard \
  --num-nodes=3 \
  --machine-type=n1-standard-2 \
  --enable-autoscaling \
  --min-nodes=3 \
  --max-nodes=10 \
  --region=us-central1
```

### Azure Deployment

#### 1. Create AKS Cluster
```bash
# Create resource group
az group create --name portfolio-dashboard-rg --location eastus

# Create AKS cluster
az aks create \
  --resource-group portfolio-dashboard-rg \
  --name portfolio-dashboard-aks \
  --node-count 3 \
  --enable-addons monitoring \
  --generate-ssh-keys
```

## Backend Deployment

### 1. Build and Push Docker Images
```bash
# Build backend image
cd backend
docker build -t your-registry/portfolio-backend:v1.0.0 -f Dockerfile.production .
docker push your-registry/portfolio-backend:v1.0.0

# Build worker image
docker build -t your-registry/portfolio-worker:v1.0.0 -f Dockerfile.worker .
docker push your-registry/portfolio-worker:v1.0.0
```

### 2. Create Kubernetes Namespace
```bash
kubectl create namespace portfolio-system
kubectl label namespace portfolio-system environment=production
```

### 3. Create Secrets
```bash
# Create secrets from env file
kubectl create secret generic backend-secrets \
  --from-env-file=.env.production \
  -n portfolio-system

# Create image pull secret
kubectl create secret docker-registry registry-secret \
  --docker-server=your-registry.com \
  --docker-username=your-username \
  --docker-password=your-password \
  -n portfolio-system
```

### 4. Install Cert Manager for SSL
```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.12.0/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager -n cert-manager --timeout=300s
```

### 5. Deploy Backend Services
```bash
# Apply all Kubernetes configurations
kubectl apply -f infrastructure/kubernetes/backend-deployment.yaml
kubectl apply -f infrastructure/kubernetes/postgres-deployment.yaml
kubectl apply -f infrastructure/kubernetes/redis-deployment.yaml
kubectl apply -f infrastructure/kubernetes/ingress.yaml
```

### 6. Verify Deployment
```bash
# Check pods
kubectl get pods -n portfolio-system

# Check services
kubectl get svc -n portfolio-system

# Check ingress
kubectl get ingress -n portfolio-system
```

## Frontend Deployment

### Vercel Deployment

#### 1. Install Vercel CLI
```bash
npm i -g vercel
```

#### 2. Deploy to Vercel
```bash
cd frontend

# Build the application
npm run build

# Deploy
vercel --prod

# Set environment variables
vercel env add REACT_APP_API_URL production
vercel env add REACT_APP_WS_URL production
```

#### 3. Configure Custom Domain in Vercel
1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add `portfolio-dashboard.com` and `www.portfolio-dashboard.com`
3. Update DNS records as instructed

### Netlify Deployment

#### 1. Install Netlify CLI
```bash
npm i -g netlify-cli
```

#### 2. Deploy to Netlify
```bash
cd frontend

# Build and deploy
netlify deploy --prod --dir=build

# Set environment variables
netlify env:set REACT_APP_API_URL https://api.portfolio-dashboard.com
```

## Database Setup

### 1. Production PostgreSQL with Replication

```yaml
# infrastructure/kubernetes/postgres-deployment.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-config
  namespace: portfolio-system
data:
  postgresql.conf: |
    # Connection settings
    listen_addresses = '*'
    max_connections = 200
    
    # Memory settings
    shared_buffers = 1GB
    effective_cache_size = 3GB
    work_mem = 16MB
    maintenance_work_mem = 256MB
    
    # WAL settings
    wal_level = replica
    max_wal_senders = 10
    wal_keep_segments = 64
    
    # Query tuning
    random_page_cost = 1.1
    effective_io_concurrency = 200
    
    # Logging
    log_statement = 'mod'
    log_duration = on
    log_min_duration_statement = 100ms
```

### 2. Initialize Database
```bash
# Port forward to postgres
kubectl port-forward -n portfolio-system svc/postgres-primary 5432:5432

# Run migrations
cd backend
alembic upgrade head

# Create initial admin user
python scripts/create_admin.py
```

### 3. Set Up Automated Backups
```bash
# Create backup CronJob
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: portfolio-system
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: postgres-backup
            image: postgres:15-alpine
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: password
            command:
            - /bin/sh
            - -c
            - |
              DATE=\$(date +%Y%m%d_%H%M%S)
              pg_dump -h postgres-primary -U portfolio_user portfolio_db | gzip > /backup/backup_\$DATE.sql.gz
              # Upload to S3
              aws s3 cp /backup/backup_\$DATE.sql.gz s3://portfolio-backups/postgres/
            volumeMounts:
            - name: backup
              mountPath: /backup
          volumes:
          - name: backup
            emptyDir: {}
          restartPolicy: OnFailure
EOF
```

## Monitoring & Observability

### 1. Install Prometheus Operator
```bash
# Add Prometheus helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Prometheus Operator
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false \
  --set grafana.adminPassword='your-secure-password'
```

### 2. Configure Grafana Dashboards

#### Portfolio Dashboard Metrics
```json
{
  "dashboard": {
    "title": "Portfolio Optimization Dashboard",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Response Time P95",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Optimization Success Rate",
        "targets": [
          {
            "expr": "rate(portfolio_optimization_total{status='success'}[5m]) / rate(portfolio_optimization_total[5m])"
          }
        ]
      },
      {
        "title": "Active Users",
        "targets": [
          {
            "expr": "active_users_current"
          }
        ]
      }
    ]
  }
}
```

#### Import Dashboard
```bash
# Port forward to Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# Access Grafana at http://localhost:3000
# Default username: admin
# Import dashboard JSON
```

### 3. Set Up Alerts
```yaml
# infrastructure/kubernetes/prometheus-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: portfolio-alerts
  namespace: portfolio-system
spec:
  groups:
  - name: portfolio.rules
    interval: 30s
    rules:
    - alert: HighErrorRate
      expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: High error rate detected
        description: "Error rate is {{ $value | humanizePercentage }}"
    
    - alert: SlowResponseTime
      expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: Slow response times
        description: "95th percentile response time is {{ $value }}s"
    
    - alert: OptimizationFailures
      expr: rate(portfolio_optimization_total{status='failed'}[5m]) > 0.1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: High optimization failure rate
        description: "Optimization failure rate is {{ $value | humanizePercentage }}"
```

### 4. Configure Grafana Cloud (Optional)
```bash
# Install Grafana Agent
helm repo add grafana https://grafana.github.io/helm-charts
helm install grafana-agent grafana/grafana-agent \
  --namespace monitoring \
  --set agent.configMap.create=true \
  --set agent.configMap.content="$(cat grafana-agent-config.yaml)"
```

## Custom Domain Setup

### 1. Configure DNS Records
```bash
# For portfolio-dashboard.com
A     @       -> Your Load Balancer IP
A     www     -> Your Load Balancer IP
A     api     -> Your Load Balancer IP
CNAME monitoring -> monitoring.portfolio-dashboard.com
```

### 2. Update Ingress with TLS
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: portfolio-ingress
  namespace: portfolio-system
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - portfolio-dashboard.com
    - www.portfolio-dashboard.com
    - api.portfolio-dashboard.com
    secretName: portfolio-tls-secret
```

## Live Demo Configuration

### 1. Create Demo Data
```python
# scripts/create_demo_data.py
import asyncio
from app.database.connection_pool import db_pool
from app.models import User, Portfolio, Asset

async def create_demo_portfolios():
    """Create sample portfolios for live demo."""
    
    # Create demo user
    demo_user = User(
        email="demo@portfolio-dashboard.com",
        username="demo_user",
        is_demo=True
    )
    
    # Sample portfolios
    portfolios = [
        {
            "name": "Conservative Growth",
            "description": "Low-risk balanced portfolio",
            "holdings": {
                "VTI": 0.40,   # US Total Market
                "VXUS": 0.20,  # International Stocks
                "BND": 0.30,   # US Bonds
                "BNDX": 0.10   # International Bonds
            }
        },
        {
            "name": "Tech Innovation",
            "description": "Technology-focused growth portfolio",
            "holdings": {
                "AAPL": 0.20,
                "MSFT": 0.20,
                "GOOGL": 0.15,
                "AMZN": 0.15,
                "NVDA": 0.10,
                "TSLA": 0.10,
                "META": 0.10
            }
        },
        {
            "name": "Dividend Income",
            "description": "High-yield dividend portfolio",
            "holdings": {
                "VYM": 0.30,   # High Dividend Yield ETF
                "SCHD": 0.25,  # Dividend Equity ETF
                "DVY": 0.20,   # Select Dividend ETF
                "HDV": 0.15,   # High Dividend ETF
                "NOBL": 0.10   # Dividend Aristocrats
            }
        },
        {
            "name": "ESG Sustainable",
            "description": "Environmental, Social, and Governance focused",
            "holdings": {
                "ESGU": 0.30,  # ESG US Stock ETF
                "ESGD": 0.20,  # ESG International ETF
                "SUSL": 0.20,  # ESG Revenue ETF
                "ESGE": 0.15,  # ESG Emerging Markets
                "EAGG": 0.15   # ESG Aggregate Bond
            }
        }
    ]
    
    # Create portfolios in database
    async with db_pool.get_session() as session:
        session.add(demo_user)
        await session.commit()
        
        for portfolio_data in portfolios:
            portfolio = Portfolio(
                user_id=demo_user.id,
                name=portfolio_data["name"],
                description=portfolio_data["description"]
            )
            session.add(portfolio)
            await session.commit()
            
            # Add holdings
            for symbol, allocation in portfolio_data["holdings"].items():
                holding = PortfolioHolding(
                    portfolio_id=portfolio.id,
                    asset_symbol=symbol,
                    allocation_percentage=allocation
                )
                session.add(holding)
            
            await session.commit()
            
            # Run optimization
            await optimize_portfolio(portfolio.id, "markowitz")
    
    print("Demo portfolios created successfully!")

if __name__ == "__main__":
    asyncio.run(create_demo_portfolios())
```

### 2. Enable Demo Mode
```typescript
// frontend/src/config/demo.ts
export const DEMO_CONFIG = {
  enabled: true,
  autoLogin: true,
  credentials: {
    email: 'demo@portfolio-dashboard.com',
    password: 'demo_password_2024'
  },
  features: {
    readOnly: true,
    hidePersonalInfo: true,
    showDemoNotice: true
  },
  samplePortfolios: [
    'Conservative Growth',
    'Tech Innovation',
    'Dividend Income',
    'ESG Sustainable'
  ]
};
```

### 3. Demo Mode UI
```typescript
// frontend/src/components/DemoNotice.tsx
import React from 'react';
import { Alert, Button } from '@mui/material';

export const DemoNotice: React.FC = () => {
  return (
    <Alert 
      severity="info" 
      action={
        <Button color="inherit" size="small" href="/signup">
          Sign Up
        </Button>
      }
    >
      You're using the demo version. Data is read-only and resets daily.
    </Alert>
  );
};
```

## Post-Deployment Checklist

### Security
- [ ] SSL certificates properly configured
- [ ] Security headers verified (use securityheaders.com)
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Secrets rotated from defaults
- [ ] Database encrypted at rest
- [ ] Backup encryption enabled

### Performance
- [ ] CDN configured for static assets
- [ ] Database indices optimized
- [ ] Redis cache warmed up
- [ ] Autoscaling configured
- [ ] Load testing completed

### Monitoring
- [ ] All dashboards imported
- [ ] Alerts configured
- [ ] Log aggregation working
- [ ] Error tracking enabled
- [ ] Uptime monitoring active

### Compliance
- [ ] GDPR consent flows tested
- [ ] Privacy policy accessible
- [ ] Data retention policies active
- [ ] Audit logging enabled
- [ ] Terms of service published

### Business Continuity
- [ ] Backups automated and tested
- [ ] Disaster recovery plan documented
- [ ] Runbooks created
- [ ] On-call rotation set up
- [ ] SLAs defined

### Demo
- [ ] Demo data populated
- [ ] Demo mode restrictions working
- [ ] Sample portfolios optimized
- [ ] Performance acceptable
- [ ] Reset automation configured

## Maintenance Commands

```bash
# View logs
kubectl logs -f deployment/portfolio-backend -n portfolio-system

# Scale deployment
kubectl scale deployment portfolio-backend --replicas=5 -n portfolio-system

# Update image
kubectl set image deployment/portfolio-backend backend=your-registry/portfolio-backend:v1.0.1 -n portfolio-system

# Database backup
kubectl exec -it postgres-primary-0 -n portfolio-system -- pg_dump -U portfolio_user portfolio_db > backup.sql

# Clear Redis cache
kubectl exec -it redis-cluster-0 -n portfolio-system -- redis-cli FLUSHALL
```

## Support and Troubleshooting

### Common Issues

#### 1. Market Data API Rate Limits
```python
# Implement caching and rate limiting
MARKET_DATA_CACHE_TTL = 900  # 15 minutes
API_RATE_LIMIT = 5  # requests per second
```

#### 2. High Memory Usage
```yaml
# Adjust resource limits
resources:
  limits:
    memory: "4Gi"
  requests:
    memory: "2Gi"
```

#### 3. Database Connection Pool Exhaustion
```python
# Increase pool size
DATABASE_POOL_SIZE = 50
DATABASE_MAX_OVERFLOW = 100
```

### Getting Help
- Documentation: https://portfolio-dashboard.com/docs
- Support: support@portfolio-dashboard.com
- GitHub Issues: https://github.com/yourusername/portfolio-dashboard/issues

---

This deployment guide provides a production-ready setup for the Portfolio Optimization Dashboard. Adjust configurations based on your specific requirements and scale.