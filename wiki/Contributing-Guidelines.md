# Contributing Guidelines

**Welcome to the Portfolio Optimization Dashboard community! 🎉**

---

## 📋 Table of Contents

1. [Welcome](#welcome)
2. [Code of Conduct](#code-of-conduct)
3. [Getting Started](#getting-started)
4. [Development Workflow](#development-workflow)
5. [Coding Standards](#coding-standards)
6. [Testing Requirements](#testing-requirements)
7. [Documentation Standards](#documentation-standards)
8. [Pull Request Process](#pull-request-process)
9. [Issue Guidelines](#issue-guidelines)
10. [Recognition](#recognition)

---

## 🤝 Welcome

We're thrilled that you're interested in contributing to the Portfolio Optimization Dashboard! This project aims to democratize advanced portfolio optimization techniques and make quantitative finance more accessible to everyone.

### Ways to Contribute

- 🐛 **Bug Reports**: Help us identify and fix issues
- 💡 **Feature Requests**: Suggest new features or improvements  
- 📝 **Documentation**: Improve guides, tutorials, and API docs
- 🧪 **Testing**: Write tests and improve test coverage
- 💻 **Code**: Implement features, fix bugs, optimize performance
- 🎨 **Design**: Improve UI/UX and create visual assets
- 📊 **Financial Models**: Enhance optimization algorithms
- 🌍 **Localization**: Translate the interface to other languages

### What We're Looking For

- **Quantitative Finance Experts**: Portfolio theory, risk models, optimization
- **Full-Stack Developers**: React, FastAPI, PostgreSQL, Redis
- **DevOps Engineers**: Kubernetes, Docker, cloud infrastructure
- **UI/UX Designers**: Modern, accessible financial interfaces
- **Technical Writers**: Clear documentation and tutorials
- **Community Builders**: Help grow and support our community

---

## 📜 Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of:

- Age, body size, disability, ethnicity, gender identity and expression
- Level of experience, education, socio-economic status
- Nationality, personal appearance, race, religion
- Sexual identity and orientation

### Our Standards

**Positive behavior includes:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes:**
- Harassment, trolling, or discriminatory comments
- Personal attacks or political arguments
- Publishing private information without permission
- Any conduct inappropriate in a professional setting

### Enforcement

Report unacceptable behavior to: conduct@portfolio-dashboard.com

All complaints will be reviewed promptly and fairly. Project maintainers who don't follow the Code of Conduct may face temporary or permanent repercussions.

---

## 🚀 Getting Started

### Prerequisites

**Required Knowledge:**
- Basic understanding of finance/portfolio theory (helpful)
- Experience with React and/or Python (depending on contribution area)
- Familiarity with Git and GitHub workflows
- Understanding of modern development practices

**Development Environment:**
- **Node.js**: 18.0+ for frontend development
- **Python**: 3.11+ for backend development  
- **Docker**: For local development and testing
- **Git**: Version control

### Initial Setup

1. **Fork the Repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/Portfolio-Optimization-Dashboard.git
   cd Portfolio-Optimization-Dashboard
   ```

2. **Set Up Development Environment**
   ```bash
   # Copy environment templates
   cp backend/.env.example backend/.env.dev
   cp frontend/.env.example frontend/.env.dev
   
   # Start development services
   docker-compose up -d postgres redis
   
   # Install dependencies
   cd backend && pip install -r requirements-dev.txt
   cd ../frontend && npm install
   ```

3. **Verify Setup**
   ```bash
   # Run tests to ensure everything works
   cd backend && pytest
   cd ../frontend && npm test
   
   # Start development servers
   make dev  # or individually: make dev-backend, make dev-frontend
   ```

4. **Create Development Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

### First Contribution Ideas

**Good First Issues:**
- Fix typos in documentation
- Add missing type hints to Python functions
- Improve error messages
- Add unit tests for utility functions
- Update dependencies
- Improve accessibility (a11y)

Look for issues labeled `good first issue` and `help wanted`.

---

## 🔄 Development Workflow

### Branch Strategy

We use **GitHub Flow** with the following branch types:

```
main
├── feature/add-risk-parity-optimization
├── bugfix/fix-correlation-calculation  
├── docs/update-api-documentation
├── chore/update-dependencies
└── hotfix/fix-production-issue
```

**Branch Naming:**
- `feature/short-description` - New features
- `bugfix/short-description` - Bug fixes
- `docs/short-description` - Documentation updates
- `chore/short-description` - Maintenance tasks
- `hotfix/short-description` - Critical production fixes

### Development Process

1. **Start with an Issue**
   - Create or find an existing issue
   - Discuss approach with maintainers
   - Get assignment to avoid duplicate work

2. **Create Feature Branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

3. **Develop and Test**
   ```bash
   # Make your changes
   # Add tests for new functionality
   # Ensure all tests pass
   make test
   
   # Check code style
   make lint
   make format
   ```

4. **Commit Changes**
   ```bash
   # Use conventional commits
   git add .
   git commit -m "feat: add risk parity optimization algorithm"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create pull request on GitHub
   ```

### Conventional Commits

We use [Conventional Commits](https://conventionalcommits.org/) for clear commit history:

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
- `test`: Adding or modifying tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Examples:**
```bash
feat(optimization): add Black-Litterman model implementation
fix(api): handle edge case in portfolio validation
docs(readme): update installation instructions
test(backend): add unit tests for risk calculations
```

---

## 📐 Coding Standards

### Python (Backend)

**Style Guide:**
- Follow [PEP 8](https://pep8.org/) with Black formatting
- Use type hints for all function signatures
- Docstrings following [Google style](https://google.github.io/styleguide/pyguide.html#38-comments-and-docstrings)
- Maximum line length: 88 characters (Black default)

**Example:**
```python
from typing import List, Dict, Optional
import numpy as np
from pydantic import BaseModel

class PortfolioOptimizer:
    """Portfolio optimization using modern portfolio theory.
    
    This class implements various portfolio optimization algorithms
    including Markowitz mean-variance optimization and risk parity.
    """
    
    def __init__(self, risk_free_rate: float = 0.02) -> None:
        """Initialize the optimizer.
        
        Args:
            risk_free_rate: Risk-free rate for Sharpe ratio calculation.
        """
        self.risk_free_rate = risk_free_rate
    
    def optimize_portfolio(
        self,
        expected_returns: np.ndarray,
        covariance_matrix: np.ndarray,
        target_return: Optional[float] = None,
    ) -> Dict[str, float]:
        """Optimize portfolio weights using mean-variance optimization.
        
        Args:
            expected_returns: Expected returns for each asset.
            covariance_matrix: Covariance matrix of asset returns.
            target_return: Target portfolio return. If None, maximizes Sharpe ratio.
            
        Returns:
            Dictionary mapping asset symbols to optimal weights.
            
        Raises:
            ValueError: If inputs have incompatible dimensions.
        """
        # Implementation here
        pass
```

**Code Organization:**
```
backend/
├── app/
│   ├── api/               # API endpoints
│   ├── core/             # Core functionality
│   ├── models/           # Database models
│   ├── schemas/          # Pydantic schemas
│   ├── services/         # Business logic
│   └── utils/            # Utility functions
├── tests/                # Test files
└── alembic/             # Database migrations
```

### TypeScript/React (Frontend)

**Style Guide:**
- Use ESLint and Prettier configuration provided
- Prefer functional components with hooks
- Use TypeScript strict mode
- Follow React best practices

**Example:**
```typescript
import React, { useState, useCallback } from 'react';
import { Portfolio, OptimizationResult } from '../types/portfolio';

interface PortfolioOptimizerProps {
  portfolio: Portfolio;
  onOptimizationComplete: (result: OptimizationResult) => void;
}

export const PortfolioOptimizer: React.FC<PortfolioOptimizerProps> = ({
  portfolio,
  onOptimizationComplete,
}) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOptimize = useCallback(async () => {
    setIsOptimizing(true);
    setError(null);
    
    try {
      const result = await optimizePortfolio(portfolio.id, {
        method: 'markowitz',
        objective: 'max_sharpe',
      });
      
      onOptimizationComplete(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Optimization failed');
    } finally {
      setIsOptimizing(false);
    }
  }, [portfolio.id, onOptimizationComplete]);

  return (
    <div className="portfolio-optimizer">
      <button
        onClick={handleOptimize}
        disabled={isOptimizing}
        className="btn btn-primary"
      >
        {isOptimizing ? 'Optimizing...' : 'Optimize Portfolio'}
      </button>
      
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};
```

### Code Quality Tools

**Backend:**
```bash
# Install development dependencies
pip install -r requirements-dev.txt

# Format code
black .
isort .

# Lint code
flake8 .
mypy .

# Run security checks
bandit -r app/
```

**Frontend:**
```bash
# Install dependencies
npm install

# Format and lint
npm run format
npm run lint

# Type checking
npm run type-check
```

---

## 🧪 Testing Requirements

### Test Coverage Requirements

- **Minimum Coverage**: 80% overall, 90% for critical paths
- **New Features**: Must include comprehensive tests
- **Bug Fixes**: Must include regression tests
- **Critical Functions**: 100% coverage required

### Backend Testing

**Test Structure:**
```
tests/
├── unit/              # Unit tests
├── integration/       # Integration tests
├── end_to_end/        # E2E tests
├── fixtures/          # Test data
└── conftest.py        # Pytest configuration
```

**Example Unit Test:**
```python
import pytest
import numpy as np
from app.services.optimization import PortfolioOptimizer

class TestPortfolioOptimizer:
    
    @pytest.fixture
    def optimizer(self):
        return PortfolioOptimizer(risk_free_rate=0.02)
    
    @pytest.fixture
    def sample_data(self):
        return {
            'returns': np.array([0.10, 0.12, 0.08]),
            'covariance': np.array([
                [0.04, 0.01, 0.02],
                [0.01, 0.05, 0.01],
                [0.02, 0.01, 0.03]
            ])
        }
    
    def test_optimize_portfolio_max_sharpe(self, optimizer, sample_data):
        """Test maximum Sharpe ratio optimization."""
        result = optimizer.optimize_portfolio(
            expected_returns=sample_data['returns'],
            covariance_matrix=sample_data['covariance']
        )
        
        # Check that weights sum to 1
        assert abs(sum(result.values()) - 1.0) < 1e-6
        
        # Check that all weights are non-negative
        assert all(weight >= 0 for weight in result.values())
        
        # Check that the result is reasonable
        assert len(result) == len(sample_data['returns'])
```

**Running Tests:**
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/unit/test_optimization.py

# Run tests matching pattern
pytest -k "test_optimize"
```

### Frontend Testing

**Test Types:**
- **Unit Tests**: Individual components and functions
- **Integration Tests**: Component interactions
- **E2E Tests**: Complete user workflows

**Example Component Test:**
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PortfolioOptimizer } from '../PortfolioOptimizer';
import { optimizePortfolio } from '../../services/api';

// Mock the API
jest.mock('../../services/api');
const mockOptimizePortfolio = optimizePortfolio as jest.MockedFunction<typeof optimizePortfolio>;

describe('PortfolioOptimizer', () => {
  const mockPortfolio = {
    id: 'portfolio-123',
    name: 'Test Portfolio',
    holdings: []
  };

  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should trigger optimization when button is clicked', async () => {
    const mockResult = {
      optimalWeights: { AAPL: 0.5, GOOGL: 0.5 },
      expectedReturn: 0.1,
      expectedVolatility: 0.15
    };

    mockOptimizePortfolio.mockResolvedValue(mockResult);

    render(
      <PortfolioOptimizer 
        portfolio={mockPortfolio} 
        onOptimizationComplete={mockOnComplete}
      />
    );

    const optimizeButton = screen.getByText('Optimize Portfolio');
    fireEvent.click(optimizeButton);

    await waitFor(() => {
      expect(mockOptimizePortfolio).toHaveBeenCalledWith(
        'portfolio-123',
        expect.objectContaining({
          method: 'markowitz',
          objective: 'max_sharpe'
        })
      );
    });

    expect(mockOnComplete).toHaveBeenCalledWith(mockResult);
  });
});
```

---

## 📚 Documentation Standards

### Code Documentation

**Python Docstrings:**
```python
def calculate_sharpe_ratio(
    returns: np.ndarray, 
    risk_free_rate: float = 0.02
) -> float:
    """Calculate the Sharpe ratio for a series of returns.
    
    The Sharpe ratio measures risk-adjusted return by dividing excess return
    by the standard deviation of returns.
    
    Args:
        returns: Array of periodic returns.
        risk_free_rate: Risk-free rate for calculating excess returns.
        
    Returns:
        The Sharpe ratio as a float.
        
    Raises:
        ValueError: If returns array is empty or contains only NaN values.
        
    Example:
        >>> returns = np.array([0.01, 0.02, -0.01, 0.03])
        >>> sharpe = calculate_sharpe_ratio(returns, 0.02)
        >>> print(f"Sharpe ratio: {sharpe:.3f}")
        Sharpe ratio: 1.234
    """
    # Implementation
```

**TypeScript Documentation:**
```typescript
/**
 * Calculates portfolio risk metrics including VaR and CVaR.
 * 
 * @param returns - Array of portfolio returns
 * @param confidenceLevel - Confidence level for VaR calculation (0.95 or 0.99)
 * @returns Object containing risk metrics
 * 
 * @example
 * ```typescript
 * const returns = [0.01, 0.02, -0.01, 0.03];
 * const metrics = calculateRiskMetrics(returns, 0.95);
 * console.log(`VaR 95%: ${metrics.var95}`);
 * ```
 */
export function calculateRiskMetrics(
  returns: number[],
  confidenceLevel: number = 0.95
): RiskMetrics {
  // Implementation
}
```

### Wiki Documentation

When updating the wiki, ensure:

1. **Clear Structure**: Use consistent heading hierarchy
2. **Examples**: Include practical code examples
3. **Cross-References**: Link to related pages
4. **Up-to-Date**: Keep content current with codebase
5. **Searchable**: Use descriptive titles and keywords

### API Documentation

All API endpoints must have:
- Complete OpenAPI/Swagger documentation
- Request/response examples
- Error code descriptions
- Authentication requirements
- Rate limiting information

---

## 🔄 Pull Request Process

### Before Submitting

**Checklist:**
- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] New tests added for new functionality
- [ ] Documentation updated
- [ ] Commit messages follow conventional format
- [ ] No sensitive information in code
- [ ] Performance impact considered

### PR Template

Our PR template includes:

```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)  
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests pass
- [ ] Documentation updated
```

### Review Process

1. **Automated Checks**: CI/CD pipeline runs automatically
2. **Code Review**: At least one maintainer review required
3. **Testing**: Reviewer tests functionality
4. **Approval**: PR approved and merged

### Review Criteria

**Code Quality:**
- Readable and maintainable
- Follows established patterns
- Adequate error handling
- Performance considerations

**Testing:**
- Comprehensive test coverage
- Edge cases handled
- No flaky tests

**Documentation:**
- Clear docstrings/comments
- Wiki updated if needed
- API docs updated

---

## 🐛 Issue Guidelines

### Bug Reports

Use the bug report template:

```markdown
**Bug Description**
Clear description of the bug.

**Steps to Reproduce**
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment**
- OS: [e.g. iOS]
- Browser: [e.g. chrome, safari]
- Version: [e.g. 22]

**Additional Context**
Any other context about the problem.
```

### Feature Requests

Use the feature request template:

```markdown
**Feature Description**
Clear description of the feature.

**Problem Statement**
What problem does this solve?

**Proposed Solution**
How would you like to see this implemented?

**Alternatives Considered**
Alternative solutions you've considered.

**Additional Context**
Any other context or screenshots.
```

### Financial Algorithm Requests

For quantitative finance features:

```markdown
**Algorithm Description**
Name and description of the financial algorithm.

**Mathematical Foundation**
- Academic papers/references
- Mathematical formulation
- Assumptions and limitations

**Use Case**
- Target users
- Expected benefits
- Integration with existing features

**Implementation Notes**
- Computational complexity
- Data requirements
- Performance considerations
```

---

## 🏆 Recognition

### Contributors

All contributors are recognized in:
- README.md contributors section
- GitHub contributors graph
- Release notes (for significant contributions)
- Annual contributor report

### Contribution Types

We recognize various contribution types:

- 💻 **Code**: Backend, frontend, algorithms
- 📊 **Financial**: Models, algorithms, validation
- 🎨 **Design**: UI/UX, graphics, branding
- 📝 **Documentation**: Guides, tutorials, API docs
- 🧪 **Testing**: Test cases, quality assurance
- 🐛 **Bug Reports**: Issue identification and reproduction
- 💡 **Ideas**: Feature requests and suggestions
- 🌍 **Localization**: Translation and internationalization
- 💬 **Community**: Support, discussions, mentoring

### Special Recognition

**Outstanding contributions** receive:
- Highlighted mention in release notes
- Special contributor badge
- Invitation to maintainer discussions
- Conference/meetup speaking opportunities

---

## 🤔 Questions?

### Getting Help

- **GitHub Discussions**: General questions and discussions
- **Discord**: Real-time chat with community
- **Email**: contribute@portfolio-dashboard.com
- **Office Hours**: Monthly contributor office hours

### Mentorship Program

New contributors can request mentorship:
- Pair programming sessions
- Code review guidance
- Financial domain knowledge sharing
- Career advice and networking

---

## 📞 Contact

- **Maintainers**: @maintainer1, @maintainer2
- **Email**: contribute@portfolio-dashboard.com
- **Discord**: [Join our community](https://discord.gg/portfolio-dashboard)
- **Twitter**: @PortfolioDash

---

<div align="center">

**🎉 Thank you for contributing to Portfolio Optimization Dashboard! 🎉**

*Every contribution, no matter how small, makes a difference in democratizing quantitative finance.*

[![Contributors](https://img.shields.io/github/contributors/yourusername/Portfolio-Optimization-Dashboard?style=flat-square)](https://github.com/yourusername/Portfolio-Optimization-Dashboard/graphs/contributors)
[![Good First Issues](https://img.shields.io/github/issues/yourusername/Portfolio-Optimization-Dashboard/good%20first%20issue?style=flat-square)](https://github.com/yourusername/Portfolio-Optimization-Dashboard/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)

[🏠 Back to Wiki Home](Home) • [🚀 Development Setup](Development-Setup) • [📝 Code Style Guide](Code-Style-Guide)

</div>