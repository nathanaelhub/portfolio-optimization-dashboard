# Contributing to Portfolio Optimization Dashboard

We're excited that you're interested in contributing! This document provides guidelines and information for contributing to the Portfolio Optimization Dashboard project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Testing Requirements](#testing-requirements)
6. [Pull Request Process](#pull-request-process)
7. [Issue Guidelines](#issue-guidelines)
8. [Financial Algorithm Contributions](#financial-algorithm-contributions)
9. [Documentation](#documentation)
10. [Community](#community)

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Positive behaviors include:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behaviors include:**
- The use of sexualized language or imagery
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate in a professional setting

### Enforcement

Project maintainers are responsible for clarifying standards and will take corrective action in response to unacceptable behavior. Contact us at conduct@portfolio-dashboard.com to report violations.

## Getting Started

### Prerequisites

- **Backend**: Python 3.11+, pip, virtualenv
- **Frontend**: Node.js 18+, npm
- **Database**: PostgreSQL 15+, Redis 7+
- **Tools**: Git, Docker (optional but recommended)

### Development Setup

1. **Fork and Clone the Repository**
   ```bash
   git clone https://github.com/your-username/portfolio-optimization-dashboard.git
   cd portfolio-optimization-dashboard
   ```

2. **Set Up Backend Environment**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
   ```

3. **Set Up Frontend Environment**
   ```bash
   cd frontend
   npm install
   ```

4. **Database Setup**
   ```bash
   # Start PostgreSQL and Redis with Docker
   docker-compose up -d postgres redis
   
   # Run database migrations
   cd backend
   alembic upgrade head
   
   # Optional: Seed with test data
   python scripts/seed_database.py
   ```

5. **Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

6. **Start Development Servers**
   ```bash
   # Backend (in backend directory)
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   
   # Frontend (in frontend directory)
   npm start
   
   # Or use our convenience script
   make dev
   ```

### Verify Installation

1. Visit `http://localhost:3000` for the frontend
2. Visit `http://localhost:8000/docs` for API documentation
3. Run tests: `make test`

## Development Workflow

### Git Workflow

We use a **Git Flow** workflow with the following branches:

- **`main`**: Production-ready code
- **`develop`**: Integration branch for features
- **`feature/*`**: New features and enhancements
- **`hotfix/*`**: Critical fixes for production
- **`release/*`**: Release preparation

### Branch Naming Convention

```
feature/add-black-litterman-optimization
bugfix/fix-correlation-matrix-calculation
hotfix/security-vulnerability-fix
docs/update-api-documentation
test/add-monte-carlo-tests
```

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(optimization): add Black-Litterman model implementation

Implements the Black-Litterman optimization method with support for
investor views and confidence levels. Includes comprehensive testing
against academic benchmarks.

Closes #123
```

```
fix(security): prevent SQL injection in portfolio queries

Replaces string concatenation with parameterized queries in the
portfolio search functionality.

Fixes #456
```

### Development Process

1. **Create Feature Branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write code following our coding standards
   - Add comprehensive tests
   - Update documentation as needed
   - Ensure all tests pass

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

4. **Push and Create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   # Create PR through GitHub interface
   ```

## Coding Standards

### Python (Backend)

We follow **PEP 8** with some modifications:

**Code Formatting:**
- Use **Black** for code formatting: `black .`
- Line length: 88 characters (Black's default)
- Use double quotes for strings
- Type hints are required for all functions

**Linting:**
- **flake8** for linting: `flake8 .`
- **mypy** for type checking: `mypy .`
- **isort** for import sorting: `isort .`

**Example:**
```python
from typing import Dict, List, Optional
import numpy as np
from app.models.portfolio import Portfolio


def calculate_portfolio_metrics(
    weights: np.ndarray,
    expected_returns: np.ndarray,
    covariance_matrix: np.ndarray,
    risk_free_rate: float = 0.02,
) -> Dict[str, float]:
    """
    Calculate comprehensive portfolio performance metrics.
    
    Args:
        weights: Portfolio asset weights
        expected_returns: Expected annual returns for each asset
        covariance_matrix: Asset covariance matrix (annualized)
        risk_free_rate: Risk-free rate for Sharpe ratio calculation
        
    Returns:
        Dictionary containing portfolio metrics
        
    Raises:
        ValueError: If inputs have incompatible dimensions
    """
    if len(weights) != len(expected_returns):
        raise ValueError("Weights and returns must have same length")
    
    portfolio_return = np.dot(weights, expected_returns)
    portfolio_variance = np.dot(weights, np.dot(covariance_matrix, weights))
    portfolio_volatility = np.sqrt(portfolio_variance)
    
    sharpe_ratio = (portfolio_return - risk_free_rate) / portfolio_volatility
    
    return {
        "expected_return": float(portfolio_return),
        "volatility": float(portfolio_volatility),
        "sharpe_ratio": float(sharpe_ratio),
    }
```

**Naming Conventions:**
- Functions: `snake_case`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Private methods: `_leading_underscore`

### TypeScript/React (Frontend)

We follow **Airbnb JavaScript Style Guide** with TypeScript extensions:

**Code Formatting:**
- Use **Prettier** for code formatting
- Use **ESLint** for linting
- 2-space indentation
- Semicolons required
- Single quotes for strings (except JSX attributes)

**React Conventions:**
- Functional components with hooks
- Props interfaces defined for all components
- Use React.memo for performance optimization when appropriate
- Custom hooks for reusable logic

**Example:**
```typescript
import React, { memo, useMemo } from 'react';
import { Card, Typography, Box } from '@mui/material';

interface PortfolioMetricsProps {
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  loading?: boolean;
}

export const PortfolioMetrics = memo<PortfolioMetricsProps>(({
  expectedReturn,
  volatility,
  sharpeRatio,
  loading = false
}) => {
  const formattedMetrics = useMemo(() => ({
    return: `${(expectedReturn * 100).toFixed(2)}%`,
    risk: `${(volatility * 100).toFixed(2)}%`,
    sharpe: sharpeRatio.toFixed(2)
  }), [expectedReturn, volatility, sharpeRatio]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <Box p={2}>
        <Typography variant="h6">Portfolio Metrics</Typography>
        <Typography>Expected Return: {formattedMetrics.return}</Typography>
        <Typography>Volatility: {formattedMetrics.risk}</Typography>
        <Typography>Sharpe Ratio: {formattedMetrics.sharpe}</Typography>
      </Box>
    </Card>
  );
});

PortfolioMetrics.displayName = 'PortfolioMetrics';
```

**File Naming:**
- Components: `PascalCase.tsx`
- Hooks: `camelCase.ts`
- Utils: `camelCase.ts`
- Types: `types.ts` or `interfaces.ts`

### Database Conventions

**Table Names:**
- Plural, snake_case: `portfolios`, `user_sessions`

**Column Names:**
- snake_case: `created_at`, `user_id`, `expected_return`

**Foreign Keys:**
- `{table_name}_id`: `user_id`, `portfolio_id`

**Indexes:**
- Always index foreign keys
- Index frequently queried columns
- Use compound indexes for multi-column queries

## Testing Requirements

### Test Coverage Requirements

- **Overall Coverage**: ≥90%
- **Financial Calculations**: ≥95%
- **API Endpoints**: ≥90%
- **React Components**: ≥85%
- **New Code**: ≥85%

### Backend Testing

**Test Structure:**
```
backend/tests/
├── unit/                    # Unit tests
│   ├── test_optimization.py
│   └── test_risk_metrics.py
├── integration/             # Integration tests
│   ├── test_api.py
│   └── test_database.py
├── financial/              # Financial accuracy tests
│   └── test_benchmarks.py
└── conftest.py             # Pytest configuration
```

**Test Categories:**
```python
import pytest

@pytest.mark.unit
def test_portfolio_return_calculation():
    """Test basic portfolio return calculation."""
    pass

@pytest.mark.integration
def test_optimization_api_endpoint():
    """Test optimization API endpoint."""
    pass

@pytest.mark.financial
def test_markowitz_against_benchmark():
    """Test Markowitz optimization against academic benchmark."""
    pass

@pytest.mark.slow
def test_monte_carlo_simulation():
    """Test Monte Carlo simulation (runs slowly)."""
    pass
```

**Running Tests:**
```bash
# All tests
pytest

# Specific categories
pytest -m unit
pytest -m integration
pytest -m financial

# With coverage
pytest --cov=app --cov-report=html

# Parallel execution
pytest -n auto
```

### Frontend Testing

**Test Structure:**
```
frontend/src/tests/
├── components/              # Component tests
├── hooks/                  # Custom hook tests
├── utils/                  # Utility function tests
├── __mocks__/              # Mock files
└── setup.ts                # Test setup
```

**Component Testing:**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { PortfolioMetrics } from '../PortfolioMetrics';

describe('PortfolioMetrics', () => {
  const mockProps = {
    expectedReturn: 0.08,
    volatility: 0.15,
    sharpeRatio: 0.53
  };

  it('displays portfolio metrics correctly', () => {
    render(<PortfolioMetrics {...mockProps} />);
    
    expect(screen.getByText('Expected Return: 8.00%')).toBeInTheDocument();
    expect(screen.getByText('Volatility: 15.00%')).toBeInTheDocument();
    expect(screen.getByText('Sharpe Ratio: 0.53')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<PortfolioMetrics {...mockProps} loading />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
```

**Running Tests:**
```bash
# All tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage

# Specific test file
npm test -- PortfolioMetrics.test.tsx
```

### Financial Algorithm Testing

All financial algorithms must be tested against academic benchmarks:

```python
def test_markowitz_optimization_academic_benchmark():
    """
    Test Markowitz optimization against Markowitz (1952) example.
    
    Uses the original 3-asset example from Markowitz's seminal paper
    to ensure our implementation matches the theoretical results.
    """
    # Markowitz (1952) example data
    expected_returns = np.array([0.062, 0.146, 0.128])
    covariance_matrix = np.array([
        [0.0146, 0.0187, 0.0145],
        [0.0187, 0.0854, 0.0104],
        [0.0145, 0.0104, 0.0289]
    ])
    
    # Expected optimal weights from academic literature
    expected_weights = np.array([0.4, 0.4, 0.2])
    
    # Run our optimization
    result = optimize_markowitz(expected_returns, covariance_matrix, target_return=0.10)
    
    # Allow small numerical differences
    np.testing.assert_allclose(result.weights, expected_weights, atol=0.01)
    
    # Verify portfolio metrics
    assert abs(result.expected_return - 0.10) < 0.001
    assert result.sharpe_ratio > 0
```

## Pull Request Process

### Before Submitting

1. **Code Quality Checks**
   ```bash
   # Backend
   make lint
   make type-check
   make test
   
   # Frontend
   npm run lint
   npm run type-check
   npm test
   
   # Full check
   make check-all
   ```

2. **Documentation Updates**
   - Update API documentation if changing endpoints
   - Add docstrings for new functions/classes
   - Update user documentation for new features
   - Include examples for complex functionality

3. **Performance Considerations**
   - Profile any performance-critical changes
   - Ensure database queries are optimized
   - Verify no memory leaks in long-running operations

### PR Template

When creating a pull request, use this template:

```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Financial Impact
For changes to financial algorithms:
- [ ] Tested against academic benchmarks
- [ ] Validated with historical data
- [ ] No changes to financial calculations
- [ ] Reviewed by quantitative team

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Financial accuracy tests pass
- [ ] Manual testing completed

## Documentation
- [ ] Code comments updated
- [ ] API documentation updated
- [ ] User documentation updated
- [ ] Architecture documentation updated (if applicable)

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Tests added for new functionality
- [ ] No breaking changes or documented appropriately
- [ ] Performance impact considered
- [ ] Security implications reviewed
```

### Review Process

1. **Automated Checks**
   - All tests must pass
   - Code coverage requirements met
   - Linting and formatting checks pass
   - Security scans complete

2. **Peer Review**
   - At least one reviewer approval required
   - Financial algorithm changes require quantitative team review
   - Breaking changes require maintainer approval

3. **Merge Requirements**
   - All CI checks pass
   - Conflicts resolved
   - Approval from required reviewers
   - Up-to-date with target branch

## Issue Guidelines

### Bug Reports

Use the bug report template:

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. macOS, Windows, Linux]
 - Browser [e.g. chrome, safari]
 - Version [e.g. 22]

**Additional context**
Add any other context about the problem here.
```

### Feature Requests

Use the feature request template:

```markdown
**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Financial/Academic Justification**
For financial features, provide academic references or industry precedent.

**Additional context**
Add any other context or screenshots about the feature request here.
```

### Issue Labels

We use the following labels:

**Type:**
- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Improvements or additions to documentation
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention is needed

**Priority:**
- `critical`: Must be fixed immediately
- `high`: Important issue
- `medium`: Standard priority
- `low`: Nice to have

**Component:**
- `backend`: Python/FastAPI backend
- `frontend`: React frontend
- `financial`: Financial algorithms
- `database`: Database related
- `infrastructure`: DevOps/deployment

## Financial Algorithm Contributions

### Academic Rigor Requirements

All financial algorithms must meet these standards:

1. **Academic Foundation**
   - Based on peer-reviewed research
   - Include citations to original papers
   - Provide theoretical background in documentation

2. **Validation Requirements**
   - Test against published benchmarks
   - Validate with historical data
   - Compare with industry implementations

3. **Documentation Standards**
   - Mathematical formulation clearly explained
   - Implementation assumptions documented
   - Limitations and edge cases noted
   - Example usage provided

### Algorithm Contribution Process

1. **Proposal**
   - Create issue with academic references
   - Explain practical use cases
   - Get approval from maintainers

2. **Implementation**
   - Follow coding standards
   - Include comprehensive docstrings
   - Add parameter validation

3. **Testing**
   - Unit tests for edge cases
   - Integration tests with existing system
   - Financial accuracy tests with benchmarks

4. **Documentation**
   - Update methodology documentation
   - Add to user guide with examples
   - Include in API documentation

### Example Algorithm Implementation

```python
def optimize_black_litterman(
    prior_returns: np.ndarray,
    covariance_matrix: np.ndarray,
    views_matrix: np.ndarray,
    view_returns: np.ndarray,
    view_uncertainty: np.ndarray,
    tau: float = 0.025,
    risk_aversion: float = 1.0,
) -> OptimizationResult:
    """
    Black-Litterman portfolio optimization.
    
    Combines market equilibrium with investor views using Bayesian methods.
    Based on Black & Litterman (1992) "Global Portfolio Optimization".
    
    Mathematical Formulation:
    μ_BL = [(τΣ)^(-1) + P^T Ω^(-1) P]^(-1) * [(τΣ)^(-1) μ + P^T Ω^(-1) Q]
    
    Args:
        prior_returns: Prior expected returns (market equilibrium)
        covariance_matrix: Asset covariance matrix
        views_matrix: Matrix of views (P matrix)
        view_returns: Expected returns for views (Q vector)
        view_uncertainty: Uncertainty in views (Ω matrix)
        tau: Scaling parameter (typically 0.01-0.05)
        risk_aversion: Risk aversion parameter
        
    Returns:
        OptimizationResult with optimal weights and statistics
        
    Raises:
        ValueError: If matrix dimensions are incompatible
        
    References:
        Black, F., & Litterman, R. (1992). Global Portfolio Optimization.
        Financial Analysts Journal, 48(5), 28-43.
    """
    # Implementation with detailed comments
    # Validation and error handling
    # Return structured result
```

## Documentation

### Documentation Types

1. **Code Documentation**
   - Docstrings for all functions/classes
   - Inline comments for complex logic
   - Type hints for all parameters

2. **API Documentation**
   - OpenAPI/Swagger specifications
   - Example requests/responses
   - Error code explanations

3. **User Documentation**
   - Getting started guides
   - Feature explanations
   - FAQ and troubleshooting

4. **Technical Documentation**
   - Architecture decisions
   - Deployment guides
   - Performance benchmarks

### Documentation Standards

**Docstring Format (Python):**
```python
def calculate_risk_metrics(returns: pd.Series, benchmark: pd.Series = None) -> Dict[str, float]:
    """
    Calculate comprehensive risk metrics for a return series.
    
    Computes various risk measures including volatility, VaR, CVaR, maximum
    drawdown, and Sharpe ratio. Optionally compares against benchmark.
    
    Args:
        returns: Time series of portfolio returns
        benchmark: Optional benchmark return series for comparison
        
    Returns:
        Dictionary containing risk metrics:
        - 'volatility': Annualized standard deviation
        - 'var_95': 95% Value at Risk
        - 'cvar_95': 95% Conditional Value at Risk
        - 'max_drawdown': Maximum peak-to-trough decline
        - 'sharpe_ratio': Risk-adjusted return measure
        - 'information_ratio': Active return per unit of tracking error (if benchmark provided)
        
    Raises:
        ValueError: If returns series is empty or contains NaN values
        
    Example:
        >>> returns = pd.Series([0.01, -0.02, 0.015, 0.003, -0.01])
        >>> metrics = calculate_risk_metrics(returns)
        >>> print(f"Volatility: {metrics['volatility']:.2%}")
        Volatility: 15.23%
        
    Note:
        All metrics are annualized assuming daily return data (252 trading days per year).
        VaR and CVaR use historical simulation method.
    """
```

## Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Discord**: Real-time chat (link in README)
- **Monthly Video Calls**: Community meetings (announced in Discord)

### Getting Help

1. **Check Documentation**: README, docs folder, and inline comments
2. **Search Issues**: Someone may have asked the same question
3. **Ask in Discussions**: For general questions
4. **Join Discord**: For real-time help

### Recognition

We recognize contributors in several ways:

- **Contributors File**: All contributors listed in CONTRIBUTORS.md
- **Release Notes**: Major contributions highlighted
- **Hall of Fame**: Outstanding contributors featured on website
- **Conference Opportunities**: Speaking opportunities at finance/tech conferences

### Maintainer Responsibilities

Current maintainers commit to:

- Respond to issues within 48 hours
- Review PRs within 1 week
- Maintain backwards compatibility
- Provide clear feedback on contributions
- Foster inclusive community environment

---

## Questions?

Don't hesitate to ask questions! We're here to help:

- **General Questions**: Use GitHub Discussions
- **Contribution Questions**: Comment on relevant issues
- **Private Matters**: Email maintainers@portfolio-dashboard.com

Thank you for contributing to the Portfolio Optimization Dashboard! 🎉

*This document is living and will be updated based on community feedback and project evolution.*