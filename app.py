import eventlet
eventlet.monkey_patch()  # Monkey patch phải được gọi trước tất cả các import khác

from flask import Flask, render_template, request, redirect, url_for, flash
from flask import send_from_directory, session, jsonify
from flask_socketio import SocketIO, emit
from functools import wraps
import os
import time
import  uuid
import random

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", ping_timeout=600, ping_interval=10) #['https://beatball.onrender.com']

app.secret_key = 'BeatBall@xyz'

# Cài đặt bảo mật session
app.config['SESSION_COOKIE_HTTPONLY'] = True  # Ngăn JavaScript truy cập cookie
app.config['SESSION_COOKIE_SECURE'] = True   # Chỉ bật True nếu sử dụng HTTPS
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # Bảo vệ chống tấn công CSRF

# Firebase URL (thay thế bằng URL Firebase của bạn)
FIREBASE_URL = "https://beatball-18492-default-rtdb.asia-southeast1.firebasedatabase.app/users.json"

rooms = {}

# Middleware kiểm tra đăng nhập và thời gian không hoạt động
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash("You need to log in to access this page.", "warning")
            return redirect(url_for("login"))

        if time.time() - session.get('last_activity', 0) > 300:
            session.clear()
            flash("Session expired. Please log in again.", "warning")
            return redirect(url_for("login"))

        session['last_activity'] = time.time()
        return f(*args, **kwargs)
    return decorated_function

@app.route("/")
def main():
    return render_template("index.html")

@app.route("/home")
@login_required
def home():
    user_id = session.get("user_id")  # Lấy khóa node Firebase từ session
    username = session.get("username")  # Lấy username từ session
    return render_template("home.html", user_id=user_id, username=username)

@app.route("/create-room", methods=["POST"])
@login_required
def create_room():
    data = request.get_json()
    room_type = data.get("room_type")  # Loại phòng: "lobby" hoặc "vs"

    # Kiểm tra loại phòng
    if room_type not in ["lobby", "vs"]:
        return jsonify({"error": "Invalid room type."}), 400

    # Xác định giới hạn ID theo loại phòng
    if room_type == "lobby":
        id_min, id_max = 100000, 549999
        max_players = 2
    else:  # room_type == "vs"
        id_min, id_max = 550000, 999999
        max_players = 4

    # Tạo ID phòng ngẫu nhiên trong giới hạn
    while True:
        room_id = str(random.randint(id_min, id_max))
        if room_id not in rooms:  # Đảm bảo ID không bị trùng
            break

    # Thêm thông tin phòng vào danh sách `rooms`
    rooms[room_id] = {
        "created_by": session.get("user_id"),
        "max_players": max_players,
        "current_players": [session.get("username")],
        "is_active": True,
        "room_type": room_type,
    }

    return jsonify({"message": "Room created successfully.", "room_id": room_id}), 201

@app.route("/join-room/<room_id>", methods=["POST"])
@login_required
def join_room(room_id):
    if room_id not in rooms:
        return jsonify({"error": "Room does not exist."}), 404

    room = rooms[room_id]

    # Check if the room is full
    if len(room["current_players"]) >= room["max_players"]:
        return jsonify({"error": "Room is full."}), 403

    username = session.get("username")

    # Add the user to the room if not already present
    if username not in room["current_players"]:
        room["current_players"].append(username)

    return jsonify({"message": f"Successfully joined room {room_id}.", "room_id": room_id}), 200

@app.route("/leave-room/<room_id>", methods=["POST"])
@login_required
def leave_room(room_id):
    if room_id not in rooms:
        return jsonify({"error": "Room does not exist."}), 404

    room = rooms[room_id]
    username = session.get("username")

    # Remove the user from the room
    if username in room["current_players"]:
        room["current_players"].remove(username)

    # If no players are left, delete the room
    if not room["current_players"]:
        print(f"Room {room_id} is empty. Deleting the room.")  # Debugging log
        del rooms[room_id]

    return jsonify({"message": f"Successfully left room {room_id}.", "room_id": room_id}), 200

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        data = request.get_json()
        username = data.get("username")
        user_id = data.get("user_id")

        if username and user_id:
            # Lưu thông tin người dùng vào session
            session.clear()
            session["user_id"] = user_id
            session["username"] = username
            session["last_activity"] = time.time()
            flash("Login successful!", "success")
            return redirect(url_for("home"))
        else:
            return "Invalid login data.", 400

    return render_template("login.html")

@app.route("/logout")
def logout():
    session.clear()  # Xóa toàn bộ session
    flash("You have been logged out.", "info")
    return redirect(url_for("main"))

@app.route("/room/<room_id>")
@login_required
def room(room_id):
    if room_id not in rooms:
        flash("Room does not exist.", "danger")
        return redirect(url_for("home"))

    room = rooms[room_id]
    if int(room_id) < 550000:
        return render_template("room_2.html", room_id=room_id, room=room)
    else:
        return render_template("room_4.html", room_id=room_id, room=room)
    
@app.route("/check-room/<room_id>", methods=["GET"])
@login_required
def check_room(room_id):
    if room_id not in rooms:
        return jsonify({"exists": False}), 404

    room = rooms[room_id]

    # Kiểm tra phòng có người chơi không
    if not room["current_players"]:
        print(f"Room {room_id} has no players. Deleting the room.")  # Debugging log
        del rooms[room_id]
        return jsonify({"exists": False}), 404

    return jsonify({"exists": True}), 200

@app.route("/find-match")
@login_required
def find_match():
    # Logic xử lý nếu cần
    return "Redirected to Find Match page!"

# Sự kiện socket.io để nhận và phát tin nhắn
@socketio.on('send_message')
def handle_message(data):
    # Phát lại tin nhắn cho tất cả các client
    emit('receive_message', data, broadcast=True)

# Route to render the leaderboard HTML
@app.route("/leaderboard")
@login_required
def leaderboard():
    return render_template("leaderboard.html")

# Route to serve UserData.txt dynamically
@app.route("/data")
def fetch_data():
    return send_from_directory("static", "UserData.txt")

if __name__ == "__main__":
    # port = int(os.environ.get('PORT', 5000))  # Render sẽ cung cấp cổng qua biến môi trường PORT
    # socketio.run(app, host='0.0.0.0', port=port)
    socketio.run(app, debug=True)
