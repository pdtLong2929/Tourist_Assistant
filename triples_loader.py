#!/usr/bin/env python3
"""
triples_loader.py
Loads final_destination_triples.json into trip_db.destination_triples.

Usage:
    python triples_loader.py \
        --file ./final_destination_triples.json \
        --dsn "postgresql://user:pass@localhost:5432/mydb"

Safe to re-run — uses ON CONFLICT DO UPDATE.
"""

import argparse
import json
import psycopg2
import psycopg2.extras


def load_triples(cur, data: list[dict]):
    CHUNK = 100
    total = 0
    for i in range(0, len(data), CHUNK):
        chunk = data[i : i + CHUNK]
        psycopg2.extras.execute_values(
            cur,
            """
            INSERT INTO trip_db.destination_triples (destination_id, triples, generated_at)
            VALUES %s
            ON CONFLICT (destination_id) DO UPDATE SET
                triples      = EXCLUDED.triples,
                generated_at = now()
            """,
            [
                (
                    row["destination_id"].ljust(10)[:10],
                    json.dumps(row["triples"]),
                )
                for row in chunk
            ],
            template="(%s, %s::jsonb, now())",
        )
        total += len(chunk)
        print(f"  inserted {total}/{len(data)} rows...")
    return total


def main():
    parser = argparse.ArgumentParser(description="Load destination triples into trip_db")
    parser.add_argument("--file", required=True, help="Path to final_destination_triples.json")
    parser.add_argument("--dsn",  required=True, help="PostgreSQL DSN")
    args = parser.parse_args()

    with open(args.file, encoding="utf-8") as f:
        data = json.load(f)

    print(f"\nLoading {len(data)} destination triples from {args.file}")

    conn = psycopg2.connect(args.dsn)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        total = load_triples(cur, data)
        conn.commit()
        print(f"\nDone. {total} rows committed.")
    except Exception as e:
        conn.rollback()
        print(f"\nERROR: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
