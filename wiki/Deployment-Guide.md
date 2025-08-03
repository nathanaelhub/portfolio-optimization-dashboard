# Deployment Guide

**Complete guide for deploying Portfolio Optimization Dashboard to production environments**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Environment Setup](#environment-setup)
4. [Docker Deployment](#docker-deployment)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Cloud Provider Setup](#cloud-provider-setup)
7. [Monitoring & Observability](#monitoring--observability)
8. [Security Configuration](#security-configuration)
9. [Performance Optimization](#performance-optimization)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This guide covers multiple deployment strategies for the Portfolio Optimization Dashboard, from simple Docker setups to enterprise-grade Kubernetes clusters on major cloud providers.

### Deployment Options

| Option | Complexity | Scalability | Best For |
|--------|------------|-------------|----------|
| **Docker Compose** | Low | Single node | Development, small teams |
| **Kubernetes** | Medium | High | Production, enterprise |
| **Cloud Managed** | Low-Medium | Very High | All environments |
| **Serverless** | Medium | Auto | Variable workloads |

### Architecture Overview

```mermaid
graph TB
    LB[Load Balancer] --> FE[Frontend Pods]
    LB --> API[API Gateway Pods]
    API --> OPT[Optimization Engine]
    API --> DB[(PostgreSQL)]
    API --> CACHE[(Redis)]
    API --> MQ[Message Queue]
    
    subgraph Monitoring
        PROM[Prometheus]
        GRAF[Grafana]
        ALERT[AlertManager]
    end
    
    API --> PROM
    OPT --> PROM
```

---

## 🚀 Quick Start

### Prerequisites

**Required:**
- Docker 24.0+
- Docker Compose 2.0+
- 4GB+ RAM
- 20GB+ storage

**For Production:**
- Kubernetes 1.28+
- Helm 3.0+
- kubectl configured
- Cloud provider CLI (aws/gcloud/az)

### 1-Minute Demo Deployment

```bash
# Clone repository
git clone https://github.com/yourusername/Portfolio-Optimization-Dashboard.git
cd Portfolio-Optimization-Dashboard

# Start demo environment
./scripts/demo_setup.sh

# Access application
open http://localhost:3000
```

**Demo Credentials:**
- Email: `demo@portfolio-dashboard.com`  
- Password: `DemoPass2024!`

---

## 🔧 Environment Setup

### Environment Variables

Create environment files for each component:

#### Backend (.env.production)

```bash
# Database Configuration
DATABASE_URL=postgresql://portfolio_user:secure_password@postgres-primary:5432/portfolio_db
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=30

# Redis Configuration  
REDIS_URL=redis://redis-cluster:6379/0
REDIS_PASSWORD=redis_secure_password

# Security Keys (Generate with: openssl rand -base64 32)
JWT_SECRET_KEY=your_jwt_secret_key_here
JWT_REFRESH_SECRET_KEY=your_jwt_refresh_secret_here
ENCRYPTION_KEY=your_encryption_key_32_bytes
SECRET_KEY=your_application_secret_key

# Market Data APIs
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
IEX_CLOUD_API_KEY=your_iex_cloud_key  
POLYGON_API_KEY=your_polygon_key
MARKET_DATA_PROVIDER=alpha_vantage

# Email Configuration (Optional)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=your_sendgrid_api_key
FROM_EMAIL=noreply@portfolio-dashboard.com

# Monitoring
SENTRY_DSN=https://your_key@sentry.io/project_id
PROMETHEUS_ENABLED=true

# Application Settings
ENVIRONMENT=production
DEBUG=false
ALLOWED_HOSTS=portfolio-dashboard.com,api.portfolio-dashboard.com
CORS_ALLOWED_ORIGINS=https://portfolio-dashboard.com
```

#### Frontend (.env.production)

```bash
REACT_APP_API_URL=https://api.portfolio-dashboard.com
REACT_APP_WS_URL=wss://api.portfolio-dashboard.com
REACT_APP_ENVIRONMENT=production
REACT_APP_VERSION=1.0.0
REACT_APP_SENTRY_DSN=https://your_key@sentry.io/project_id
REACT_APP_GA_TRACKING_ID=UA-XXXXXXXXX-X
```

### Security Configuration

```bash
# Generate secure secrets
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 24)
REDIS_PASSWORD=$(openssl rand -base64 24)

echo "JWT_SECRET_KEY=$JWT_SECRET" >> .env.production
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env.production
echo "DATABASE_PASSWORD=$DB_PASSWORD" >> .env.production
echo "REDIS_PASSWORD=$REDIS_PASSWORD" >> .env.production
```

---

## 🐳 Docker Deployment

### Production Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    ports:
      - "80:80"
      - "443:443"
    environment:
      - REACT_APP_API_URL=https://api.portfolio-dashboard.com
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    build:
      context: ./backend  
      dockerfile: Dockerfile.prod
    ports:
      - "8000:8000"
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.worker
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
      - rabbitmq
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: portfolio_db
      POSTGRES_USER: portfolio_user
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped

  rabbitmq:
    image: rabbitmq:3-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: portfolio
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:
  prometheus_data:
  grafana_data:
```

### Deploy with Docker

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production environment
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

---

## ☸️ Kubernetes Deployment

### Namespace Setup

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: portfolio-system
  labels:
    name: portfolio-system
    environment: production
```

### Secrets Management

```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: portfolio-system
type: Opaque
data:
  database-url: cG9zdGdyZXNxbDovL3VzZXI6cGFzc0BkYi5leGFtcGxlLmNvbTo1NDMyL2RiCg==
  jwt-secret: your_base64_encoded_jwt_secret
  encryption-key: your_base64_encoded_encryption_key
  redis-password: your_base64_encoded_redis_password
```

### Database Deployment

```yaml
# postgres-deployment.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-primary
  namespace: portfolio-system
spec:
  serviceName: postgres-primary
  replicas: 1
  selector:
    matchLabels:
      app: postgres-primary
  template:
    metadata:
      labels:
        app: postgres-primary
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: portfolio_db
        - name: POSTGRES_USER
          value: portfolio_user
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-password
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 50Gi
```

### Backend Deployment

```yaml
# backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: portfolio-backend
  namespace: portfolio-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: portfolio-backend
  template:
    metadata:
      labels:
        app: portfolio-backend
    spec:
      containers:
      - name: backend
        image: your-registry/portfolio-backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        - name: JWT_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Frontend Deployment

```yaml
# frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: portfolio-frontend
  namespace: portfolio-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: portfolio-frontend
  template:
    metadata:
      labels:
        app: portfolio-frontend
    spec:
      containers:
      - name: frontend
        image: your-registry/portfolio-frontend:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
```

### Ingress Configuration

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: portfolio-ingress
  namespace: portfolio-system
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
spec:
  tls:
  - hosts:
    - portfolio-dashboard.com
    - api.portfolio-dashboard.com
    secretName: portfolio-tls
  rules:
  - host: portfolio-dashboard.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: portfolio-frontend
            port:
              number: 80
  - host: api.portfolio-dashboard.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: portfolio-backend
            port:
              number: 8000
```

### Deploy to Kubernetes

```bash
# Apply configurations
kubectl apply -f namespace.yaml
kubectl apply -f secrets.yaml
kubectl apply -f postgres-deployment.yaml
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f services.yaml
kubectl apply -f ingress.yaml

# Check deployment status
kubectl get pods -n portfolio-system
kubectl get services -n portfolio-system
kubectl get ingress -n portfolio-system

# Monitor rollout
kubectl rollout status deployment/portfolio-backend -n portfolio-system
```

---

## ☁️ Cloud Provider Setup

### AWS (EKS)

#### 1. Create EKS Cluster

```bash
# Install eksctl
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin

# Create cluster
eksctl create cluster \
  --name portfolio-cluster \
  --version 1.28 \
  --region us-east-1 \
  --nodegroup-name main \
  --node-type t3.large \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 10 \
  --managed
```

#### 2. Configure RDS Database

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier portfolio-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.4 \
  --master-username portfolio_user \
  --master-user-password your_secure_password \
  --allocated-storage 100 \
  --storage-type gp3 \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --db-subnet-group-name portfolio-subnet-group \
  --backup-retention-period 7 \
  --storage-encrypted
```

#### 3. Setup ElastiCache

```bash
# Create Redis cluster
aws elasticache create-replication-group \
  --replication-group-id portfolio-redis \
  --description "Portfolio Dashboard Redis" \
  --port 6379 \
  --cache-node-type cache.t3.medium \
  --num-cache-clusters 3 \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-group-name portfolio-cache-subnet-group
```

### GCP (GKE)

#### 1. Create GKE Cluster

```bash
# Create project and enable APIs
gcloud projects create portfolio-dashboard-prod
gcloud config set project portfolio-dashboard-prod
gcloud services enable container.googleapis.com

# Create cluster
gcloud container clusters create portfolio-cluster \
  --num-nodes=3 \
  --machine-type=n1-standard-2 \
  --enable-autoscaling \
  --min-nodes=3 \
  --max-nodes=10 \
  --region=us-central1 \
  --enable-autorepair \
  --enable-autoupgrade
```

#### 2. Setup Cloud SQL

```bash
# Create PostgreSQL instance
gcloud sql instances create portfolio-db \
  --database-version=POSTGRES_15 \
  --tier=db-n1-standard-2 \
  --region=us-central1 \
  --backup-start-time=03:00 \
  --storage-size=100GB \
  --storage-auto-increase
```

### Azure (AKS)

#### 1. Create AKS Cluster

```bash
# Create resource group
az group create --name portfolio-rg --location eastus

# Create AKS cluster
az aks create \
  --resource-group portfolio-rg \
  --name portfolio-cluster \
  --node-count 3 \
  --node-vm-size Standard_D2_v2 \
  --enable-addons monitoring \
  --generate-ssh-keys \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 10
```

---

## 📊 Monitoring & Observability

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "portfolio_rules.yml"

scrape_configs:
  - job_name: 'portfolio-backend'
    static_configs:
      - targets: ['portfolio-backend:8000']
    metrics_path: /metrics
    scrape_interval: 10s

  - job_name: 'portfolio-worker'
    static_configs:
      - targets: ['portfolio-worker:8001']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### Grafana Dashboards

Import pre-built dashboards:

1. **Portfolio Overview** (ID: 12345)
2. **API Performance** (ID: 12346)
3. **Database Metrics** (ID: 12347)
4. **Redis Metrics** (ID: 12348)

### Application Metrics

Custom metrics exposed by the application:

```python
# metrics.py
from prometheus_client import Counter, Histogram, Gauge

# API metrics
api_requests_total = Counter(
    'api_requests_total',
    'Total API requests',
    ['method', 'endpoint', 'status']
)

api_request_duration = Histogram(
    'api_request_duration_seconds',
    'API request duration',
    ['method', 'endpoint']
)

# Portfolio metrics
portfolio_optimizations_total = Counter(
    'portfolio_optimizations_total',
    'Total portfolio optimizations',
    ['method', 'status']
)

optimization_duration = Histogram(
    'optimization_duration_seconds',
    'Portfolio optimization duration',
    ['method']
)

active_users = Gauge(
    'active_users_current',
    'Current active users'
)
```

---

## 🔒 Security Configuration

### SSL/TLS Setup

#### Let's Encrypt with cert-manager

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.12.0/cert-manager.yaml

# Create ClusterIssuer
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@portfolio-dashboard.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### Security Headers

Configure security headers in Nginx:

```nginx
# nginx.conf
server {
    listen 80;
    server_name portfolio-dashboard.com;
    
    # Security headers
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data: https:";
    
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Database Security

```sql
-- Create read-only user for monitoring
CREATE USER portfolio_readonly WITH ENCRYPTED PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE portfolio_db TO portfolio_readonly;
GRANT USAGE ON SCHEMA public TO portfolio_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO portfolio_readonly;

-- Enable row-level security
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_portfolios ON portfolios FOR ALL TO portfolio_user USING (user_id = current_user_id());
```

---

## ⚡ Performance Optimization

### Database Optimization

```sql
-- Create indices for common queries
CREATE INDEX CONCURRENTLY idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX CONCURRENTLY idx_portfolio_holdings_portfolio_id ON portfolio_holdings(portfolio_id);
CREATE INDEX CONCURRENTLY idx_optimization_results_portfolio_id ON optimization_results(portfolio_id);
CREATE INDEX CONCURRENTLY idx_market_data_symbol_date ON market_data(symbol, date DESC);

-- Optimize PostgreSQL configuration
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET effective_cache_size = '6GB';
ALTER SYSTEM SET maintenance_work_mem = '512MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
SELECT pg_reload_conf();
```

### Redis Configuration

```conf
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
tcp-keepalive 300
timeout 0
```

### Application Caching

```python
# cache configuration
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://redis:6379/0',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
                'retry_on_timeout': True,
            }
        },
        'KEY_PREFIX': 'portfolio',
        'TIMEOUT': 3600,  # 1 hour default timeout
    }
}
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Issues

```bash
# Check database connectivity
kubectl exec -it postgres-primary-0 -- psql -U portfolio_user -d portfolio_db -c "SELECT 1;"

# Check connection pool
kubectl logs deployment/portfolio-backend | grep "database\|connection\|pool"

# Monitor active connections
kubectl exec -it postgres-primary-0 -- psql -U portfolio_user -d portfolio_db -c "SELECT count(*) FROM pg_stat_activity;"
```

#### 2. Redis Connection Issues

```bash
# Test Redis connectivity
kubectl exec -it redis-0 -- redis-cli ping

# Check Redis memory usage
kubectl exec -it redis-0 -- redis-cli info memory

# Monitor Redis connections
kubectl exec -it redis-0 -- redis-cli info clients
```

#### 3. Performance Issues

```bash
# Check resource usage
kubectl top pods -n portfolio-system
kubectl top nodes

# Analyze slow queries
kubectl exec -it postgres-primary-0 -- psql -U portfolio_user -d portfolio_db -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Monitor API response times
curl -w "@curl-format.txt" -o /dev/null -s "https://api.portfolio-dashboard.com/health"
```

### Debugging Commands

```bash
# View application logs
kubectl logs -f deployment/portfolio-backend -n portfolio-system

# Debug pod issues
kubectl describe pod <pod-name> -n portfolio-system

# Check resource quotas
kubectl describe resourcequota -n portfolio-system

# Monitor events
kubectl get events -n portfolio-system --sort-by=.metadata.creationTimestamp

# Port forward for local access
kubectl port-forward service/portfolio-backend 8000:8000 -n portfolio-system
```

---

## 📚 Related Documentation

- [System Architecture](System-Architecture) - Detailed system design
- [Security Configuration](Security-Configuration) - Comprehensive security setup
- [Monitoring & Logging](Monitoring-Logging) - Observability best practices
- [Docker Setup](Docker-Setup) - Container configuration details
- [Kubernetes Deployment](Kubernetes-Deployment) - K8s specific instructions

---

<div align="center">

**🚀 Ready to deploy to production?**

[📋 Full Production Guide](https://github.com/yourusername/Portfolio-Optimization-Dashboard/blob/main/docs/deployment/PRODUCTION_DEPLOYMENT_GUIDE.md) • [🐳 Docker Hub](https://hub.docker.com/r/yourusername/portfolio-dashboard) • [📊 Monitoring](https://monitoring.portfolio-dashboard.com)

[🏠 Back to Wiki Home](Home) • [🔒 Security](Security-Configuration) • [📊 Monitoring](Monitoring-Logging)

</div>