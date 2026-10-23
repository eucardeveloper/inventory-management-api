#!/bin/sh
# Creates the restricted runtime role the backend connects as.
#
# Two database identities are used on purpose:
#   * POSTGRES_USER (owner)  - runs the Flyway migrations, owns every table. Used only at start-up.
#   * inventory_app (runtime) - what the running application uses. It can read and write rows, and
#     nothing else: no CREATE/DROP/ALTER, no superuser, no role or database creation.
# So a SQL-injection or a leaked application password cannot drop tables or change the schema.
#
# Runs automatically when the data volume is first created (postgres image init hook). It is idempotent,
# so it can also be run by hand against an existing volume:
#   docker compose exec -T inventory-database sh /docker-entrypoint-initdb.d/10-app-role.sh
set -eu

APP_USER="${APP_DB_USER:-inventory_app}"
APP_PASSWORD="${APP_DB_PASSWORD:?APP_DB_PASSWORD is not set}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v app_user="$APP_USER" -v app_password="$APP_PASSWORD" -v owner="$POSTGRES_USER" -v db="$POSTGRES_DB" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT',
              :'app_user', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_user') \gexec
SELECT format('ALTER ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT',
              :'app_user', :'app_password') \gexec

-- Nobody but the owner may create objects in the schema.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'db', :'app_user') \gexec
SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'app_user') \gexec

-- Tables and sequences that already exist (running this against an existing database) ...
SELECT format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I', :'app_user') \gexec
SELECT format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I', :'app_user') \gexec
-- ... and every table/sequence the owner's Flyway migrations create later.
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
              :'owner', :'app_user') \gexec
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I',
              :'owner', :'app_user') \gexec
SQL
echo "Runtime role '$APP_USER' is ready."
