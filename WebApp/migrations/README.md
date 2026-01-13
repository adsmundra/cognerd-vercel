# Database Migrations

This directory contains SQL migration scripts for the application database schema.

## Running Migrations

To apply migrations to your database, run:

```bash
psql $DATABASE_URL -f migrations/001_create_app_schema.sql
```

Or if using a migration tool:

```bash
# Example with dbmate
dbmate up

# Example with migrate
migrate -path migrations -database $DATABASE_URL up
```

## Migration Files

- `001_create_app_schema.sql` - Creates all application tables (conversations, messages, user profiles, etc.)

## Important Notes

- Better Auth manages its own tables (user, session, account, verification) automatically
- These migrations only handle application-specific tables
- All tables use `IF NOT EXISTS` to be idempotent
- Foreign keys reference Better Auth's user table via `user_id` text field