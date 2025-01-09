import eventlet
eventlet.monkey_patch()  # Monkey patch phải được gọi trước tất cả các import khác

from flask import Flask, render_template, request, redirect, url_for, flash
from flask import send_from_directory, session, jsonify, make_response
from flask_socketio import SocketIO, emit, join_room
from functools import wraps
from werkzeug.utils import secure_filename
from urllib.parse import quote
from werkzeug.security import generate_password_hash
from email.mime.text import MIMEText
from game_manager.k8s_manager import K8sGameManager
import os
import time
import  uuid
import random
import requests
import smtplib
import redis
import json
import threading

game_manager = K8sGameManager()
game_manager.cleanup_unused_services()

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins=['https://beatball.onrender.com'], ping_timeout=600, ping_interval=10)
#socketio = SocketIO(app, cors_allowed_origins="*", ping_timeout=600, ping_interval=10)

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

# Kết nối Redis
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
redis_client = redis.StrictRedis.from_url(REDIS_URL, decode_responses=True)
#redis_client = redis.StrictRedis("127.0.0.1", port=6379, db=0)
#redis_client.ping()  # Kiểm tra kết nối

# Thời gian TTL mặc định cho room (2 giờ)
ROOM_TTL = 7200

def get_game_instance(room_id):
    """Helper function to get game instance"""
    return game_manager.get_game(room_id)

def save_room(room_id, room_data):
    """
    Lưu (update) thông tin phòng vào Redis và set TTL
    """
    redis_client.set(f"room:{room_id}", json.dumps(room_data))
    redis_client.expire(f"room:{room_id}", ROOM_TTL)

def get_room(room_id):
    """Lấy thông tin phòng từ Redis"""
    try:
        print(f"Fetching room {room_id} from Redis")
        data = redis_client.get(f"room:{room_id}")
        if not data:
            print(f"Room {room_id} not found in Redis")
            return None
            
        room = json.loads(data)
        print(f"Room data retrieved: {json.dumps(room, indent=2)}")
        return room
    except Exception as e:
        print(f"Error getting room {room_id}: {e}")
        return None

def sync_room_host(room_id):
    """
    Đồng bộ host_id, cập nhật is_host cho các slot trong player_slots,
    rồi bắn socket event "host_update" để client cập nhật UI.
    """
    room = get_room(room_id)
    if not room:
        return
    
    host_id = room.get("host_id")
    if not host_id:
        remaining = [slot for slot in room["player_slots"] if slot]
        if remaining:
            new_host = remaining[0]
            room["host_id"] = new_host["user_id"]
            new_host["is_host"] = True
        else:
            room["host_id"] = None  # Không còn ai trong phòng
    for slot in room["player_slots"]:
        if slot:
            slot["is_host"] = (slot["user_id"] == host_id)
    
    save_room(room_id, room)
    
    socketio.emit("host_update", {
        "room_id": room_id,
        "host_id": host_id,
        "player_slots": room["player_slots"]
    }, room=room_id)

# Middleware kiểm tra đăng nhập và thời gian không hoạt động
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash("You need to log in to access this page.", "warning")
            return redirect(url_for("main"))

        if time.time() - session.get('last_activity', 0) > 600:
            session.clear()
            flash("Session expired. Please log in again.", "warning")
            return redirect(url_for("main"))

        session['last_activity'] = time.time()

        # Không áp dụng Cache-Control cho tệp tĩnh
        if not request.path.startswith('/static'):
            response = make_response(f(*args, **kwargs))
            response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            response.headers['Pragma'] = 'no-cache'
            return response
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
        response = requests.patch(firebase_query_url, json={'profilePicture': relative_path})
        
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
    is_anonymous = session.get("is_anonymous", False)  # Kiểm tra trạng thái anonymous

    if is_anonymous:
        # Người dùng anonymous sử dụng thông tin mặc định
        profile_picture = "/static/images/default-avatar.png"
        user_stats = {
            'matches': 0,
            'winrate': 0,
            'goals': 0,
            'assists': 0,
            'goal_ratio': 0,
            'assist_ratio': 0,
            'ga_ratio': 0,
            'rating': 1000,
            'rating_change': 0,
        }
    else:
        # Người dùng đã đăng ký, lấy thông tin từ Firebase
        firebase_query_url = f"{FIREBASE_URL[:-5]}/{user_id}.json"
        response = requests.get(firebase_query_url)

        if response.status_code == 200:
            user_data = response.json()
            profile_picture = user_data.get('profilePicture', '/static/images/default-avatar.png')
            stats = user_data.get('stats', {})
            
            matches = stats.get('matches', 0)
            win_matches = stats.get('win_matches', 0)
            goals = stats.get('goals', 0)
            assists = stats.get('assists', 0)
            rating = stats.get('point', 1000)
            rating_change = stats.get('rating_change', 0)
            
            winrate = round((win_matches / matches * 100), 2) if matches > 0 else 0
            goal_ratio = round(goals / matches, 2) if matches > 0 else 0
            assist_ratio = round(assists / matches, 2) if matches > 0 else 0
            ga_ratio = round(goals / max(1, assists), 2)  # Tránh chia cho 0
            
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
        else:
            flash("Error loading user data", "error")
            return redirect(url_for("login"))

    return render_template(
        "home.html",
        username=username,
        profilePicture=profile_picture,
        stats=user_stats
    )
    
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
    """
    Tạo phòng mới (2vs2 hoặc lobby). Lưu trữ vào Redis, set TTL, 
    rồi trả về room_id cho client.
    """
    try:
        data = request.get_json()
        room_type = data.get("room_type")
        user_id = session.get("user_id")
        username = session.get("username")

        # Xác định range room_id và max_players
        if room_type == "lobby":
            id_min, id_max = 100000, 549999
            max_players = 2
        elif room_type == "vs":
            id_min, id_max = 550000, 999999
            max_players = 4
        else:
            return jsonify({"error": "Invalid room type"}), 400

        # Tạo room_id không trùng
        room_id = None
        for _ in range(10):
            tmp_id = str(random.randint(id_min, id_max))
            if not redis_client.exists(f"room:{tmp_id}"):
                room_id = tmp_id
                break
        
        if not room_id:
            return jsonify({"error": "Cannot generate unique room_id"}), 500
        
        # Lấy user profile từ Redis hoặc Firebase (tùy bạn)
        # Ở đây minh họa: user_profile lưu trong Redis key user:{user_id}
        user_profile_raw = redis_client.get(f"user:{user_id}")
        user_profile = {}
        if user_profile_raw:
            user_profile = json.loads(user_profile_raw)

        avatar = user_profile.get("profilePicture", "/static/images/default-avatar.png")
        score = user_profile.get("stats", {}).get("point", 1000)

        # Tạo player_slots
        player_slots = [None] * max_players
        player_slots[0] = {
            "username": username,
            "user_id": user_id,
            "slot": 0,
            "avatar": avatar,
            "score": score,
            "is_host": True,
            "is_ready": False
        }

        room_data = {
            "room_id": room_id,
            "created_by": user_id,
            "host_id": user_id,
            "max_players": max_players,
            "player_slots": player_slots,
            "current_players": [username],
            "room_type": room_type,
            "created_at": time.time(),
            "status": "waiting",
            "game_data": None
        }

        # Lưu vào Redis + set TTL
        save_room(room_id, room_data)

        return jsonify({"success": True, "room_id": room_id}), 201

    except Exception as e:
        print("Error creating room:", e)
        return jsonify({"error": str(e)}), 500

@app.route("/join-room/<room_id>", methods=["POST"])
@login_required
def join_room_handler(room_id):
    try:
        print(f"Attempting to join room {room_id}")
        room = get_room(room_id)
        if not room:
            print(f"Room {room_id} not found")
            return jsonify({"error": "Room not found"}), 404

        user_id = session.get("user_id")
        username = session.get("username")
        print(f"User {username} ({user_id}) attempting to join")

        # Kiểm tra user đã trong phòng chưa
        player_exists = False
        for slot in room["player_slots"]:
            if slot and slot["user_id"] == user_id:
                player_exists = True
                print(f"User already in room at slot {slot['slot']}")
                break

        if player_exists:
            return jsonify({"success": True, "message": "Already in room"}), 200

        # Kiểm tra còn slot trống không
        occupied_slots = [s for s in room["player_slots"] if s is not None]
        if len(occupied_slots) >= room["max_players"]:
            print("Room is full")
            return jsonify({"error": "Room is full"}), 403

        # Lấy thông tin user từ Firebase
        firebase_url = f"{FIREBASE_URL[:-5]}/{user_id}.json"
        user_data = {}
        try:
            response = requests.get(firebase_url)
            if response.status_code == 200:
                user_data = response.json() or {}
        except Exception as e:
            print(f"Error fetching user data: {e}")

        # Tìm slot trống đầu tiên
        slot_found = False
        for i, slot in enumerate(room["player_slots"]):
            if slot is None:
                room["player_slots"][i] = {
                    "username": username,
                    "user_id": user_id,
                    "slot": i,
                    "avatar": user_data.get("profilePicture", "/static/images/default-avatar.png"),
                    "score": user_data.get("stats", {}).get("point", 1000),
                    "is_host": False,
                    "is_ready": False
                }
                slot_found = True
                print(f"Added user to slot {i}")
                break

        if not slot_found:
            print("No empty slots found")
            return jsonify({"error": "No empty slots available"}), 403

        # Cập nhật current_players
        if username not in room["current_players"]:
            room["current_players"].append(username)

        # Lưu lại vào Redis
        save_room(room_id, room)
        print(f"Room data saved successfully")

        # Emit socket event
        socketio.emit("player_joined", {
            "room_id": room_id,
            "player_slots": room["player_slots"],
            "host_id": room["host_id"]
        }, room=room_id)

        return jsonify({
            "success": True,
            "message": "Joined room successfully",
            "room_data": room
        }), 200

    except Exception as e:
        print(f"Error joining room: {e}")
        return jsonify({"error": str(e)}), 500
    
def update_host(room):
    remaining = [slot for slot in room["player_slots"] if slot]
    if remaining:
        new_host = remaining[0]
        new_host["is_host"] = True
        room["host_id"] = new_host["user_id"]
    else:
        room["host_id"] = None
    
@app.route("/leave-room/<room_id>", methods=["POST"])
def leave_room(room_id):
    room_data = redis_client.get(f"room:{room_id}")
    if not room_data:
        return jsonify({"error": "Room does not exist"}), 404

    room = json.loads(room_data)
    user_id = session.get("user_id")
    username = session.get("username")

    # Tìm slot user
    left_slot_index = None
    was_host = False

    for i, slot in enumerate(room["player_slots"]):
        if slot and slot["user_id"] == user_id:
            left_slot_index = i
            was_host = slot.get("is_host", False)
            room["player_slots"][i] = None
            break

    if username in room["current_players"]:
        room["current_players"].remove(username)

    # Nếu còn người => chỉ đổi host nếu user này là host
    remaining_slots = [s for s in room["player_slots"] if s]
    if remaining_slots:
        if was_host:
            # Gán host cho người đầu (hoặc logic nào đó)
            new_host = remaining_slots[0]
            new_host["is_host"] = True
            room["host_id"] = new_host["user_id"]
        # Lưu
        redis_client.set(f"room:{room_id}", json.dumps(room))
        socketio.emit('player_left', {
            'room_id': room_id,
            'username': username,
            'player_slots': room["player_slots"],
            'current_players': room["current_players"],
            'new_host_id': room["host_id"] if was_host else None
        }, room=room_id)
    else:
        # Xóa phòng nếu không còn ai
        redis_client.delete(f"room:{room_id}")
        socketio.emit('room_deleted', {
            'room_id': room_id,
            'message': 'Room has been deleted'
        }, room=room_id)

    return jsonify({"success": True}), 200
    
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

@app.route("/anonymous-login", methods=["POST"])
def anonymous_login():
    data = request.get_json()
    username = data.get("username")

    if not username:
        return jsonify({"error": "Username is required."}), 400
    
    # Kiểm tra username trùng trong Firebase
    firebase_query_url = FIREBASE_URL
    response = requests.get(firebase_query_url)

    if response.status_code != 200:
        return jsonify({"error": "Failed to connect to database."}), 500

    users = response.json()
    if users:
        for user_id, user_data in users.items():
            if user_data.get("username") == username:
                return jsonify({"error": "Username already exists. Please choose another one."}), 400

    # Thiết lập session cho người dùng anonymous
    session.clear()
    session["username"] = username
    session["user_id"] = f"anonymous_{uuid.uuid4()}"  # Tạo ID ngẫu nhiên
    session["is_anonymous"] = True  # Đánh dấu là anonymous
    session["last_activity"] = time.time()

    return jsonify({"success": True})

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

@app.route("/google-login")
def google_login():
    authorization_code = request.args.get("code")
    if not authorization_code:
        return "Authorization code not provided", 400

    # Lấy Access Token từ Google
    token_url = "https://oauth2.googleapis.com/token"
    redirect_uri = url_for('google_login', _external=True, _scheme='https')
    token_data = {
        "code": authorization_code,
        "client_id": "35306778162-6i3q4jiron35lefs2t03fi82vd3i23or.apps.googleusercontent.com",
        "client_secret": "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",
        "redirect_uri": redirect_uri,
        #"redirect_uri": "http://127.0.0.1:5000/google-login",
        "grant_type": "authorization_code"
    }

    # http://127.0.0.1:5000
    # https://beatball.onrender.com

    token_response = requests.post(token_url, data=token_data)
    if token_response.status_code != 200:
        return "Failed to fetch access token", 500

    access_token = token_response.json().get("access_token")

    # Lấy thông tin người dùng qua Google People API
    people_api_url = "https://people.googleapis.com/v1/people/me?personFields=emailAddresses,names,photos"
    headers = {"Authorization": f"Bearer {access_token}"}
    people_response = requests.get(people_api_url, headers=headers)
    if people_response.status_code != 200:
        return "Failed to fetch user info", 500

    user_data = people_response.json()
    email = user_data.get("emailAddresses", [{}])[0].get("value")
    name = user_data.get("names", [{}])[0].get("displayName")
    photo = user_data.get("photos", [{}])[0].get("url", "/static/images/default-avatar.png")

    if not email:
        return "Failed to retrieve email", 400

    # Kiểm tra email trong Firebase
    firebase_query_url = FIREBASE_URL
    response = requests.get(firebase_query_url)
    if response.status_code != 200:
        return jsonify({"success": False, "error": "Failed to connect to database"}), 500

    users = response.json()
    user_found = False
    user_id = None

    if users:
        for uid, user_info in users.items():
            if user_info.get("email") == email:
                user_found = True
                user_id = uid
                break

    if user_found:
        # Nếu email đã tồn tại, đăng nhập
        session.clear()
        session["user_id"] = user_id
        session["username"] = users[user_id].get("username", email.split("@")[0])
        session["last_activity"] = time.time()
        return redirect(url_for("home"))

    # Nếu email không tồn tại, kiểm tra qua Abstract API
    abstract_api_url = f"https://emailvalidation.abstractapi.com/v1/?api_key=19e711b3ffc9421590f77650d28e4365&email={email}"
    abstract_response = requests.get(abstract_api_url)

    if abstract_response.status_code != 200:
        return jsonify({"success": False, "error": "Failed to validate email via Abstract API"}), 500

    email_validation = abstract_response.json()
    if email_validation.get("deliverability") == "DELIVERABLE":
        # Email hợp lệ, yêu cầu nhập username để đăng ký
        return render_template("google_register.html", email=email, name=name, photo=photo)
    else:
        # Email không hợp lệ
        return jsonify({"success": False, "error": "Email is invalid or not deliverable"}), 400
    
@app.route("/google-register", methods=["POST"])
def google_register():
    data = request.get_json()
    email = data.get("email")
    username = data.get("username")
    photo = data.get("photo", "/static/images/default-avatar.png")

    if not email or not username:
        return jsonify({"success": False, "error": "Email and username are required"}), 400

    # Kiểm tra username trùng lặp
    firebase_query_url = FIREBASE_URL
    response = requests.get(firebase_query_url)

    if response.status_code != 200:
        return jsonify({"success": False, "error": "Failed to connect to database"}), 500

    users = response.json()
    if users:
        for uid, user_data in users.items():
            if user_data.get("username") == username:
                return jsonify({"success": False, "error": "Username already exists"}), 400

    # Tạo tài khoản mới trong Firebase
    user_id = str(uuid.uuid4())
    user_data = {
        "email": email,
        "username": username,
        "profilePicture": photo,
        "createdAt": time.time(),
        "isActive": True,
        "stats": {
            "matches": 0,
            "win_matches": 0,
            "goals": 0,
            "assists": 0,
            "rating_change": 0,
            "point": 1000,
        },
    }

    firebase_user_url = f"{FIREBASE_URL[:-5]}/{user_id}.json"
    create_response = requests.put(firebase_user_url, json=user_data)

    if create_response.status_code == 200:
        session.clear()
        session["user_id"] = user_id
        session["username"] = username
        session["last_activity"] = time.time()
        return jsonify({"success": True, "redirect": url_for("home")})
    else:
        return jsonify({"success": False, "error": "Failed to create account"}), 500
    
def send_email(to_email, subject, body):
    """
    Gửi email xác thực đến người dùng.
    :param to_email: Địa chỉ email người nhận
    :param subject: Tiêu đề email
    :param body: Nội dung email
    """
    sender_email = "thangtranphu1412@gmail.com"  # Thay bằng email của bạn
    sender_password = "pptn xcsq xvrz uuvq"
    smtp_server = "smtp.gmail.com"

    # Tạo nội dung email
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = sender_email
    msg["To"] = to_email

    try:
        with smtplib.SMTP(smtp_server, 587) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, to_email, msg.as_string())
        print(f"Email sent successfully to {to_email}")
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")
    
@app.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json()
    email = data.get("email")

    if not email:
        return jsonify({"success": False, "error": "Email is required"}), 400

    # Tìm email trong Firebase
    firebase_query_url = FIREBASE_URL
    response = requests.get(firebase_query_url)

    if response.status_code != 200:
        return jsonify({"success": False, "error": "Failed to connect to database"}), 500

    users = response.json()
    for user_id, user_data in users.items():
        if user_data.get("email") == email:
            # Kiểm tra nếu tài khoản không có trường 'password'
            if "password" not in user_data:
                return jsonify({"success": False, "error": "This account is registered via Google and cannot reset password."}), 400

            # Gửi email xác thực nếu có trường 'password'
            reset_link = f"{request.host_url}reset-password/{user_id}"
            email_body = f"""
            Dear User,

            We received a request to reset your password. Click the link below to reset your password:
            {reset_link}

            If you did not make this request, please ignore this email.

            Best regards,
            The BeatBall Team
            """
            send_email(
                email,
                "Password Reset Request",
                email_body,
            )
            return jsonify({"success": True, "message": "Reset password link has been sent to your email."})

    # Nếu email không tồn tại trong database
    return jsonify({"success": False, "error": "Email not found"}), 404

@app.route("/reset-password/<user_id>", methods=["GET", "POST"])
def reset_password(user_id):
    if request.method == "POST":
        try:
            if not request.is_json:
                return jsonify({"success": False, "error": "Unsupported Media Type"}), 415

            data = request.get_json()
            hashed_password = data.get("password")

            if not hashed_password:
                return jsonify({"success": False, "error": "Password is required"}), 400

            # Firebase URL
            firebase_query_url = f"{FIREBASE_URL[:-5]}/{user_id}.json"
            print(f"Updating Firebase URL: {firebase_query_url}")

            # Ghi mật khẩu mới vào Firebase
            response = requests.patch(firebase_query_url, json={"password": hashed_password})
            print(f"Firebase Response: {response.status_code}, {response.text}")

            if response.status_code == 200:
                session.clear()  # Xóa session hiện tại
                return jsonify({"success": True, "redirect": url_for('login')})
            else:
                return jsonify({"success": False, "error": "Failed to update password"}), 500
        except Exception as e:
            print(f"Error resetting password: {e}")
            return jsonify({"success": False, "error": "Internal server error"}), 500

    return render_template("reset_password.html", user_id=user_id)

@app.route("/logout")
def logout():
    session.clear()  # Xóa toàn bộ session
    flash("You have been logged out.", "info")
    return redirect(url_for("main"))

@app.route("/room/<room_id>")
@login_required
def room(room_id):
    try:
        room_data = redis_client.get(f"room:{room_id}")
        if not room_data:
            flash("Room does not exist.", "danger")
            return redirect(url_for("home"))

        room = json.loads(room_data)
        user_id = session.get("user_id")
        username = session.get("username")

        # Kiểm tra user đã tồn tại trong room chưa
        player_exists = any(slot and slot["user_id"] == user_id for slot in room["player_slots"])

        if not player_exists:
            # User chưa có => đưa vào slot trống
            for i, slot in enumerate(room["player_slots"]):
                if slot is None:
                    room["player_slots"][i] = {
                        "username": username,
                        "user_id": user_id,
                        "slot": i,
                        "avatar": "/static/images/default-avatar.png",
                        "score": 1000,
                        "is_host": (user_id == room["host_id"]),  # Giữ host nếu user_id == host_id
                        "is_ready": False,
                    }
                    # Thêm username vào current_players
                    if username not in room["current_players"]:
                        room["current_players"].append(username)
                    break

        # Lưu room
        redis_client.set(f"room:{room_id}", json.dumps(room))

        # Cập nhật session
        session["current_room"] = room_id

        if int(room_id) < 550000:
            return render_template("room_2.html", room_id=room_id, room=room, session=session)
        else:
            return render_template("room_4.html", room_id=room_id, room=room, session=session)

    except Exception as e:
        print(f"Error accessing room: {e}")
        flash("An error occurred while accessing the room.", "error")
        return redirect(url_for("home"))
    
@app.route("/room-data/<room_id>", methods=["GET"])
@login_required
def get_room_data(room_id):
    try:
        print(f"Fetching data for room {room_id}")
        current_user_id = session.get("user_id")

        room_data = redis_client.get(f"room:{room_id}")
        if not room_data:
            return jsonify({"error": "Room not found"}), 404

        room = json.loads(room_data)
        
        # Đồng bộ host_id
        sync_room_host(room_id)
        
        # Cập nhật thông tin người chơi từ Firebase
        for slot in room["player_slots"]:
            if slot:
                try:
                    firebase_response = requests.get(f"{FIREBASE_URL[:-5]}/{slot['user_id']}.json")
                    if firebase_response.status_code == 200:
                        user_data = firebase_response.json()
                        slot.update({
                            "avatar": user_data.get("profilePicture", "/static/images/default-avatar.png"),
                            "score": user_data.get("stats", {}).get("point", 1000),
                        })
                except Exception as e:
                    print(f"Error updating player data: {e}")

        # Lưu lại vào Redis
        redis_client.set(f"room:{room_id}", json.dumps(room))

        print(f"Room {room_id} data:")
        print(f"Host ID: {room['host_id']}")
        print(f"Current user ID: {current_user_id}")
        print(f"Player slots: {json.dumps(room['player_slots'], indent=2)}")

        return jsonify({
            "success": True,
            "player_slots": room["player_slots"],
            "host_id": room["host_id"]
        })

    except Exception as e:
        print(f"Error getting room data: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/check-room/<room_id>", methods=["GET"])
@login_required
def check_room(room_id):
    # Lấy thông tin phòng từ Redis
    room_data = redis_client.get(f"room:{room_id}")
    if not room_data:
        return jsonify({"exists": False}), 404

    room = json.loads(room_data)

    # Thay vì dựa vào room["current_players"],
    # ta kiểm tra xem player_slots còn ai không.
    player_slots = room.get("player_slots", [])
    actual_players = [slot for slot in player_slots if slot is not None]

    if len(actual_players) == 0:
        print(f"Room {room_id} has no players in player_slots. Deleting the room.")
        redis_client.delete(f"room:{room_id}")
        return jsonify({"exists": False}), 404

    return jsonify({"exists": True}), 200

@app.route("/get-user-stats")
@login_required
def get_user_stats():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "User not logged in"}), 401

    firebase_query_url = f"{FIREBASE_URL[:-5]}/{user_id}.json"
    
    try:
        response = requests.get(firebase_query_url)
        
        if response.status_code == 200:
            user_data = response.json()
            if not user_data:
                return jsonify({"error": "User data not found"}), 404
            
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
            ga_ratio = round((goals / max(assists, 1)), 2)  # Tránh chia cho 0
            
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
        
        else:
            return jsonify({"error": f"Failed to fetch stats. Status code: {response.status_code}"}), 500
    
    except requests.exceptions.RequestException as e:
        print(f"Error fetching stats for user {user_id}: {e}")
        return jsonify({"error": "Failed to connect to the database"}), 500

    except Exception as e:
        print(f"Unexpected error in get_user_stats: {e}")
        return jsonify({"error": "Internal server error"}), 500

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

@socketio.on("join_room")
def handle_socket_join(data):
    """
    Khi client socket kết nối vào 1 room, join_room(...) 
    để server có thể broadcast qua socket theo room_id.
    """
    try:
        room_id = data.get("room_id")
        if room_id:
            join_room(room_id)
            # Gia hạn TTL cho room
            redis_client.expire(f"room:{room_id}", ROOM_TTL)
    except Exception as e:
        print("Error in handle_socket_join:", e)

@socketio.on("disconnect")
def on_disconnect():
    """
    Logic khi socket bị disconnect. 
    Nếu cần, bạn có thể fetch session["current_room"] để xử lý 
    (tuy nhiên cẩn thận reload vs out thật).
    """
    pass
    # Tùy nhu cầu, có thể gọi leave_room... 
    # Nhưng bạn đã gọi fetch("/leave-room/...") bên client 
    # khi user out (không reload).
    # Tránh xung đột double-call.

def save_room_data(room_id, room_data):
    """
    Lưu thông tin phòng vào Redis
    """
    try:
        redis_client.set(f"room:{room_id}", json.dumps(room_data))
        print(f"Saved room data for room {room_id}: {room_data}")
        return True
    except Exception as e:
        print(f"Error saving room data: {e}")
        return False

def get_room_data(room_id):
    """
    Lấy thông tin phòng từ Redis
    """
    try:
        room_data = redis_client.get(f"room:{room_id}")
        if room_data:
            return json.loads(room_data)
        return None
    except Exception as e:
        print(f"Error getting room data: {e}")
        return None

def can_start_game(room_data):
    if not room_data:
        return False
    
    try:
        # Lấy danh sách người chơi thực sự trong từng team
        team1 = [player for i, player in enumerate(room_data['player_slots']) 
                if player and i < 2 and player['username'] != 'Waiting...']
        team2 = [player for i, player in enumerate(room_data['player_slots']) 
                if player and i >= 2 and player['username'] != 'Waiting...']

        # Kiểm tra mỗi đội có ít nhất 1 người
        if len(team1) == 0 or len(team2) == 0:
            return False

        # Đếm tổng số người chơi và số người ready
        total_players = len(team1) + len(team2)
        ready_count = sum(1 for player in room_data['player_slots'] 
                         if player and player.get('is_ready', False))
        
        # Tính số người cần ready (trừ host)
        host_id = room_data.get('host_id')
        non_host_count = sum(1 for player in room_data['player_slots']
                            if player and player['user_id'] != host_id)

        # Kiểm tra tất cả người chơi không phải host đã ready chưa
        return ready_count == non_host_count

    except Exception as e:
        print(f"Error in can_start_game: {e}")
        return False

@socketio.on('player_ready')
def handle_player_ready(data):
    try:
        room_id = data['room_id']
        username = data['username']
        is_ready = data['is_ready']
        
        room_data = get_room(room_id)
        if not room_data:
            return
        
        # Cập nhật trạng thái ready cho player
        for player in room_data['player_slots']:
            if player and player.get('username') == username:
                player['is_ready'] = is_ready
                break
        
        # Kiểm tra điều kiện start game
        can_start = can_start_game(room_data)
        
        # Lưu room data
        save_room(room_id, room_data)
        
        # Emit event cập nhật UI
        socketio.emit('player_ready_update', {
            'username': username,
            'is_ready': is_ready,
            'can_start': can_start
        }, room=room_id)
        
    except Exception as e:
        print(f"Error handling player ready: {e}")

@socketio.on('start_game')
def handle_start_game(data):
    try:
        room_id = data['room_id']
        room = get_room(room_id)
        
        if not can_start_game(room):
            emit('game_error', {'message': 'Cannot start game'}, room=room_id)
            return

        # Prepare player data
        player_data = []
        for i, slot in enumerate(room['player_slots']):
            if slot:
                player_data.append({
                    'id': slot['user_id'],
                    'username': slot['username'],
                    'team': 'left' if i < 2 else 'right',
                    'position': i
                })

        # Create game server on K8s
        server_info = game_manager.create_physics_server(room_id, player_data)

        # Save game info to Redis
        game_data = {
            'server_url': f"{server_info['server_url']}:{server_info['port']}",
            'room_id': room_id,
            'status': 'initializing',
            'players': player_data
        }
        redis_client.set(f"game:{room_id}", json.dumps(game_data))

        # Notify clients
        emit('game_created', {
            'game_url': game_data['server_url'],
            'room_id': room_id,
            'game_data': json.dumps(player_data)
        }, room=room_id)

    except Exception as e:
        print(f"Error starting game: {e}")
        emit('game_error', {'message': str(e)}, room=room_id)

def initialize_game(room_data):
    """
    Khởi tạo trạng thái game mới
    """
    # Lấy danh sách người chơi (không bao gồm slot trống)
    players = [p for p in room_data['player_slots'] if p is not None]
    
    game_state = {
        'players': players,
        'current_turn': 0,  # Index của người chơi đầu tiên
        'status': 'playing',
        'start_time': time.time(),
        # Thêm các thông tin khác tùy theo logic game của bạn
    }
    
    return game_state

@socketio.on('join_game')
def handle_join_game(data):
    """Handle player joining game"""
    room_id = data['room_id']
    player_id = data['player_id']
    
    game = game_manager.get_game(room_id)
    if not game:
        # Get player data from Redis
        game_data = redis_client.get(f"game:{room_id}")
        if game_data:
            game_data = json.loads(game_data)
            game = game_manager.create_game(room_id, game_data['players'])
    
    if game:
        emit('game_state', game.get_state())

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('player_input')
def handle_input(data):
    game = get_game_instance(data['room_id'])
    if game:
        game.handle_player_input(data['player_id'], data['input'])
        emit('game_state', game.get_state(), room=data['room_id'])

def game_loop():
    while True:
        current_time = time.time()
        delta_time = current_time - last_update
        
        Game.update(delta_time)
        socketio.emit('game_state', Game.get_state())
        
        last_update = current_time
        time.sleep(1/60)  # 60 FPS

@app.route('/game/<room_id>')
@login_required
def game_page(room_id):
    try:
        # Lấy thông tin game từ Redis
        game_data = redis_client.get(f"game:{room_id}")
        if not game_data:
            flash('Game not found!', 'error')
            return redirect(url_for('home'))
        print(f"Game data from Redis: {game_data}")  # Debug log

            
        game_info = json.loads(game_data)
        room = get_room(room_id)
        current_user_id = session.get('user_id')
        
        team_data = {
            'left': [],
            'right': []
        }
        
        for i, slot in enumerate(room['player_slots']):
            if slot:
                team = 'left' if i < 2 else 'right'
                player_data = {
                    'id': slot['user_id'],
                    'username': slot['username'],
                    'score': slot.get('score', 1000)
                }
                team_data[team].append(player_data)
        
        user_team = None
        for i, slot in enumerate(room['player_slots']):
            if slot and slot['user_id'] == current_user_id:
                user_team = 'left' if i < 2 else 'right'
                break

        return render_template('clientGame.html',
                             room_id=room_id,
                             game_data=team_data,
                             user_team=user_team or '',
                             user_id=current_user_id,
                             server_url=game_info['server_url'])  # Thêm server_url

    except Exception as e:
        print(f"Error loading game page: {e}")
        flash('Error loading game!', 'error')
        return redirect(url_for('home'))

def sync_room_host(room_id):
    room_data = redis_client.get(f"room:{room_id}")
    if not room_data:
        return

    room = json.loads(room_data)
    if not room.get("host_id"):
        # Nếu chưa có host => lấy người đầu
        remaining = [slot for slot in room["player_slots"] if slot]
        if remaining:
            new_host = remaining[0]
            room["host_id"] = new_host["user_id"]
            new_host["is_host"] = True
        else:
            room["host_id"] = None
    else:
        # Kiểm tra người host cũ còn trong room ko
        host_in_room = any(slot and slot["user_id"] == room["host_id"] for slot in room["player_slots"])
        if not host_in_room:
            # Host cũ rời => pick host mới
            remaining = [slot for slot in room["player_slots"] if slot]
            if remaining:
                new_host = remaining[0]
                room["host_id"] = new_host["user_id"]
                new_host["is_host"] = True
            else:
                room["host_id"] = None

    # Cập nhật is_host = True/False
    for slot in room["player_slots"]:
        if slot:
            slot["is_host"] = (slot["user_id"] == room["host_id"])
    
    # Lưu
    redis_client.set(f"room:{room_id}", json.dumps(room))
    socketio.emit("host_update", {
        "room_id": room_id,
        "host_id": room["host_id"],
        "player_slots": room["player_slots"]
    }, room=room_id)

@socketio.on('swap_slots')
def handle_swap_slots(data):
    try:
        room_id = data.get('room_id')
        from_slot = data.get('from_slot') 
        to_slot = data.get('to_slot')

        if from_slot == to_slot:
            return

        room = get_room(room_id)
        if not room:
            emit('error', {'message': 'Room not found'}, room=room_id)
            return
        
        # Cho phép swap cả khi slot đích trống
        player_from = room["player_slots"][from_slot]
        room["player_slots"][from_slot] = room["player_slots"][to_slot]  # Có thể là None
        room["player_slots"][to_slot] = player_from

        # Cập nhật slot index cho player (nếu có)
        if room["player_slots"][from_slot]:
            room["player_slots"][from_slot]["slot"] = from_slot
        if room["player_slots"][to_slot]:
            room["player_slots"][to_slot]["slot"] = to_slot

        save_room(room_id, room)

        print(f"Room {room_id} - Swapped slots: {from_slot} <-> {to_slot}")
        print(f"Updated slots: {room['player_slots']}")

        emit('slots_swapped', {
            'player_slots': room["player_slots"]
        }, room=room_id)

    except Exception as e:
        print("Error swapping slots:", e)

@app.route('/kick-player', methods=['POST'])
@login_required
def kick_player():
    """
    Xử lý yêu cầu kick một người chơi.
    """
    try:
        data = request.get_json()
        room_id = data.get('room_id')
        user_id_to_kick = data.get('user_id')

        room = get_room(room_id)
        if not room:
            return jsonify({"error": "Room not found"}), 404

        # Kiểm tra quyền host
        if room["host_id"] != session.get('user_id'):
            return jsonify({"error": "Only the host can kick players"}), 403

        # Tìm và xóa người chơi khỏi slot
        for i, slot in enumerate(room["player_slots"]):
            if slot and slot["user_id"] == user_id_to_kick:
                room["player_slots"][i] = None
                break

        # Xóa khỏi danh sách current_players
        room["current_players"] = [
            player for player in room["current_players"]
            if player["user_id"] != user_id_to_kick
        ]

        # Lưu lại room
        save_room(room_id, room)

        # Thông báo tới client
        socketio.emit("player_kicked", {
            "room_id": room_id,
            "user_id": user_id_to_kick,
            "player_slots": room["player_slots"]
        }, room=room_id)

        return jsonify({"success": True}), 200

    except Exception as e:
        print(f"Error kicking player: {e}")
        return jsonify({"error": "Failed to kick player"}), 500
    
if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))  # Render sẽ cung cấp cổng qua biến môi trường PORT
    socketio.run(app, host='0.0.0.0', port=port)
    #socketio.run(app, debug=True)
