import contextlib
import logging
from typing import Generator
import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool
from .config import settings

logger = logging.getLogger("hien.database")

# Initialize connection pool
pool: ConnectionPool | None = None

def get_db_pool() -> ConnectionPool:
    global pool
    if pool is None:
        logger.info("Initializing PostgreSQL ConnectionPool...")
        pool = ConnectionPool(
            conninfo=settings.DATABASE_URL,
            min_size=2,
            max_size=20,
            kwargs={"row_factory": dict_row}
        )
    return pool

def close_db_pool():
    global pool
    if pool is not None:
        logger.info("Closing PostgreSQL ConnectionPool...")
        pool.close()
        pool = None

@contextlib.contextmanager
def get_db_connection() -> Generator[psycopg.Connection, None, None]:
    p = get_db_pool()
    with p.connection() as conn:
        yield conn

def get_db():
    """FastAPI Dependency for database connection."""
    with get_db_connection() as conn:
        yield conn
