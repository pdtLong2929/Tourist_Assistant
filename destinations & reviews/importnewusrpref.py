import psycopg2
import json

conn = psycopg2.connect(
	host="127.0.0.1",
	port=5432,
	user="admin",
	password="BaoBuns1661!",
	dbname="trip_db"
)

cur = conn.cursor()

with open("updated_user_preferences.json") as f:
	data = json.load(f)

for user in data:
	cur.execute(
		"""
		INSERT INTO trip_db.user_preferences (
			user_id,
			preferred_transport_modes,
			budget_min,
			budget_max,
			preferred_destination_tags,
			avoid_tags,
			created_at,
			last_updated_at
		)
		VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
		ON CONFLICT (user_id) DO UPDATE SET
			preferred_transport_modes = EXCLUDED.preferred_transport_modes,
			budget_min = EXCLUDED.budget_min,
			budget_max = EXCLUDED.budget_max,
			preferred_destination_tags = EXCLUDED.preferred_destination_tags,
			avoid_tags = EXCLUDED.avoid_tags,
			last_updated_at = EXCLUDED.last_updated_at
		""",
		(
			user["user_id"],
			json.dumps(user["preferred_transport_modes"]),
			user["budget_min"],
			user["budget_max"],
			json.dumps(user["preferred_destination_tags"]),
			json.dumps(user["avoid_tags"]),
			user["created_at"],
			user["last_updated_at"]
		)
	)
conn.commit()
cur.close()
conn.close()

print("Done")