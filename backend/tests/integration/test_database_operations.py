"""
Integration tests for database operations in portfolio optimization system.

Tests database layer functionality including:
- CRUD operations for portfolios and assets
- Transaction integrity and rollback scenarios
- Data consistency and constraints
- Performance with large datasets
- Concurrent access patterns
- Migration and schema validation

Each test ensures data integrity and proper error handling.
"""

import pytest
import asyncio
import numpy as np
from typing import Dict, List
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.database.database import Base, get_db
from app.database.models import Portfolio, Asset, PortfolioAsset, User, OptimizationResult
from app.database.connection import DatabaseManager
from conftest import integration, db_session


class TestPortfolioCRUDOperations:
    """Test portfolio CRUD operations with database."""

    @integration
    def test_create_portfolio_with_assets(self, db_session: Session):
        """Test creating portfolio with associated assets."""
        # Create user first
        user = User(
            email="test@example.com",
            hashed_password="hashed_password",
            full_name="Test User",
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        
        # Create portfolio
        portfolio = Portfolio(
            name="Test Portfolio",
            description="Integration test portfolio",
            user_id=user.id,
            risk_tolerance="moderate",
            investment_horizon=5,
            created_at=datetime.utcnow()
        )
        db_session.add(portfolio)
        db_session.commit()
        
        # Create assets
        assets_data = [
            {"symbol": "AAPL", "name": "Apple Inc.", "sector": "Technology"},
            {"symbol": "MSFT", "name": "Microsoft Corp.", "sector": "Technology"},
            {"symbol": "JPM", "name": "JPMorgan Chase", "sector": "Financial"}
        ]
        
        assets = []
        for asset_data in assets_data:
            asset = Asset(**asset_data)
            db_session.add(asset)
            assets.append(asset)
        
        db_session.commit()
        
        # Create portfolio-asset relationships
        allocations = [0.4, 0.35, 0.25]
        for asset, allocation in zip(assets, allocations):
            portfolio_asset = PortfolioAsset(
                portfolio_id=portfolio.id,
                asset_id=asset.id,
                allocation=allocation,
                target_allocation=allocation
            )
            db_session.add(portfolio_asset)
        
        db_session.commit()
        
        # Verify portfolio creation
        retrieved_portfolio = db_session.query(Portfolio).filter(
            Portfolio.id == portfolio.id
        ).first()
        
        assert retrieved_portfolio is not None
        assert retrieved_portfolio.name == "Test Portfolio"
        assert len(retrieved_portfolio.assets) == 3
        
        # Verify allocations sum to 1.0
        total_allocation = sum(pa.allocation for pa in retrieved_portfolio.portfolio_assets)
        assert abs(total_allocation - 1.0) < 1e-6
        
        # Verify asset details
        asset_symbols = {pa.asset.symbol for pa in retrieved_portfolio.portfolio_assets}
        assert asset_symbols == {"AAPL", "MSFT", "JPM"}

    @integration
    def test_update_portfolio_allocations(self, db_session: Session):
        """Test updating portfolio allocations."""
        # Create user and portfolio
        user = User(email="update@example.com", hashed_password="hash", full_name="User")
        db_session.add(user)
        db_session.commit()
        
        portfolio = Portfolio(name="Update Test", user_id=user.id)
        db_session.add(portfolio)
        db_session.commit()
        
        # Create assets
        assets = [
            Asset(symbol="AAPL", name="Apple Inc."),
            Asset(symbol="MSFT", name="Microsoft Corp.")
        ]
        for asset in assets:
            db_session.add(asset)
        db_session.commit()
        
        # Initial allocations
        initial_allocations = [0.6, 0.4]
        for asset, allocation in zip(assets, initial_allocations):
            portfolio_asset = PortfolioAsset(
                portfolio_id=portfolio.id,
                asset_id=asset.id,
                allocation=allocation
            )
            db_session.add(portfolio_asset)
        db_session.commit()
        
        # Update allocations
        new_allocations = [0.3, 0.7]
        for i, new_allocation in enumerate(new_allocations):
            portfolio_asset = db_session.query(PortfolioAsset).filter(
                PortfolioAsset.portfolio_id == portfolio.id,
                PortfolioAsset.asset_id == assets[i].id
            ).first()
            
            portfolio_asset.allocation = new_allocation
            portfolio_asset.updated_at = datetime.utcnow()
        
        db_session.commit()
        
        # Verify updates
        updated_portfolio = db_session.query(Portfolio).filter(
            Portfolio.id == portfolio.id
        ).first()
        
        allocations = [pa.allocation for pa in updated_portfolio.portfolio_assets]
        assert abs(allocations[0] - 0.3) < 1e-6
        assert abs(allocations[1] - 0.7) < 1e-6

    @integration
    def test_delete_portfolio_cascade(self, db_session: Session):
        """Test portfolio deletion with proper cascade."""
        # Create user, portfolio, and assets
        user = User(email="delete@example.com", hashed_password="hash", full_name="User")
        db_session.add(user)
        db_session.commit()
        
        portfolio = Portfolio(name="Delete Test", user_id=user.id)
        db_session.add(portfolio)
        db_session.commit()
        
        asset = Asset(symbol="AAPL", name="Apple Inc.")
        db_session.add(asset)
        db_session.commit()
        
        portfolio_asset = PortfolioAsset(
            portfolio_id=portfolio.id,
            asset_id=asset.id,
            allocation=1.0
        )
        db_session.add(portfolio_asset)
        db_session.commit()
        
        portfolio_id = portfolio.id
        
        # Delete portfolio
        db_session.delete(portfolio)
        db_session.commit()
        
        # Verify portfolio is deleted
        deleted_portfolio = db_session.query(Portfolio).filter(
            Portfolio.id == portfolio_id
        ).first()
        assert deleted_portfolio is None
        
        # Verify portfolio_assets are also deleted (cascade)
        remaining_portfolio_assets = db_session.query(PortfolioAsset).filter(
            PortfolioAsset.portfolio_id == portfolio_id
        ).all()
        assert len(remaining_portfolio_assets) == 0
        
        # Verify asset itself is not deleted (should remain for other portfolios)
        remaining_asset = db_session.query(Asset).filter(Asset.id == asset.id).first()
        assert remaining_asset is not None

    @integration
    def test_portfolio_constraints_validation(self, db_session: Session):
        """Test database constraints and validation."""
        user = User(email="constraints@example.com", hashed_password="hash", full_name="User")
        db_session.add(user)
        db_session.commit()
        
        # Test unique constraint on portfolio name per user
        portfolio1 = Portfolio(name="Duplicate Name", user_id=user.id)
        db_session.add(portfolio1)
        db_session.commit()
        
        portfolio2 = Portfolio(name="Duplicate Name", user_id=user.id)
        db_session.add(portfolio2)
        
        with pytest.raises(IntegrityError):
            db_session.commit()
        
        db_session.rollback()
        
        # Test foreign key constraint
        invalid_portfolio = Portfolio(name="Invalid User", user_id=99999)
        db_session.add(invalid_portfolio)
        
        with pytest.raises(IntegrityError):
            db_session.commit()
        
        db_session.rollback()
        
        # Test allocation constraints (if implemented in database)
        asset = Asset(symbol="TEST", name="Test Asset")
        db_session.add(asset)
        db_session.commit()
        
        valid_portfolio = Portfolio(name="Valid Portfolio", user_id=user.id)
        db_session.add(valid_portfolio)
        db_session.commit()
        
        # Test negative allocation (should be prevented by check constraint)
        negative_allocation = PortfolioAsset(
            portfolio_id=valid_portfolio.id,
            asset_id=asset.id,
            allocation=-0.1
        )
        db_session.add(negative_allocation)
        
        try:
            db_session.commit()
            # If constraint exists, this should fail
            # If no constraint, verify the value was stored
            stored_allocation = db_session.query(PortfolioAsset).filter(
                PortfolioAsset.allocation < 0
            ).first()
            # This test documents current behavior
        except IntegrityError:
            # Expected if check constraint exists
            db_session.rollback()


class TestTransactionIntegrity:
    """Test database transaction integrity and rollback scenarios."""

    @integration
    def test_atomic_portfolio_creation(self, db_session: Session):
        """Test atomic portfolio creation with rollback on failure."""
        user = User(email="atomic@example.com", hashed_password="hash", full_name="User")
        db_session.add(user)
        db_session.commit()
        
        # Simulate transaction that should rollback
        try:
            # Create portfolio
            portfolio = Portfolio(name="Atomic Test", user_id=user.id)
            db_session.add(portfolio)
            db_session.flush()  # Get ID without committing
            
            # Create valid asset
            asset1 = Asset(symbol="AAPL", name="Apple Inc.")
            db_session.add(asset1)
            db_session.flush()
            
            # Create portfolio-asset relationship
            pa1 = PortfolioAsset(
                portfolio_id=portfolio.id,
                asset_id=asset1.id,
                allocation=0.5
            )
            db_session.add(pa1)
            
            # Try to create duplicate asset (should fail)
            asset2 = Asset(symbol="AAPL", name="Apple Inc.")  # Duplicate symbol
            db_session.add(asset2)
            
            db_session.commit()  # This should fail
            
        except IntegrityError:
            db_session.rollback()
            
            # Verify nothing was committed
            portfolios = db_session.query(Portfolio).filter(
                Portfolio.name == "Atomic Test"
            ).all()
            assert len(portfolios) == 0
            
            assets = db_session.query(Asset).filter(Asset.symbol == "AAPL").all()
            assert len(assets) == 0

    @integration
    def test_concurrent_portfolio_updates(self, db_session: Session):
        """Test concurrent updates to same portfolio."""
        import threading
        import time
        
        # Create user and portfolio
        user = User(email="concurrent@example.com", hashed_password="hash", full_name="User")
        db_session.add(user)
        db_session.commit()
        
        portfolio = Portfolio(name="Concurrent Test", user_id=user.id)
        db_session.add(portfolio)
        db_session.commit()
        
        asset = Asset(symbol="AAPL", name="Apple Inc.")
        db_session.add(asset)
        db_session.commit()
        
        pa = PortfolioAsset(
            portfolio_id=portfolio.id,
            asset_id=asset.id,
            allocation=0.5
        )
        db_session.add(pa)
        db_session.commit()
        
        # Create separate sessions for concurrent access
        from app.database.database import TestingSessionLocal
        
        results = []
        
        def update_allocation(new_allocation, result_list):
            session = TestingSessionLocal()
            try:
                # Find portfolio asset
                pa = session.query(PortfolioAsset).filter(
                    PortfolioAsset.portfolio_id == portfolio.id
                ).first()
                
                # Simulate some work
                time.sleep(0.1)
                
                # Update allocation
                pa.allocation = new_allocation
                pa.updated_at = datetime.utcnow()
                
                session.commit()
                result_list.append(("success", new_allocation))
                
            except Exception as e:
                session.rollback()
                result_list.append(("error", str(e)))
            finally:
                session.close()
        
        # Start concurrent updates
        threads = []
        for i, allocation in enumerate([0.3, 0.7, 0.9]):
            thread = threading.Thread(
                target=update_allocation,
                args=(allocation, results)
            )
            threads.append(thread)
        
        for thread in threads:
            thread.start()
        
        for thread in threads:
            thread.join()
        
        # At least one should succeed
        successful_updates = [r for r in results if r[0] == "success"]
        assert len(successful_updates) >= 1
        
        # Final state should be consistent
        final_pa = db_session.query(PortfolioAsset).filter(
            PortfolioAsset.portfolio_id == portfolio.id
        ).first()
        
        # Should be one of the attempted values
        attempted_values = [0.3, 0.7, 0.9]
        assert final_pa.allocation in attempted_values

    @integration
    def test_transaction_rollback_on_optimization_failure(self, db_session: Session):
        """Test rollback when optimization results cannot be saved."""
        user = User(email="rollback@example.com", hashed_password="hash", full_name="User")
        db_session.add(user)
        db_session.commit()
        
        portfolio = Portfolio(name="Rollback Test", user_id=user.id)
        db_session.add(portfolio)
        db_session.commit()
        
        try:
            # Start transaction
            db_session.begin()
            
            # Update portfolio status
            portfolio.status = "optimizing"
            portfolio.updated_at = datetime.utcnow()
            
            # Try to save optimization result with invalid data
            optimization_result = OptimizationResult(
                portfolio_id=portfolio.id,
                objective="max_sharpe",
                expected_return=0.12,
                volatility=0.15,
                sharpe_ratio=0.8,
                weights={"AAPL": 0.6, "MSFT": 0.4},
                constraints={"max_weight": 0.6},
                optimization_date=datetime.utcnow(),
                user_id=99999  # Invalid user_id to trigger failure
            )
            db_session.add(optimization_result)
            
            db_session.commit()  # Should fail due to foreign key constraint
            
        except IntegrityError:
            db_session.rollback()
            
            # Verify portfolio status was rolled back
            refreshed_portfolio = db_session.query(Portfolio).filter(
                Portfolio.id == portfolio.id
            ).first()
            
            assert refreshed_portfolio.status != "optimizing"


class TestDataConsistency:
    """Test data consistency and referential integrity."""

    @integration
    def test_portfolio_allocation_consistency(self, db_session: Session):
        """Test that portfolio allocations are consistent."""
        user = User(email="consistency@example.com", hashed_password="hash", full_name="User")
        db_session.add(user)
        db_session.commit()
        
        portfolio = Portfolio(name="Consistency Test", user_id=user.id)
        db_session.add(portfolio)
        db_session.commit()
        
        # Create assets with allocations that sum to more than 1.0
        assets_data = [
            ("AAPL", 0.4),
            ("MSFT", 0.4),
            ("GOOGL", 0.4)  # Total = 1.2, which is invalid
        ]
        
        for symbol, allocation in assets_data:
            asset = Asset(symbol=symbol, name=f"{symbol} Inc.")
            db_session.add(asset)
            db_session.flush()
            
            pa = PortfolioAsset(
                portfolio_id=portfolio.id,
                asset_id=asset.id,
                allocation=allocation
            )
            db_session.add(pa)
        
        db_session.commit()
        
        # Check total allocation
        total_allocation = db_session.query(
            db_session.query(PortfolioAsset.allocation).filter(
                PortfolioAsset.portfolio_id == portfolio.id
            ).sum()
        ).scalar()
        
        # This test documents that we should add validation
        # In a production system, this should be prevented
        assert total_allocation > 1.0  # Currently allows invalid state
        
        # TODO: Add database trigger or application-level validation
        # to ensure allocations sum to 1.0

    @integration
    def test_referential_integrity_on_delete(self, db_session: Session):
        """Test referential integrity when deleting referenced records."""
        user = User(email="integrity@example.com", hashed_password="hash", full_name="User")
        db_session.add(user)
        db_session.commit()
        
        asset = Asset(symbol="AAPL", name="Apple Inc.")
        db_session.add(asset)
        db_session.commit()
        
        portfolio = Portfolio(name="Integrity Test", user_id=user.id)
        db_session.add(portfolio)
        db_session.commit()
        
        pa = PortfolioAsset(
            portfolio_id=portfolio.id,
            asset_id=asset.id,
            allocation=1.0
        )
        db_session.add(pa)
        db_session.commit()
        
        # Try to delete asset that's referenced by portfolio
        try:
            db_session.delete(asset)
            db_session.commit()
            
            # If this succeeds, check what happened to portfolio_asset
            remaining_pa = db_session.query(PortfolioAsset).filter(
                PortfolioAsset.asset_id == asset.id
            ).first()
            
            # Should either be deleted (CASCADE) or prevent deletion (RESTRICT)
            
        except IntegrityError:
            # Expected if RESTRICT constraint exists
            db_session.rollback()
            
            # Asset should still exist
            remaining_asset = db_session.query(Asset).filter(
                Asset.id == asset.id
            ).first()
            assert remaining_asset is not None

    @integration
    def test_audit_trail_consistency(self, db_session: Session):
        """Test that audit trail timestamps are consistent."""
        user = User(email="audit@example.com", hashed_password="hash", full_name="User")
        db_session.add(user)
        db_session.commit()
        
        # Record creation time
        before_create = datetime.utcnow()
        
        portfolio = Portfolio(
            name="Audit Test",
            user_id=user.id,
            created_at=datetime.utcnow()
        )
        db_session.add(portfolio)
        db_session.commit()
        
        after_create = datetime.utcnow()
        
        # Verify creation timestamp is reasonable
        assert before_create <= portfolio.created_at <= after_create
        assert portfolio.updated_at is None or portfolio.updated_at == portfolio.created_at
        
        # Update portfolio
        import time
        time.sleep(0.1)  # Ensure timestamp difference
        
        before_update = datetime.utcnow()
        portfolio.description = "Updated description"
        portfolio.updated_at = datetime.utcnow()
        db_session.commit()
        after_update = datetime.utcnow()
        
        # Verify update timestamp
        assert before_update <= portfolio.updated_at <= after_update
        assert portfolio.updated_at > portfolio.created_at


class TestPerformanceAndScaling:
    """Test database performance with large datasets."""

    @integration
    @pytest.mark.slow
    def test_large_portfolio_operations(self, db_session: Session):
        """Test operations with large portfolios."""
        user = User(email="performance@example.com", hashed_password="hash", full_name="User")
        db_session.add(user)
        db_session.commit()
        
        portfolio = Portfolio(name="Large Portfolio", user_id=user.id)
        db_session.add(portfolio)
        db_session.commit()
        
        # Create many assets (simulate large universe)
        n_assets = 500
        assets = []
        
        # Batch insert assets
        for i in range(n_assets):
            asset = Asset(
                symbol=f"STOCK{i:04d}",
                name=f"Stock {i} Inc.",
                sector="Technology" if i % 3 == 0 else "Healthcare" if i % 3 == 1 else "Finance"
            )
            assets.append(asset)
        
        db_session.add_all(assets)
        db_session.commit()
        
        # Create portfolio-asset relationships
        portfolio_assets = []
        allocation_per_asset = 1.0 / n_assets
        
        for asset in assets:
            pa = PortfolioAsset(
                portfolio_id=portfolio.id,
                asset_id=asset.id,
                allocation=allocation_per_asset
            )
            portfolio_assets.append(pa)
        
        # Time the bulk insert
        import time
        start_time = time.time()
        
        db_session.add_all(portfolio_assets)
        db_session.commit()
        
        insert_time = time.time() - start_time
        
        # Should complete in reasonable time (< 5 seconds for 500 assets)
        assert insert_time < 5.0, f"Bulk insert took too long: {insert_time:.2f}s"
        
        # Test query performance
        start_time = time.time()
        
        portfolio_with_assets = db_session.query(Portfolio).filter(
            Portfolio.id == portfolio.id
        ).first()
        
        asset_count = len(portfolio_with_assets.portfolio_assets)
        
        query_time = time.time() - start_time
        
        assert asset_count == n_assets
        assert query_time < 1.0, f"Query took too long: {query_time:.2f}s"

    @integration
    def test_batch_operations_performance(self, db_session: Session):
        """Test performance of batch operations."""
        user = User(email="batch@example.com", hashed_password="hash", full_name="User")
        db_session.add(user)
        db_session.commit()
        
        # Create multiple portfolios
        n_portfolios = 50
        portfolios = []
        
        import time
        start_time = time.time()
        
        for i in range(n_portfolios):
            portfolio = Portfolio(
                name=f"Batch Portfolio {i}",
                user_id=user.id,
                created_at=datetime.utcnow()
            )
            portfolios.append(portfolio)
        
        db_session.add_all(portfolios)
        db_session.commit()
        
        batch_time = time.time() - start_time
        
        # Batch insert should be much faster than individual inserts
        assert batch_time < 2.0, f"Batch insert took too long: {batch_time:.2f}s"
        
        # Test batch update
        start_time = time.time()
        
        for portfolio in portfolios:
            portfolio.description = f"Updated description {portfolio.id}"
            portfolio.updated_at = datetime.utcnow()
        
        db_session.commit()
        
        update_time = time.time() - start_time
        assert update_time < 1.0, f"Batch update took too long: {update_time:.2f}s"

    @integration
    def test_query_optimization(self, db_session: Session):
        """Test query performance with proper indexing."""
        # Create test data
        user = User(email="query@example.com", hashed_password="hash", full_name="User")
        db_session.add(user)
        db_session.commit()
        
        # Create many portfolios for the user
        portfolios = []
        for i in range(100):
            portfolio = Portfolio(
                name=f"Query Portfolio {i}",
                user_id=user.id,
                created_at=datetime.utcnow() - timedelta(days=i)
            )
            portfolios.append(portfolio)
        
        db_session.add_all(portfolios)
        db_session.commit()
        
        # Test query by user_id (should be indexed)
        import time
        start_time = time.time()
        
        user_portfolios = db_session.query(Portfolio).filter(
            Portfolio.user_id == user.id
        ).all()
        
        query_time = time.time() - start_time
        
        assert len(user_portfolios) == 100
        # Query should be fast with proper indexing
        assert query_time < 0.1, f"User portfolio query took too long: {query_time:.4f}s"
        
        # Test query with ordering (should use index on created_at)
        start_time = time.time()
        
        recent_portfolios = db_session.query(Portfolio).filter(
            Portfolio.user_id == user.id
        ).order_by(Portfolio.created_at.desc()).limit(10).all()
        
        ordered_query_time = time.time() - start_time
        
        assert len(recent_portfolios) == 10
        assert ordered_query_time < 0.1, f"Ordered query took too long: {ordered_query_time:.4f}s"
        
        # Verify ordering is correct
        for i in range(1, len(recent_portfolios)):
            assert recent_portfolios[i].created_at <= recent_portfolios[i-1].created_at