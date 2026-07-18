"""Lightweight auto-migration: `Base.metadata.create_all()` only creates
tables that don't exist yet -- it never adds columns to a table that's
already there. Since this project has no Alembic setup, any model change
that adds a column to an existing table (e.g. Project.client_id) would
silently 500 in production until someone manually ALTERs the table.

`auto_migrate` closes that gap: for every table that already exists, it
diffs the live columns against the SQLAlchemy model and ALTERs in whatever
is missing. Safe to run on every startup -- already-matching tables are a
no-op.
"""
from __future__ import annotations

from sqlalchemy import inspect, text


def _default_sql(column):
    """Best-effort SQL literal for a column's Python-side default, so
    NOT NULL columns can be backfilled on existing rows."""
    default = column.default
    if default is None or not getattr(default, "is_scalar", False):
        return None
    value = default.arg
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, str):
        return "'" + value.replace("'", "''") + "'"
    return None


def auto_migrate(engine, base):
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as conn:
        for table in base.metadata.sorted_tables:
            if table.name not in existing_tables:
                continue  # brand-new table -- create_all() already handled it
            existing_cols = {c["name"] for c in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in existing_cols:
                    continue
                col_type = column.type.compile(dialect=engine.dialect)
                ddl = f"ALTER TABLE {table.name} ADD COLUMN {column.name} {col_type}"
                default_sql = _default_sql(column)
                if default_sql is not None:
                    ddl += f" DEFAULT {default_sql}"
                try:
                    conn.execute(text(ddl))
                    print(f"auto_migrate: added {table.name}.{column.name}")
                except Exception as e:
                    print(f"auto_migrate: failed adding {table.name}.{column.name}: {e}")
