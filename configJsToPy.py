import json
import re
from pathlib import Path

def js_to_python_config(js_file_path):
    # Đọc nội dung file
    with open(js_file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Loại bỏ phần "window.CONFIG ="
    match = re.search(r'window\.CONFIG\s*=\s*(\{.*\});', content, re.DOTALL)
    if not match:
        raise ValueError("Không tìm thấy cấu hình 'window.CONFIG' trong file.")

    raw_json = match.group(1)

    # Loại bỏ comment `//` và chuyển dấu nháy đơn thành nháy kép
    cleaned_json = re.sub(r'//.*', '', raw_json)  # Xóa comment
    cleaned_json = cleaned_json.replace("'", '"')  # Thay dấu nháy đơn bằng nháy kép

    # Sửa dấu phẩy thừa
    cleaned_json = re.sub(r',\s*}', '}', cleaned_json)  # Loại bỏ dấu phẩy trước dấu ngoặc đóng }
    cleaned_json = re.sub(r',\s*]', ']', cleaned_json)  # Loại bỏ dấu phẩy trước dấu ngoặc đóng ]

    # Thêm dấu nháy kép quanh tên thuộc tính (tên property JSON)
    cleaned_json = re.sub(r'(\w+)\s*:', r'"\1":', cleaned_json)

    # Debug nội dung đã làm sạch
    print("Cleaned JSON content:")
    print(cleaned_json[:500])  # Chỉ in 500 ký tự đầu để kiểm tra

    # Chuyển đổi thành Python dictionary
    try:
        python_config = json.loads(cleaned_json)
        return python_config
    except json.JSONDecodeError as e:
        raise ValueError(f"Lỗi khi chuyển đổi sang JSON: {e}")

js_file_path = Path("static/js/config.js")  # Đường dẫn tới file config.js

config = js_to_python_config(js_file_path); 

total_width = (
    config["pitch"]["width"]  
    + config["pitch"]["borderWidth"] * 2 
    + config["nets"]["width"] * 2  
    + config["nets"]["borderWidth"] * 2  
)

total_height = (
    config["pitch"]["height"] 
    + config["pitch"]["borderWidth"] * 2 
)
