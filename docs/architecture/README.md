# System Architecture

This document describes the architecture of the Portfolio Optimization Dashboard using the C4 model approach, providing different levels of detail for various audiences.

## Table of Contents

1. [System Context (Level 1)](#system-context-level-1)
2. [Container Diagram (Level 2)](#container-diagram-level-2)
3. [Component Diagram (Level 3)](#component-diagram-level-3)
4. [Code Diagram (Level 4)](#code-diagram-level-4)
5. [Architecture Decisions](#architecture-decisions)
6. [Quality Attributes](#quality-attributes)
7. [Deployment Architecture](#deployment-architecture)
8. [Security Architecture](#security-architecture)

## System Context (Level 1)

The Portfolio Optimization Dashboard is a web-based financial platform that helps users optimize their investment portfolios using modern portfolio theory.

```mermaid
C4Context
    title System Context Diagram - Portfolio Optimization Dashboard

    Person(investor, "Investor", "Individual or institutional investor seeking portfolio optimization")
    Person(analyst, "Financial Analyst", "Professional analyst using advanced features")
    Person(advisor, "Financial Advisor", "Advisor managing multiple client portfolios")
    
    System(pod, "Portfolio Optimization Dashboard", "Web-based platform for portfolio optimization using modern portfolio theory and advanced algorithms")
    
    System_Ext(marketData, "Market Data APIs", "Real-time and historical financial market data")
    System_Ext(auth, "Authentication Service", "OAuth/SSO identity providers")
    System_Ext(notification, "Notification Service", "Email and SMS notifications")
    System_Ext(storage, "Cloud Storage", "Document and file storage")
    
    Rel(investor, pod, "Optimizes portfolios, views analytics")
    Rel(analyst, pod, "Performs advanced analysis, backtesting")
    Rel(advisor, pod, "Manages client portfolios")
    
    Rel(pod, marketData, "Retrieves price data, company information")
    Rel(pod, auth, "Authenticates users")
    Rel(pod, notification, "Sends alerts and reports")
    Rel(pod, storage, "Stores/retrieves documents")
```

### Key External Dependencies

- **Market Data APIs**: Yahoo Finance, Alpha Vantage, IEX Cloud for real-time and historical data
- **Authentication Services**: Auth0, AWS Cognito, or Google OAuth for user management
- **Notification Services**: SendGrid, AWS SES for email notifications
- **Cloud Storage**: AWS S3, Google Cloud Storage for file storage
- **Monitoring**: DataDog, New Relic for application performance monitoring

## Container Diagram (Level 2)

```mermaid
C4Container
    title Container Diagram - Portfolio Optimization Dashboard

    Person(user, "User", "Portfolio manager, investor, or analyst")
    
    Container_Boundary(c1, "Portfolio Optimization Dashboard") {
        Container(spa, "Single-Page Application", "React, TypeScript", "Provides interactive portfolio optimization interface")
        Container(api, "API Application", "FastAPI, Python", "Provides portfolio optimization REST API")
        Container(worker, "Background Workers", "Celery, Python", "Handles intensive calculations and batch processing")
        Container(websocket, "WebSocket Server", "FastAPI WebSocket", "Real-time updates and notifications")
    }
    
    ContainerDb(postgres, "Primary Database", "PostgreSQL", "Stores user data, portfolios, and optimization results")
    ContainerDb(redis, "Cache & Queue", "Redis", "Caches data and manages background job queue")
    ContainerDb(timeseries, "Time Series Database", "InfluxDB", "Stores historical price and performance data")
    
    Container_Ext(cdn, "Content Delivery Network", "CloudFlare", "Serves static assets globally")
    Container_Ext(fileStorage, "File Storage", "AWS S3", "Stores uploaded documents and generated reports")
    
    System_Ext(marketAPIs, "Market Data APIs", "Multiple providers for financial data")
    System_Ext(authProvider, "Identity Provider", "Auth0/OAuth")
    
    Rel(user, spa, "Uses", "HTTPS")
    Rel(user, cdn, "Loads assets", "HTTPS")
    
    Rel(spa, api, "Makes API calls", "JSON/HTTPS")
    Rel(spa, websocket, "Real-time updates", "WSS")
    
    Rel(api, postgres, "Reads/writes", "SQL/TCP")
    Rel(api, redis, "Caches data", "Redis Protocol")
    Rel(api, timeseries, "Stores metrics", "HTTP")
    Rel(api, worker, "Queues jobs", "Redis")
    Rel(api, fileStorage, "Stores files", "HTTPS")
    
    Rel(worker, postgres, "Updates results", "SQL/TCP")
    Rel(worker, redis, "Gets jobs", "Redis Protocol")
    Rel(worker, marketAPIs, "Fetches data", "HTTPS")
    
    Rel(websocket, redis, "Pub/Sub", "Redis Protocol")
    
    Rel(api, authProvider, "Validates tokens", "HTTPS")
```

### Container Responsibilities

| Container | Technology | Responsibility |
|-----------|------------|----------------|
| **Single-Page Application** | React 18, TypeScript, Vite | User interface, client-side state management, data visualization |
| **API Application** | FastAPI, Python 3.11 | Business logic, authentication, data validation, API endpoints |
| **Background Workers** | Celery, Python | Intensive calculations, batch processing, scheduled tasks |
| **WebSocket Server** | FastAPI WebSocket | Real-time updates, live notifications, collaborative features |
| **Primary Database** | PostgreSQL 15 | User data, portfolios, optimization results, audit logs |
| **Cache & Queue** | Redis 7 | Session storage, API caching, job queue management |
| **Time Series Database** | InfluxDB | Historical prices, performance metrics, monitoring data |

## Component Diagram (Level 3)

### API Application Components

```mermaid
C4Component
    title Component Diagram - API Application

    Container_Boundary(api, "API Application") {
        Component(auth, "Authentication Component", "FastAPI Security", "Handles JWT authentication and authorization")
        Component(portfolio, "Portfolio Management", "FastAPI Router", "CRUD operations for portfolios and holdings")
        Component(optimization, "Optimization Engine", "Python/NumPy", "Portfolio optimization algorithms")
        Component(analytics, "Analytics Service", "Python/Pandas", "Risk metrics and performance calculations")
        Component(marketData, "Market Data Service", "HTTP Client", "Fetches and caches market data")
        Component(validation, "Input Validation", "Pydantic", "Validates and sanitizes user input")
        Component(encryption, "Encryption Service", "Cryptography", "Encrypts sensitive data")
        Component(monitoring, "Monitoring", "Prometheus", "Application metrics and health checks")
    }
    
    ContainerDb(postgres, "PostgreSQL", "Primary database")
    ContainerDb(redis, "Redis", "Cache and sessions")
    System_Ext(marketAPIs, "Market Data APIs")
    
    Rel(auth, postgres, "Validates users")
    Rel(auth, redis, "Manages sessions")
    
    Rel(portfolio, postgres, "Stores portfolios")
    Rel(portfolio, encryption, "Encrypts sensitive data")
    Rel(portfolio, validation, "Validates input")
    
    Rel(optimization, analytics, "Uses risk calculations")
    Rel(optimization, marketData, "Gets price data")
    
    Rel(analytics, marketData, "Historical data")
    
    Rel(marketData, redis, "Caches data")
    Rel(marketData, marketAPIs, "Fetches data")
    
    Rel(monitoring, postgres, "Health checks")
    Rel(monitoring, redis, "Monitors cache")
```

### Frontend Application Components

```mermaid
C4Component
    title Component Diagram - React Frontend

    Container_Boundary(spa, "Single-Page Application") {
        Component(router, "App Router", "React Router", "Client-side routing and navigation")
        Component(auth, "Authentication", "React Context", "User authentication state management")
        Component(portfolio, "Portfolio Components", "React/TypeScript", "Portfolio management UI")
        Component(optimization, "Optimization UI", "React/D3.js", "Optimization interface and visualizations")
        Component(charts, "Chart Components", "D3.js/Recharts", "Interactive financial charts")
        Component(forms, "Form Components", "React Hook Form", "Data input and validation forms")
        Component(api, "API Client", "Axios", "HTTP client for backend communication")
        Component(state, "State Management", "Zustand", "Global application state")
        Component(workers, "Web Workers", "Worker API", "Offloads intensive calculations")
        Component(monitoring, "Error Tracking", "Sentry", "Client-side error monitoring")
    }
    
    Container(apiApp, "API Application", "Backend services")
    Container(wsServer, "WebSocket Server", "Real-time updates")
    
    Rel(router, portfolio, "Routes to components")
    Rel(router, optimization, "Routes to components")
    
    Rel(auth, api, "Authentication requests")
    Rel(auth, state, "Updates auth state")
    
    Rel(portfolio, forms, "Uses input forms")
    Rel(portfolio, charts, "Displays charts")
    Rel(portfolio, api, "CRUD operations")
    
    Rel(optimization, workers, "Offloads calculations")
    Rel(optimization, charts, "Shows results")
    Rel(optimization, api, "Optimization requests")
    
    Rel(api, apiApp, "HTTP requests")
    Rel(forms, wsServer, "Real-time validation")
    
    Rel(monitoring, apiApp, "Error reporting")
```

## Architecture Decisions

### Key Architectural Patterns

1. **Microservices-Ready Monolith**
   - Single deployable unit that can be split into microservices
   - Clear service boundaries with dependency injection
   - Shared database with potential for database-per-service migration

2. **Event-Driven Architecture**
   - Redis pub/sub for real-time updates
   - Background job processing with Celery
   - WebSocket connections for live notifications

3. **CQRS (Command Query Responsibility Segregation)**
   - Separate read and write models for complex analytics
   - Optimized read models for dashboard performance
   - Event sourcing for audit trails

4. **Layered Architecture**
   - Presentation Layer (React SPA)
   - API Layer (FastAPI)
   - Business Logic Layer (Services)
   - Data Access Layer (Repositories)

### Technology Choices

| Aspect | Technology | Rationale |
|--------|------------|-----------|
| **Frontend Framework** | React 18 | Large ecosystem, TypeScript support, mature tooling |
| **Backend Framework** | FastAPI | High performance, automatic API docs, async support |
| **Database** | PostgreSQL | ACID compliance, JSON support, excellent performance |
| **Cache** | Redis | High performance, pub/sub, job queue capabilities |
| **Authentication** | JWT + OAuth | Stateless, scalable, industry standard |
| **Optimization** | NumPy/SciPy | Battle-tested numerical libraries, excellent performance |
| **Monitoring** | Prometheus + Grafana | Open source, powerful querying, great visualization |

### Design Principles

1. **Security by Design**
   - Defense in depth approach
   - Encryption at rest and in transit
   - Comprehensive input validation
   - Regular security audits

2. **Performance First**
   - Sub-second API response times
   - Aggressive caching strategies
   - Web Workers for heavy computations
   - Database query optimization

3. **Scalability**
   - Horizontal scaling capability
   - Stateless application design
   - Efficient resource utilization
   - Auto-scaling support

4. **Maintainability**
   - Clean code principles
   - Comprehensive testing
   - Automated deployment
   - Clear documentation

## Quality Attributes

### Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| **API Response Time** | < 200ms (P95) | Application Performance Monitoring |
| **Page Load Time** | < 2s (First Contentful Paint) | Lighthouse CI |
| **Optimization Time** | < 5s (50 assets) | Custom metrics |
| **Concurrent Users** | 1000+ | Load testing |
| **Database Query Time** | < 50ms (P95) | Query performance monitoring |
| **Memory Usage** | < 512MB per container | Container monitoring |

### Availability Requirements

- **Uptime**: 99.9% (8.77 hours downtime per year)
- **Recovery Time Objective (RTO)**: < 1 hour
- **Recovery Point Objective (RPO)**: < 15 minutes
- **Health Checks**: Every 30 seconds
- **Circuit Breakers**: For external API calls
- **Graceful Degradation**: Core features available during partial outages

### Security Requirements

- **Authentication**: Multi-factor authentication support
- **Authorization**: Role-based access control (RBAC)
- **Data Encryption**: AES-256 for sensitive data
- **Transport Security**: TLS 1.3 minimum
- **Input Validation**: Comprehensive sanitization
- **Audit Logging**: All user actions logged
- **Vulnerability Scanning**: Automated security testing
- **Compliance**: SOC 2 Type II, GDPR compliant

## Deployment Architecture

### Production Environment

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[ALB/CloudFlare]
    end
    
    subgraph "CDN"
        CDN[CloudFlare CDN]
    end
    
    subgraph "Kubernetes Cluster"
        subgraph "Frontend Pods"
            FE1[React App 1]
            FE2[React App 2]
            FE3[React App 3]
        end
        
        subgraph "API Pods"
            API1[FastAPI 1]
            API2[FastAPI 2]
            API3[FastAPI 3]
        end
        
        subgraph "Worker Pods"
            W1[Celery Worker 1]
            W2[Celery Worker 2]
        end
    end
    
    subgraph "Databases"
        PG[(PostgreSQL Primary)]
        PGR[(PostgreSQL Replica)]
        RD[(Redis Cluster)]
        IF[(InfluxDB)]
    end
    
    subgraph "External Services"
        S3[AWS S3]
        MARKET[Market Data APIs]
        AUTH[Auth Provider]
    end
    
    CDN --> FE1
    CDN --> FE2
    CDN --> FE3
    
    LB --> API1
    LB --> API2
    LB --> API3
    
    API1 --> PG
    API2 --> PG
    API3 --> PGR
    
    API1 --> RD
    API2 --> RD
    API3 --> RD
    
    W1 --> PG
    W2 --> PG
    W1 --> RD
    W2 --> RD
    
    API1 --> S3
    W1 --> MARKET
    API1 --> AUTH
```

### Container Orchestration

- **Platform**: Kubernetes 1.28+
- **Ingress**: NGINX Ingress Controller
- **Service Mesh**: Istio (optional)
- **Secrets Management**: Kubernetes Secrets + External Secrets Operator
- **Auto Scaling**: Horizontal Pod Autoscaler (HPA)
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)

### Environment Strategy

| Environment | Purpose | Configuration |
|-------------|---------|---------------|
| **Development** | Local development | Docker Compose, minimal resources |
| **Staging** | Pre-production testing | Kubernetes, production-like setup |
| **Production** | Live system | Kubernetes, high availability, monitoring |
| **DR** | Disaster recovery | Cross-region deployment, automated failover |

## Security Architecture

### Defense in Depth

```mermaid
graph TD
    subgraph "Edge Security"
        WAF[Web Application Firewall]
        DDoS[DDoS Protection]
        CDN[CDN with Security Rules]
    end
    
    subgraph "Network Security"
        LB[Load Balancer with SSL]
        FW[Network Firewall]
        VPN[VPC/Private Networks]
    end
    
    subgraph "Application Security"
        AUTH[JWT Authentication]
        RBAC[Role-Based Access Control]
        VALID[Input Validation]
        RATE[Rate Limiting]
    end
    
    subgraph "Data Security"
        ENC[Encryption at Rest]
        TLS[TLS in Transit]
        HASH[Password Hashing]
        AUDIT[Audit Logging]
    end
    
    subgraph "Infrastructure Security"
        SCAN[Vulnerability Scanning]
        PATCH[Automated Patching]
        BACKUP[Encrypted Backups]
        MONITOR[Security Monitoring]
    end
    
    WAF --> LB
    DDoS --> WAF
    CDN --> WAF
    
    LB --> AUTH
    FW --> RBAC
    VPN --> VALID
    
    AUTH --> ENC
    RBAC --> TLS
    VALID --> HASH
    RATE --> AUDIT
    
    ENC --> SCAN
    TLS --> PATCH
    HASH --> BACKUP
    AUDIT --> MONITOR
```

### Security Controls

1. **Preventive Controls**
   - Input validation and sanitization
   - Authentication and authorization
   - Network segmentation
   - Encryption of sensitive data

2. **Detective Controls**
   - Security monitoring and alerting
   - Audit logging and analysis
   - Vulnerability scanning
   - Intrusion detection

3. **Corrective Controls**
   - Incident response procedures
   - Automated patching
   - Backup and recovery
   - Security training

### Compliance Framework

- **Data Privacy**: GDPR, CCPA compliance
- **Financial Regulations**: SOX compliance for financial data
- **Security Standards**: ISO 27001, SOC 2 Type II
- **Industry Standards**: NIST Cybersecurity Framework
- **Code Security**: OWASP Top 10 mitigation

---

*This architecture documentation is maintained by the development team and updated with each major release. For questions or clarifications, please refer to the [contributing guidelines](../../CONTRIBUTING.md) or contact the architecture team.*