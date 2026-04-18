import csv
import os

def generate_sql_dump(output_file="trip_db_dump.sql", csv_dir="./SampleData"):
    # Thứ tự chuẩn xác để không bị lỗi Khóa ngoại (Foreign Key)
    tables = [
        ("users", "users.csv"),
        ("destinations", "destinations.csv"),
        ("transport_providers", "transport_providers.csv"),
        ("transport_modes", "transport_modes.csv"),
        ("user_preferences", "user_preferences.csv"),
        ("trips", "trips.csv"),
        ("trip_destinations", "trip_destinations.csv"),
        ("reviews", "reviews.csv"),
        ("route_comparisons", "route_comparisons.csv"),
        ("route_options", "route_options.csv")
    ]

    with open(output_file, "w", encoding="utf-8") as dump:
        # Khởi tạo Schema
        dump.write("CREATE SCHEMA IF NOT EXISTS trip_db;\n")
        dump.write("SET search_path TO trip_db;\n\n")

        for table_name, csv_file in tables:
            file_path = os.path.join(csv_dir, csv_file)
            if not os.path.exists(file_path):
                print(f"⚠️ Bỏ qua {table_name}: Không tìm thấy file {csv_file}")
                continue

            with open(file_path, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                columns = reader.fieldnames
                col_names = ", ".join(columns)
                
                dump.write(f"-- Data for table: {table_name}\n")
                for row in reader:
                    values = []
                    for col in columns:
                        val = row.get(col) # Dùng .get() an toàn hơn
                        
                        # BẢO VỆ DỮ LIỆU: Kiểm tra None trước khi gọi hàm chuỗi
                        if val is None or str(val).strip() == "" or str(val).lower() == "null":
                            values.append("NULL")
                        elif str(val).lower() in ["true", "false"]:
                            values.append(str(val).upper())
                        else:
                            # Xử lý các dấu nháy đơn trong text (như tên địa danh)
                            safe_val = str(val).replace("'", "''")
                            values.append(f"'{safe_val}'")
                    
                    val_str = ", ".join(values)
                    # Ghi lệnh INSERT
                    dump.write(f"INSERT INTO {table_name} ({col_names}) VALUES ({val_str});\n")
                dump.write("\n")

    print(f"✅ Đã tạo thành công file: {output_file} tại thư mục hiện tại.")

if __name__ == "__main__":
    generate_sql_dump()