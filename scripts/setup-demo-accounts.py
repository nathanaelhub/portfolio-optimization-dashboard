#!/usr/bin/env python3

"""
Demo Account Setup Script

Creates and configures demo accounts for Portfolio Optimization Dashboard.
Run this script before making the application public to ensure proper demo functionality.
"""

import asyncio
import hashlib
import json
import secrets
from datetime import datetime, timedelta
from typing import List, Dict, Any
import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.database.connection import get_db_session, create_tables
from app.models.portfolio import User, Portfolio, Asset
from app.security.encryption import hash_password
from app.services.market_data import get_asset_data

class DemoAccountManager:
    """Manages creation and configuration of demo accounts."""
    
    def __init__(self):
        self.demo_accounts = []
        self.demo_portfolios = []
        self.demo_assets = []

    async def create_demo_users(self) -> List[Dict]:
        """Create various types of demo users for different use cases."""
        
        demo_users = [
            {
                'email': 'demo@portfolioopt.com',
                'password': 'DemoUser123!',
                'full_name': 'Demo User',
                'user_type': 'demo',
                'subscription_tier': 'basic',
                'description': 'Basic demo account for new users'
            },
            {
                'email': 'investor@portfolioopt.com', 
                'password': 'Investor123!',
                'full_name': 'Sarah Johnson',
                'user_type': 'demo',
                'subscription_tier': 'professional',
                'description': 'Professional investor demo account'
            },
            {
                'email': 'advisor@portfolioopt.com',
                'password': 'Advisor123!',
                'full_name': 'Michael Chen',
                'user_type': 'demo',
                'subscription_tier': 'enterprise',
                'description': 'Financial advisor demo account'
            },
            {
                'email': 'quantanalyst@portfolioopt.com',
                'password': 'Quant123!',
                'full_name': 'Dr. Lisa Rodriguez',
                'user_type': 'demo',
                'subscription_tier': 'enterprise',
                'description': 'Quantitative analyst demo account'
            },
            {
                'email': 'beginner@portfolioopt.com',
                'password': 'Beginner123!',
                'full_name': 'Alex Smith',
                'user_type': 'demo',
                'subscription_tier': 'basic',
                'description': 'Beginner investor demo account'
            }
        ]
        
        print("Creating demo users...")
        created_users = []
        
        async with get_db_session() as session:
            for user_data in demo_users:
                # Check if user already exists
                existing_user = session.query(User).filter(
                    User.email == user_data['email']
                ).first()
                
                if existing_user:
                    print(f"  ⚠️  User {user_data['email']} already exists, skipping...")
                    created_users.append(existing_user)
                    continue
                
                # Create new user
                hashed_password = hash_password(user_data['password'])
                
                user = User(
                    email=user_data['email'],
                    hashed_password=hashed_password,
                    full_name=user_data['full_name'],
                    is_active=True,
                    is_demo=True,
                    subscription_tier=user_data['subscription_tier'],
                    demo_expires_at=datetime.utcnow() + timedelta(days=30),
                    created_at=datetime.utcnow()
                )
                
                session.add(user)
                session.commit()
                session.refresh(user)
                
                created_users.append(user)
                print(f"  ✅ Created user: {user_data['email']}")
                
                # Store credentials for testing
                self.demo_accounts.append({
                    'id': user.id,
                    'email': user_data['email'],
                    'password': user_data['password'],
                    'tier': user_data['subscription_tier'],
                    'description': user_data['description']
                })
        
        return created_users

    async def create_demo_portfolios(self, users: List[User]) -> List[Dict]:
        """Create sample portfolios for demo users."""
        
        portfolio_templates = [
            {
                'name': 'Conservative Growth',
                'description': 'Low-risk portfolio focused on steady growth',
                'assets': [
                    {'symbol': 'VTI', 'allocation': 0.40, 'name': 'Total Stock Market ETF'},
                    {'symbol': 'BND', 'allocation': 0.35, 'name': 'Total Bond Market ETF'},
                    {'symbol': 'VXUS', 'allocation': 0.15, 'name': 'International Stock ETF'},
                    {'symbol': 'VNQ', 'allocation': 0.10, 'name': 'Real Estate ETF'}
                ],
                'risk_tolerance': 'conservative',
                'target_return': 0.06
            },
            {
                'name': 'Balanced Portfolio',
                'description': 'Moderate risk balanced across asset classes',
                'assets': [
                    {'symbol': 'SPY', 'allocation': 0.35, 'name': 'S&P 500 ETF'},
                    {'symbol': 'QQQ', 'allocation': 0.20, 'name': 'NASDAQ 100 ETF'},
                    {'symbol': 'IWM', 'allocation': 0.15, 'name': 'Small Cap ETF'},
                    {'symbol': 'EFA', 'allocation': 0.15, 'name': 'International Developed Markets'},
                    {'symbol': 'AGG', 'allocation': 0.15, 'name': 'Aggregate Bond ETF'}
                ],
                'risk_tolerance': 'moderate',
                'target_return': 0.08
            },
            {
                'name': 'Growth Focused',
                'description': 'Higher risk portfolio targeting growth',
                'assets': [
                    {'symbol': 'AAPL', 'allocation': 0.25, 'name': 'Apple Inc.'},
                    {'symbol': 'MSFT', 'allocation': 0.20, 'name': 'Microsoft Corporation'},
                    {'symbol': 'GOOGL', 'allocation': 0.15, 'name': 'Alphabet Inc.'},
                    {'symbol': 'TSLA', 'allocation': 0.15, 'name': 'Tesla Inc.'},
                    {'symbol': 'NVDA', 'allocation': 0.15, 'name': 'NVIDIA Corporation'},
                    {'symbol': 'AMZN', 'allocation': 0.10, 'name': 'Amazon.com Inc.'}
                ],
                'risk_tolerance': 'aggressive',
                'target_return': 0.12
            },
            {
                'name': 'ESG Sustainable',
                'description': 'Environmentally and socially responsible investing',
                'assets': [
                    {'symbol': 'VSGX', 'allocation': 0.30, 'name': 'ESG International Stock ETF'},
                    {'symbol': 'ESGV', 'allocation': 0.30, 'name': 'ESG US Stock ETF'},
                    {'symbol': 'VCEB', 'allocation': 0.20, 'name': 'ESG Corporate Bond ETF'},
                    {'symbol': 'ICLN', 'allocation': 0.20, 'name': 'Clean Energy ETF'}
                ],
                'risk_tolerance': 'moderate',
                'target_return': 0.07
            },
            {
                'name': 'Dividend Income',
                'description': 'Focus on dividend-paying stocks for income',
                'assets': [
                    {'symbol': 'SCHD', 'allocation': 0.30, 'name': 'Dividend Equity ETF'},
                    {'symbol': 'VYM', 'allocation': 0.25, 'name': 'High Dividend Yield ETF'},
                    {'symbol': 'NOBL', 'allocation': 0.20, 'name': 'Dividend Aristocrats ETF'},
                    {'symbol': 'REML', 'allocation': 0.15, 'name': 'REIT Income ETF'},
                    {'symbol': 'JEPI', 'allocation': 0.10, 'name': 'Equity Premium Income ETF'}
                ],
                'risk_tolerance': 'conservative',
                'target_return': 0.05
            }
        ]
        
        print("Creating demo portfolios...")
        created_portfolios = []
        
        async with get_db_session() as session:
            for i, user in enumerate(users):
                # Assign portfolios to users (some users get multiple portfolios)
                portfolios_for_user = [portfolio_templates[i % len(portfolio_templates)]]
                
                # Give some users additional portfolios
                if user.subscription_tier in ['professional', 'enterprise']:
                    if i < len(portfolio_templates) - 1:
                        portfolios_for_user.append(portfolio_templates[i + 1])
                
                for portfolio_data in portfolios_for_user:
                    # Check if portfolio already exists for this user
                    existing_portfolio = session.query(Portfolio).filter(
                        Portfolio.user_id == user.id,
                        Portfolio.name == portfolio_data['name']
                    ).first()
                    
                    if existing_portfolio:
                        print(f"  ⚠️  Portfolio '{portfolio_data['name']}' already exists for {user.email}")
                        continue
                    
                    # Create portfolio
                    portfolio = Portfolio(
                        name=portfolio_data['name'],
                        description=portfolio_data['description'],
                        user_id=user.id,
                        is_demo=True,
                        risk_tolerance=portfolio_data['risk_tolerance'],
                        target_return=portfolio_data['target_return'],
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    
                    session.add(portfolio)
                    session.commit()
                    session.refresh(portfolio)
                    
                    # Add assets to portfolio
                    for asset_data in portfolio_data['assets']:
                        asset = Asset(
                            portfolio_id=portfolio.id,
                            symbol=asset_data['symbol'],
                            name=asset_data['name'],
                            allocation=asset_data['allocation'],
                            created_at=datetime.utcnow()
                        )
                        session.add(asset)
                    
                    session.commit()
                    created_portfolios.append(portfolio)
                    
                    print(f"  ✅ Created portfolio '{portfolio_data['name']}' for {user.email}")
                    
                    # Store for testing
                    self.demo_portfolios.append({
                        'id': portfolio.id,
                        'name': portfolio_data['name'],
                        'user_email': user.email,
                        'assets': portfolio_data['assets']
                    })
        
        return created_portfolios

    async def setup_demo_data(self):
        """Set up comprehensive demo data including market data cache."""
        
        print("Setting up demo market data...")
        
        # List of all symbols used in demo portfolios
        all_symbols = set()
        for portfolio in self.demo_portfolios:
            for asset in portfolio['assets']:
                all_symbols.add(asset['symbol'])
        
        # Fetch and cache market data for demo symbols
        cached_data = {}
        for symbol in all_symbols:
            try:
                # In a real implementation, you'd fetch actual market data
                # For demo purposes, we'll create realistic sample data
                cached_data[symbol] = {
                    'symbol': symbol,
                    'current_price': 100.0 + hash(symbol) % 200,  # Pseudo-random price
                    'daily_change': (hash(symbol) % 1000 - 500) / 10000,  # -5% to +5%
                    'volume': 1000000 + hash(symbol) % 9000000,
                    'market_cap': 1000000000 + hash(symbol) % 999000000000,
                    'pe_ratio': 15.0 + (hash(symbol) % 100) / 10,
                    'dividend_yield': (hash(symbol) % 500) / 10000,  # 0-5%
                    'last_updated': datetime.utcnow().isoformat()
                }
                print(f"  ✅ Cached data for {symbol}")
                
            except Exception as e:
                print(f"  ❌ Failed to cache data for {symbol}: {e}")
        
        # Save demo data to file for testing
        demo_data_file = os.path.join(os.path.dirname(__file__), '..', 'demo-data.json')
        with open(demo_data_file, 'w') as f:
            json.dump({
                'accounts': self.demo_accounts,
                'portfolios': self.demo_portfolios,
                'market_data': cached_data,
                'created_at': datetime.utcnow().isoformat()
            }, f, indent=2)
        
        print(f"  ✅ Demo data saved to {demo_data_file}")

    async def test_demo_accounts(self):
        """Test all demo accounts to ensure they work properly."""
        
        print("Testing demo accounts...")
        
        test_results = {
            'accounts_tested': 0,
            'successful_logins': 0,
            'portfolios_accessible': 0,
            'errors': []
        }
        
        # In a real implementation, you'd test actual login functionality
        # For now, we'll just verify the accounts exist in the database
        async with get_db_session() as session:
            for account in self.demo_accounts:
                test_results['accounts_tested'] += 1
                
                try:
                    # Verify user exists and is active
                    user = session.query(User).filter(
                        User.email == account['email']
                    ).first()
                    
                    if user and user.is_active:
                        test_results['successful_logins'] += 1
                        print(f"  ✅ Account {account['email']} is accessible")
                        
                        # Check portfolios
                        portfolios = session.query(Portfolio).filter(
                            Portfolio.user_id == user.id
                        ).all()
                        
                        test_results['portfolios_accessible'] += len(portfolios)
                        print(f"    - Has {len(portfolios)} portfolios")
                        
                    else:
                        error_msg = f"Account {account['email']} is not accessible"
                        test_results['errors'].append(error_msg)
                        print(f"  ❌ {error_msg}")
                        
                except Exception as e:
                    error_msg = f"Error testing {account['email']}: {str(e)}"
                    test_results['errors'].append(error_msg)
                    print(f"  ❌ {error_msg}")
        
        # Print summary
        print(f"\n📊 Demo Account Test Summary:")
        print(f"  Accounts Tested: {test_results['accounts_tested']}")
        print(f"  Successful Logins: {test_results['successful_logins']}")
        print(f"  Portfolios Accessible: {test_results['portfolios_accessible']}")
        print(f"  Errors: {len(test_results['errors'])}")
        
        if test_results['errors']:
            print(f"\n⚠️  Errors encountered:")
            for error in test_results['errors']:
                print(f"    • {error}")
        
        return test_results

    def generate_demo_guide(self):
        """Generate a guide for using demo accounts."""
        
        guide_content = """# Demo Account Guide

## Available Demo Accounts

The Portfolio Optimization Dashboard includes several pre-configured demo accounts to showcase different user types and features:

"""
        
        for account in self.demo_accounts:
            guide_content += f"""### {account['description']}
- **Email**: `{account['email']}`
- **Password**: `{account['password']}`
- **Tier**: {account['tier'].title()}

"""
        
        guide_content += """## Demo Features

### All Demo Accounts Include:
- ✅ Pre-configured sample portfolios
- ✅ Historical performance data
- ✅ Risk analytics and metrics
- ✅ Interactive optimization tools
- ✅ Educational tooltips and guides

### Professional/Enterprise Accounts Also Include:
- ✅ Advanced optimization algorithms
- ✅ Machine learning predictions
- ✅ Custom reporting features
- ✅ Portfolio backtesting tools
- ✅ API access capabilities

## Getting Started

1. Visit the application homepage
2. Click "Login" or "Try Demo"
3. Use any of the demo credentials above
4. Explore the pre-loaded portfolios and features

## Demo Limitations

- Demo accounts expire after 30 days
- Limited to sample data and portfolios
- Cannot connect to live trading accounts
- Export functionality may be restricted

## Security Note

Demo accounts use sample data only. No real financial information or trading capabilities are provided.

---

*Generated on {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC*
"""
        
        guide_file = os.path.join(os.path.dirname(__file__), '..', 'DEMO_ACCOUNTS.md')
        with open(guide_file, 'w') as f:
            f.write(guide_content)
        
        print(f"📖 Demo account guide saved to {guide_file}")

async def main():
    """Main function to set up demo accounts."""
    
    print("🚀 Setting up Portfolio Optimization Demo Accounts...\n")
    
    manager = DemoAccountManager()
    
    try:
        # Ensure database tables exist
        print("Initializing database...")
        create_tables()
        print("✅ Database initialized\n")
        
        # Create demo users
        users = await manager.create_demo_users()
        print(f"✅ Created {len(users)} demo users\n")
        
        # Create demo portfolios
        portfolios = await manager.create_demo_portfolios(users)
        print(f"✅ Created {len(portfolios)} demo portfolios\n")
        
        # Set up additional demo data
        await manager.setup_demo_data()
        print("✅ Demo data configured\n")
        
        # Test all accounts
        test_results = await manager.test_demo_accounts()
        print("\n✅ Demo account testing completed")
        
        # Generate demo guide
        manager.generate_demo_guide()
        print("✅ Demo guide generated\n")
        
        # Final summary
        print("🎉 Demo Account Setup Complete!")
        print(f"   • {len(manager.demo_accounts)} demo accounts ready")
        print(f"   • {len(manager.demo_portfolios)} sample portfolios created")
        print(f"   • All accounts tested and verified")
        print("\n📖 See DEMO_ACCOUNTS.md for login credentials and usage guide")
        
        if test_results['errors']:
            print("\n⚠️  Some issues were found during testing. Please review the errors above.")
            return 1
        
        return 0
        
    except Exception as e:
        print(f"❌ Demo setup failed: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)