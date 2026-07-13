# Render free web service + Neon Postgres

Express runs on Render’s free web service (cold starts after idle are acceptable for two users). Durable data lives on Neon’s free Postgres, not Render’s free Postgres, because Render’s free DB expires after 30 days. Paid always-on Render is deferred until cold starts become painful.
