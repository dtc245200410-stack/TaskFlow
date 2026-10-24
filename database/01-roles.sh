#!/bin/sh
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=app_pass="$APP_DB_PASSWORD" --set=migrate_pass="$MIGRATE_DB_PASSWORD" --set=monitor_pass="$MONITOR_DB_PASSWORD" --set=db_name="$POSTGRES_DB" <<'SQL'
CREATE ROLE taskflow_migrate LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'migrate_pass';
CREATE ROLE taskflow_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'app_pass';
CREATE ROLE taskflow_monitor LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'monitor_pass';
REVOKE ALL ON DATABASE :"db_name" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"db_name" TO taskflow_migrate,taskflow_app,taskflow_monitor;
-- Prisma's CREATE SCHEMA requires CREATE on the database, including IF NOT EXISTS.
-- Grant only to the deployment role; the application role keeps DML privileges.
GRANT CREATE ON DATABASE :"db_name" TO taskflow_migrate;
ALTER SCHEMA public OWNER TO taskflow_migrate;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO taskflow_app,taskflow_monitor;
ALTER DEFAULT PRIVILEGES FOR ROLE taskflow_migrate IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO taskflow_app;
ALTER DEFAULT PRIVILEGES FOR ROLE taskflow_migrate IN SCHEMA public GRANT USAGE,SELECT ON SEQUENCES TO taskflow_app;
GRANT pg_monitor TO taskflow_monitor;
SQL
