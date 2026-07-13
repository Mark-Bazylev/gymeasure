# Custom Express over BaaS

We need auth, Session sync, Gym Buddy links, and Volume queries for a private two-person app. We chose a custom Express API over Supabase/Firebase so we own the HTTP surface and domain endpoints. The trade-off is more auth/hosting work; we accept that to keep a simple SQL-backed API we control.
