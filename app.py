import eventlet
eventlet.monkey_patch()  # Monkey patch phải được gọi trước tất cả các import khác

from flask import Flask, render_template, request, redirect, url_for, flash
from flask import send_from_directory, session
from flask_socketio import SocketIO, emit
import os
import time
from functools import wraps

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", ping_timeout=600, ping_interval=10) #['https://beatball.onrender.com']

app.secret_key = 'BeatBall@xyz'

# Cài đặt bảo mật session
app.config['SESSION_COOKIE_HTTPONLY'] = True  # Ngăn JavaScript truy cập cookie
app.config['SESSION_COOKIE_SECURE'] = True   # Chỉ bật True nếu sử dụng HTTPS
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # Bảo vệ chống tấn công CSRF

# Firebase URL (thay thế bằng URL Firebase của bạn)
FIREBASE_URL = "https://beatball-18492-default-rtdb.asia-southeast1.firebasedatabase.app/users.json"

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
def room(room_id):
    if int(room_id) < 550000:
        return render_template("room_2.html", room_id=room_id)
    else:
        return render_template("room_4.html", room_id=room_id)

@app.route("/find-match")
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
