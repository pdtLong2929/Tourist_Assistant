import os
import pandas as pd

folder_path = "Nodes"

results = []


processed_files = set()

if os.path.exists("coordinate_summary.csv"):
    coord = pd.read_csv("coordinate_summary.csv")
    processed_files = set(coord["file"])


for filename in os.listdir(folder_path):
    if filename.endswith(".csv"):

        if filename in processed_files:
            continue

        file_path = os.path.join(folder_path, filename)

        try:
            df = pd.read_csv(file_path)

            min_lon = df["x"].min()
            max_lon = df["x"].max()
            min_lat = df["y"].min()
            max_lat = df["y"].max()

            results.append({
                "file": filename,
                "min_lon": min_lon,
                "max_lon": max_lon,
                "min_lat": min_lat,
                "max_lat": max_lat
            })

        except Exception as e:
            print(f"Error processing {filename}: {e}")


if results:
    new_df = pd.DataFrame(results)

    if os.path.exists("coordinate_summary.csv"):
        old_df = pd.read_csv("coordinate_summary.csv")
        final_df = pd.concat([old_df, new_df], ignore_index=True)
    else:
        final_df = new_df

    final_df.to_csv("coordinate_summary.csv", index=False)
