import eventlet
eventlet.monkey_patch()  # Monkey patch phải được gọi trước tất cả các import khác

from flask import Flask, render_template, request, redirect, url_for, flash
from flask import send_from_directory, session, jsonify
from flask_socketio import SocketIO, emit
from functools import wraps
from werkzeug.utils import secure_filename
from urllib.parse import quote
from werkzeug.security import generate_password_hash
import os
import time
import  uuid
import random
import requests

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", ping_timeout=600, ping_interval=10) #['https://beatball.onrender.com']

app.secret_key = 'BeatBall@xyz'

# Cài đặt bảo mật session
app.config['SESSION_COOKIE_HTTPONLY'] = True  # Ngăn JavaScript truy cập cookie
app.config['SESSION_COOKIE_SECURE'] = True   # Chỉ bật True nếu sử dụng HTTPS
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # Bảo vệ chống tấn công CSRF

UPLOAD_FOLDER = 'static/uploads/avatars'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

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

        if time.time() - session.get('last_activity', 0) > 600:
            session.clear()
            flash("Session expired. Please log in again.", "warning")
            return redirect(url_for("login"))

        session['last_activity'] = time.time()
        return f(*args, **kwargs)
    return decorated_function

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/upload-avatar', methods=['POST'])
@login_required
def upload_avatar():
    if 'avatar' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['avatar']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type'}), 400

    try:
        filename = secure_filename(f"avatar_{session['user_id']}_{int(time.time())}.{file.filename.rsplit('.', 1)[1].lower()}")
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        print(f"File saved to: {file_path}")

        # Relative path for storing in Firebase
        relative_path = f"/static/uploads/avatars/{filename}"

        # Update Firebase
        user_id = session.get('user_id')
        firebase_query_url = f"{FIREBASE_URL[:-5]}/{user_id}.json"
        response = requests.patch(firebase_query_url, json={'profile_picture': relative_path})
        
        if response.status_code == 200:
            print(f"Firebase updated successfully for user {user_id}: {relative_path}")
            return jsonify({'success': True, 'profilePicture': relative_path})
        else:
            print(f"Firebase update failed: {response.text}")
            os.remove(file_path)  # Rollback file save if Firebase fails
            return jsonify({'error': 'Failed to update database'}), 500
    except Exception as e:
        print(f"Error uploading avatar: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/')
def main():
    return render_template('index.html')

@app.route("/home")
@login_required
def home():
    user_id = session.get("user_id")
    username = session.get("username")
    
    # Lấy thông tin từ Firebase
    firebase_query_url = f"{FIREBASE_URL[:-5]}/{user_id}.json"
    response = requests.get(firebase_query_url)
    
    if response.status_code == 200:
        user_data = response.json()
        profile_picture = user_data.get('profile_picture', '/static/images/default-avatar.png')  # Avatar mặc định
        stats = user_data.get('stats', {})
        
        # Tính toán các chỉ số thống kê
        matches = stats.get('matches', 0)
        win_matches = stats.get('win_matches', 0)
        goals = stats.get('goals', 0)
        assists = stats.get('assists', 0)
        rating = stats.get('point', 1000)
        rating_change = stats.get('rating_change', 0)
        
        winrate = round((win_matches / matches * 100), 2) if matches > 0 else 0
        goal_ratio = round(goals / matches, 2) if matches > 0 else 0
        assist_ratio = round(assists / matches, 2) if matches > 0 else 0
        ga_ratio = round(goals / (assists if assists > 0 else 1), 2)
        
        user_stats = {
            'matches': matches,
            'winrate': winrate,
            'goals': goals,
            'assists': assists,
            'goal_ratio': goal_ratio,
            'assist_ratio': assist_ratio,
            'ga_ratio': ga_ratio,
            'rating': rating,
            'rating_change': rating_change,
        }
        
        return render_template(
            "home.html",
            username=username,
            profile_picture=profile_picture,  # Truyền avatar
            stats=user_stats
        )
    else:
        flash("Error loading user data", "error")
        return redirect(url_for("login"))
    
def update_user_stats(user_id, win=False, goals=0, assists=0):
    """
    Cập nhật thống kê người dùng sau mỗi trận đấu
    """
    firebase_query_url = f"{FIREBASE_URL[:-5]}/{user_id}.json"
    
    # Lấy dữ liệu hiện tại
    response = requests.get(firebase_query_url)
    if response.status_code == 200:
        user_data = response.json()
        stats = user_data.get('stats', {
            'matches': 0,
            'win_matches': 0,
            'goals': 0,
            'assists': 0,
            'point': 1000
        })
        
        # Cập nhật thống kê
        stats['matches'] += 1
        if win:
            stats['win_matches'] += 1
        stats['goals'] += goals
        stats['assists'] += assists
        
        # Tính điểm rating mới (có thể điều chỉnh công thức theo ý muốn)
        rating_change = 0
        if win:
            rating_change = 25 + (goals * 5) + (assists * 3)
        else:
            rating_change = -20 + (goals * 2) + (assists * 1)
        
        stats['point'] = max(0, stats['point'] + rating_change)
        
        # Cập nhật lên Firebase
        user_data['stats'] = stats
        update_response = requests.patch(firebase_query_url, json=user_data)
        
        return update_response.status_code == 200
    
    return False

@app.route("/end-match", methods=["POST"])
@login_required
def end_match():
    data = request.get_json()
    user_id = session.get("user_id")
    
    win = data.get("win", False)
    goals = data.get("goals", 0)
    assists = data.get("assists", 0)
    
    if update_user_stats(user_id, win, goals, assists):
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "error": "Failed to update stats"}), 500

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
    username = session.get("username")

    # Kiểm tra giới hạn người chơi
    if username not in room["current_players"]:
        if len(room["current_players"]) >= room["max_players"]:
            return jsonify({"error": "Room is full."}), 403
        room["current_players"].append(username)

    # Cập nhật số tab
    user_tabs = room.get("user_tabs", {})
    user_tabs[username] = user_tabs.get(username, 0) + 1
    room["user_tabs"] = user_tabs
    
    socketio.emit('player_joined', {
        'room_id': room_id,
        'username': username,
        'current_players': room["current_players"]
    }, room=room_id)

    return jsonify({
        "message": f"Successfully joined room {room_id}.",
        "room_id": room_id,
        "current_players": room["current_players"]
    }), 200

@app.route("/leave-room/<room_id>", methods=["POST"])
@login_required
def leave_room(room_id):
    try:
        if room_id not in rooms:
            return jsonify({"error": "Room does not exist."}), 404

        room = rooms[room_id]
        username = session.get("username")

        # Đếm số tab của người dùng này trong phòng
        user_tabs = room.get("user_tabs", {})
        user_tabs[username] = user_tabs.get(username, 1) - 1
        
        # Chỉ xóa người chơi khi không còn tab nào
        if user_tabs[username] <= 0:
            if username in room["current_players"]:
                room["current_players"].remove(username)
                del user_tabs[username]
                
                # Kiểm tra và xóa phòng nếu không còn người chơi
                if len(room["current_players"]) == 0:
                    del rooms[room_id]
                    # Thông báo cho tất cả client về việc phòng bị xóa
                    socketio.emit('room_deleted', {
                        'room_id': room_id,
                        'message': 'Room has been deleted'
                    }, broadcast=True)
                    return jsonify({
                        "message": "Room deleted successfully.", 
                        "redirect": url_for("home")
                    }), 200
                
                # Thông báo cho các người chơi còn lại
                socketio.emit('player_left', {
                    'room_id': room_id,
                    'username': username,
                    'remaining_players': room["current_players"]
                }, broadcast=True)  # Broadcast để tất cả tab đều nhận được
        
        room["user_tabs"] = user_tabs
        return jsonify({"message": f"Successfully left room {room_id}"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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

@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    user_id = data.get("user_id")  # ID từ Firebase

    if username and user_id:
        # Tạo session cho người dùng
        session.clear()
        session["user_id"] = user_id
        session["username"] = username
        session["last_activity"] = time.time()

        return jsonify({"success": True, "redirect": url_for("home")})
    else:
        return jsonify({"success": False, "error": "Invalid registration data"}), 400

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
    username = session.get("username")
    
    # Kiểm tra nếu người dùng đã có trong phòng (tab trùng)
    if username not in room["current_players"]:
        room["current_players"].append(username)
    
    session['current_room'] = room_id

    if int(room_id) < 550000:
        return render_template("room_2.html", 
                             room_id=room_id, 
                             room=room, 
                             session=session)
    else:
        return render_template("room_4.html", 
                             room_id=room_id, 
                             room=room, 
                             session=session)
    
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

@app.route("/get-user-stats")
@login_required
def get_user_stats():
    user_id = session.get("user_id")
    firebase_query_url = f"{FIREBASE_URL[:-5]}/{user_id}.json"
    
    response = requests.get(firebase_query_url)
    if response.status_code == 200:
        user_data = response.json()
        stats = user_data.get('stats', {})
        
        matches = stats.get('matches', 0)
        win_matches = stats.get('win_matches', 0)
        goals = stats.get('goals', 0)
        assists = stats.get('assists', 0)
        rating = stats.get('point', 1000)
        rating_change = stats.get('rating_change', 0)
        
        # Tính toán các tỷ lệ
        winrate = round((win_matches / matches * 100) if matches > 0 else 0, 2)
        goal_ratio = round((goals / matches) if matches > 0 else 0, 2)
        assist_ratio = round((assists / matches) if matches > 0 else 0, 2)
        ga_ratio = round((goals / assists) if assists > 0 else 0, 2)
        
        return jsonify({
            'matches': matches,
            'winrate': winrate,
            'goals': goals,
            'assists': assists,
            'goal_ratio': goal_ratio,
            'assist_ratio': assist_ratio,
            'ga_ratio': ga_ratio,
            'rating': rating,
            'rating_change': rating_change
        })
    
    return jsonify({'error': 'Failed to fetch stats'}), 500

@app.route("/find-match")
@login_required
def find_match():
    # Logic xử lý nếu cần
    return "Redirected to Find Match page!"

# Route to render the leaderboard HTML
@app.route("/leaderboard")
@login_required
def leaderboard():
    return render_template("leaderboard.html")

# Sự kiện socket.io để nhận và phát tin nhắn
@socketio.on('send_message')
def handle_message(data):
    username = session.get('username')  # Lấy username từ session
    if username:
        emit('receive_message', {'username': username, 'message': data['message']}, broadcast=True)

@socketio.on('join')
def on_join(data):
    room = data['room']
    join_room(room)

@socketio.on('leave')
def on_leave(data):
    room = data['room']
    leave_room(room)

@socketio.on('disconnect')
def on_disconnect():
    if 'current_room' in session:
        room_id = session['current_room']
        if room_id in rooms:
            username = session.get('username')
            room = rooms[room_id]
            user_tabs = room.get("user_tabs", {})
            
            if username in user_tabs:
                user_tabs[username] = user_tabs.get(username, 1) - 1
                if user_tabs[username] <= 0:
                    if username in room["current_players"]:
                        room["current_players"].remove(username)
                    del user_tabs[username]
                    
                    if len(room["current_players"]) == 0:
                        del rooms[room_id]

# Route to serve UserData.txt dynamically
@app.route("/data")
def fetch_data():
    return send_from_directory("static", "UserData.txt")

if __name__ == "__main__":
    # port = int(os.environ.get('PORT', 5000))  # Render sẽ cung cấp cổng qua biến môi trường PORT
    # socketio.run(app, host='0.0.0.0', port=port)
    socketio.run(app, debug=True)
