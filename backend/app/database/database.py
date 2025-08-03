"""
Database Configuration and Connection Management
Handles SQLAlchemy setup, connection pooling, and session management
"""

import os
from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from contextlib import contextmanager
import logging
from typing import Generator, Optional
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database URL - supports PostgreSQL, MySQL, and SQLite
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "sqlite:///./portfolio_optimization.db"  # Default to SQLite for development
)

# For PostgreSQL in production, use:
# DATABASE_URL = "postgresql://username:password@localhost/portfolio_optimization"

# For MySQL, use:
# DATABASE_URL = "mysql+pymysql://username:password@localhost/portfolio_optimization"

# Create SQLAlchemy engine with connection pooling
if DATABASE_URL.startswith("sqlite"):
    # SQLite configuration
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=os.getenv("SQL_ECHO", "false").lower() == "true"
    )
else:
    # PostgreSQL/MySQL configuration with connection pooling
    engine = create_engine(
        DATABASE_URL,
        poolclass=QueuePool,
        pool_size=20,
        max_overflow=0,
        pool_pre_ping=True,
        pool_recycle=300,
        echo=os.getenv("SQL_ECHO", "false").lower() == "true"
    )

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Import Base from models
from .models import Base


def create_database():
    """Create all database tables"""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise


def drop_database():
    """Drop all database tables (use with caution)"""
    try:
        Base.metadata.drop_all(bind=engine)
        logger.info("Database tables dropped successfully")
    except Exception as e:
        logger.error(f"Error dropping database tables: {e}")
        raise


# Dependency to get DB session
def get_db() -> Generator[Session, None, None]:
    """
    Dependency function to get database session
    Used with FastAPI Depends()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """
    Context manager for database sessions
    Use this for manual session management
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Database session error: {e}")
        raise
    finally:
        db.close()


class DatabaseManager:
    """Database manager for advanced operations"""
    
    def __init__(self):
        self.engine = engine
        self.SessionLocal = SessionLocal
    
    def get_session(self) -> Session:
        """Get a new database session"""
        return self.SessionLocal()
    
    def health_check(self) -> dict:
        """Check database health and connectivity"""
        try:
            start_time = time.time()
            
            with self.get_session() as session:
                # Simple query to test connectivity
                result = session.execute(text("SELECT 1"))
                result.fetchone()
                
                # Get database info
                if DATABASE_URL.startswith("sqlite"):
                    db_type = "sqlite"
                    version_query = "SELECT sqlite_version()"
                elif "postgresql" in DATABASE_URL:
                    db_type = "postgresql"
                    version_query = "SELECT version()"
                elif "mysql" in DATABASE_URL:
                    db_type = "mysql"
                    version_query = "SELECT VERSION()"
                else:
                    db_type = "unknown"
                    version_query = "SELECT 1"
                
                version_result = session.execute(text(version_query))
                version = version_result.fetchone()[0] if version_result else "Unknown"
                
                response_time = (time.time() - start_time) * 1000  # Convert to milliseconds
                
                return {
                    "status": "healthy",
                    "database_type": db_type,
                    "version": version,
                    "response_time_ms": round(response_time, 2),
                    "connection_pool_size": self.engine.pool.size(),
                    "checked_out_connections": self.engine.pool.checkedout()
                }
                
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "database_type": "unknown",
                "response_time_ms": None
            }
    
    def get_table_stats(self) -> dict:
        """Get statistics about database tables"""
        stats = {}
        
        try:
            with self.get_session() as session:
                # Get table names
                if DATABASE_URL.startswith("sqlite"):
                    tables_query = "SELECT name FROM sqlite_master WHERE type='table'"
                elif "postgresql" in DATABASE_URL:
                    tables_query = "SELECT tablename FROM pg_tables WHERE schemaname='public'"
                elif "mysql" in DATABASE_URL:
                    tables_query = "SHOW TABLES"
                else:
                    return {"error": "Unsupported database type"}
                
                result = session.execute(text(tables_query))
                tables = [row[0] for row in result.fetchall()]
                
                # Get row counts for each table
                for table in tables:
                    try:
                        count_result = session.execute(text(f"SELECT COUNT(*) FROM {table}"))
                        count = count_result.fetchone()[0]
                        stats[table] = {"row_count": count}
                    except Exception as e:
                        stats[table] = {"error": str(e)}
                
        except Exception as e:
            return {"error": str(e)}
        
        return stats
    
    def backup_database(self, backup_path: str) -> bool:
        """
        Backup database (SQLite only for now)
        For production databases, use proper backup tools
        """
        if not DATABASE_URL.startswith("sqlite"):
            logger.warning("Backup not implemented for non-SQLite databases")
            return False
        
        try:
            import shutil
            db_path = DATABASE_URL.replace("sqlite:///", "")
            shutil.copy2(db_path, backup_path)
            logger.info(f"Database backed up to {backup_path}")
            return True
        except Exception as e:
            logger.error(f"Backup failed: {e}")
            return False
    
    def optimize_database(self) -> dict:
        """Optimize database performance"""
        results = {}
        
        try:
            with self.get_session() as session:
                if DATABASE_URL.startswith("sqlite"):
                    # SQLite optimization
                    session.execute(text("VACUUM"))
                    session.execute(text("ANALYZE"))
                    results["sqlite_optimization"] = "completed"
                    
                elif "postgresql" in DATABASE_URL:
                    # PostgreSQL optimization
                    session.execute(text("VACUUM ANALYZE"))
                    results["postgresql_optimization"] = "completed"
                    
                elif "mysql" in DATABASE_URL:
                    # MySQL optimization
                    session.execute(text("OPTIMIZE TABLE users, portfolios, assets, price_history"))
                    results["mysql_optimization"] = "completed"
                
                session.commit()
                results["status"] = "success"
                
        except Exception as e:
            results["status"] = "error"
            results["error"] = str(e)
            logger.error(f"Database optimization failed: {e}")
        
        return results


# Event listeners for database monitoring
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Set SQLite pragmas for better performance"""
    if DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        # Enable foreign key constraints
        cursor.execute("PRAGMA foreign_keys=ON")
        # Set journal mode to WAL for better concurrency
        cursor.execute("PRAGMA journal_mode=WAL")
        # Set synchronous mode to NORMAL for better performance
        cursor.execute("PRAGMA synchronous=NORMAL")
        # Set cache size (negative value = KB)
        cursor.execute("PRAGMA cache_size=-64000")  # 64MB cache
        cursor.close()


@event.listens_for(engine, "checkout")
def receive_checkout(dbapi_connection, connection_record, connection_proxy):
    """Log database connection checkout"""
    logger.debug("Database connection checked out")


@event.listens_for(engine, "checkin")
def receive_checkin(dbapi_connection, connection_record):
    """Log database connection checkin"""
    logger.debug("Database connection checked in")


# Initialize database manager
db_manager = DatabaseManager()


# Database migration utilities
class DatabaseMigration:
    """Handle database schema migrations"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
    
    def get_current_version(self) -> Optional[int]:
        """Get current database schema version"""
        try:
            with self.db_manager.get_session() as session:
                # Create migration table if it doesn't exist
                session.execute(text("""
                    CREATE TABLE IF NOT EXISTS schema_migrations (
                        version INTEGER PRIMARY KEY,
                        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """))
                session.commit()
                
                # Get latest version
                result = session.execute(text("SELECT MAX(version) FROM schema_migrations"))
                version = result.fetchone()[0]
                return version or 0
                
        except Exception as e:
            logger.error(f"Error getting schema version: {e}")
            return None
    
    def apply_migration(self, version: int, sql: str) -> bool:
        """Apply a database migration"""
        try:
            with self.db_manager.get_session() as session:
                # Execute migration SQL
                session.execute(text(sql))
                
                # Record migration
                session.execute(
                    text("INSERT INTO schema_migrations (version) VALUES (:version)"),
                    {"version": version}
                )
                
                session.commit()
                logger.info(f"Applied migration version {version}")
                return True
                
        except Exception as e:
            logger.error(f"Migration {version} failed: {e}")
            return False
    
    def migrate_to_latest(self) -> dict:
        """Apply all pending migrations"""
        current_version = self.get_current_version()
        if current_version is None:
            return {"status": "error", "message": "Could not determine current version"}
        
        # Define migrations
        migrations = {
            1: """
                -- Add indexes for better performance
                CREATE INDEX IF NOT EXISTS idx_price_history_symbol_date 
                ON price_history(asset_id, date);
                
                CREATE INDEX IF NOT EXISTS idx_optimization_results_created 
                ON optimization_results(created_at);
            """,
            2: """
                -- Add data quality columns
                ALTER TABLE price_history 
                ADD COLUMN IF NOT EXISTS data_quality_score REAL DEFAULT 1.0;
                
                ALTER TABLE assets 
                ADD COLUMN IF NOT EXISTS last_quality_check TIMESTAMP;
            """,
            # Add more migrations as needed
        }
        
        applied_migrations = []
        failed_migrations = []
        
        for version, sql in migrations.items():
            if version > current_version:
                if self.apply_migration(version, sql):
                    applied_migrations.append(version)
                else:
                    failed_migrations.append(version)
                    break  # Stop on first failure
        
        return {
            "status": "completed" if not failed_migrations else "partial",
            "current_version": self.get_current_version(),
            "applied_migrations": applied_migrations,
            "failed_migrations": failed_migrations
        }


# Initialize migration manager
migration_manager = DatabaseMigration(db_manager)


# Utility functions
def init_database():
    """Initialize database with tables and sample data"""
    try:
        create_database()
        
        # Apply any pending migrations
        migration_result = migration_manager.migrate_to_latest()
        logger.info(f"Migration result: {migration_result}")
        
        # Create sample data if in development mode
        if os.getenv("ENVIRONMENT", "development") == "development":
            from .models import create_sample_data
            with get_db_session() as session:
                # Check if sample data already exists
                from .models import User
                user_count = session.query(User).count()
                
                if user_count == 0:
                    create_sample_data(session)
                    logger.info("Sample data created")
                else:
                    logger.info("Sample data already exists")
        
        logger.info("Database initialization completed")
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise


if __name__ == "__main__":
    # CLI for database operations
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "init":
            init_database()
        elif command == "health":
            health = db_manager.health_check()
            print(f"Database health: {health}")
        elif command == "stats":
            stats = db_manager.get_table_stats()
            print(f"Table statistics: {stats}")
        elif command == "optimize":
            result = db_manager.optimize_database()
            print(f"Optimization result: {result}")
        elif command == "migrate":
            result = migration_manager.migrate_to_latest()
            print(f"Migration result: {result}")
        else:
            print(f"Unknown command: {command}")
            print("Available commands: init, health, stats, optimize, migrate")
    else:
        print("Usage: python database.py <command>")
        print("Available commands: init, health, stats, optimize, migrate")