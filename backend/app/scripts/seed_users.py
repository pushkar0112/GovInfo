"""
GovInnovate CLI Entrypoint for Database Seeding
Usage:
  python -m app.scripts.seed_users
"""
from app.db.seed import main

if __name__ == "__main__":
    main()
