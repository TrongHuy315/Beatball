import eventlet
eventlet.monkey_patch()  # Monkey patch phải được gọi trước tất cả các import khác

from flask import Flask, render_template, request, redirect, url_for, flash
from flask import send_from_directory, session, jsonify, make_response
from flask_socketio import SocketIO, emit
from functools import wraps
from werkzeug.utils import secure_filename
from urllib.parse import quote
from werkzeug.security import generate_password_hash
from email.mime.text import MIMEText
import os
import time
import  uuid
import random
import requests
import smtplib
import redis
import json

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
    try:
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
            if not redis_client.exists(f"room:{room_id}"):  # Đảm bảo ID không bị trùng trong Redis
                break

        user_id = session.get("user_id")
        username = session.get("username")

        # Thông tin phòng
        player_slots = [None] * max_players  # Tạo danh sách vị trí người chơi cố định
        player_slots[0] = {
            "username": username,
            "is_host": True
        }  # Người tạo phòng ở vị trí đầu tiên

        room_data = {
            "created_by": user_id,
            "host_id": user_id,  # Thêm host_id giống với created_by
            "max_players": max_players,
            "player_slots": player_slots,
            "current_players": [username],
            "is_active": True,
            "room_type": room_type,
        }

        # Lưu thông tin phòng vào Redis
        redis_client.set(f"room:{room_id}", json.dumps(room_data))

        print(f"Room {room_id} created successfully by {username} (ID: {user_id})")

        return jsonify({
            "message": "Room created successfully.",
            "room_id": room_id,
            "player_slots": player_slots
        }), 201
    except Exception as e:
        print(f"Error creating room: {e}")
        return jsonify({"error": "Failed to create room."}), 500

@app.route("/join-room/<room_id>", methods=["POST"])
@login_required
def join_room(room_id):
    try:
        room_data = redis_client.get(f"room:{room_id}")
        if not room_data:
            return jsonify({"error": "Room does not exist."}), 404

        room = json.loads(room_data)
        username = session.get("username")
        user_id = session.get("user_id")

        # Kiểm tra xem người chơi đã có trong phòng chưa
        existing_slot = None
        for i, slot in enumerate(room["player_slots"]):
            if slot and slot.get("username") == username:
                existing_slot = i
                break

        # Nếu người chơi đã có trong phòng, trả về thông tin hiện tại
        if existing_slot is not None:
            return jsonify({
                "message": "Already in room.",
                "player_slots": room["player_slots"]
            }), 200

        # Nếu phòng đã đầy
        if len([p for p in room["player_slots"] if p is not None]) >= room["max_players"]:
            return jsonify({"error": "Room is full."}), 403

        # Tìm slot trống đầu tiên
        empty_slot = next((i for i, slot in enumerate(room["player_slots"]) if slot is None), None)
        if empty_slot is None:
            return jsonify({"error": "No available slots."}), 403

        # Lấy thông tin người chơi từ Firebase
        firebase_response = requests.get(FIREBASE_URL)
        if firebase_response.status_code != 200:
            return jsonify({"error": "Failed to fetch user data"}), 500

        users = firebase_response.json()
        user_data = None
        for u_data in users.values():
            if u_data.get("username") == username:
                user_data = u_data
                break

        if not user_data:
            return jsonify({"error": "User data not found"}), 404

        # Thêm người chơi vào slot
        player_info = {
            "username": username,
            "user_id": user_id,
            "slot": empty_slot,
            "avatar": user_data.get("profilePicture", "/static/images/default-avatar.png"),
            "score": user_data.get("stats", {}).get("point", 1000),
            "is_host": len([p for p in room["player_slots"] if p is not None]) == 0,
            "is_ready": False
        }

        room["player_slots"][empty_slot] = player_info
        if username not in room["current_players"]:
            room["current_players"].append(username)

        # Cập nhật Redis
        redis_client.set(f"room:{room_id}", json.dumps(room))

        # Thông báo qua Socket.IO
        socketio.emit('player_joined', {
            'room_id': room_id,
            'player_info': player_info,
            'player_slots': room["player_slots"]
        }, room=room_id)

        return jsonify({
            "message": "Successfully joined room.",
            "player_slots": room["player_slots"]
        }), 200

    except Exception as e:
        print(f"Error joining room: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/leave-room/<room_id>", methods=["POST"])
@login_required
def leave_room(room_id):
    try:
        room_data = redis_client.get(f"room:{room_id}")
        if not room_data:
            return jsonify({"error": "Room does not exist."}), 404

        room = json.loads(room_data)
        username = session.get("username")

        # Tìm và xóa thông tin người chơi khỏi slot
        slot_index = None
        for i, slot in enumerate(room["player_slots"]):
            if slot and slot.get("username") == username:
                slot_index = i
                room["player_slots"][i] = None
                break

        if slot_index is not None and username in room["current_players"]:
            room["current_players"].remove(username)

            # Nếu còn người chơi khác trong phòng
            remaining_players = [p for p in room["player_slots"] if p is not None]
            if remaining_players:
                # Nếu người rời phòng là host, chọn host mới
                was_host = slot_index == 0 or (slot_index is not None and room["player_slots"][slot_index] and room["player_slots"][slot_index].get("is_host", False))
                if was_host:
                    # Chọn người chơi đầu tiên còn lại làm host mới
                    new_host = remaining_players[0]
                    new_host["is_host"] = True
                    room["host_id"] = new_host.get("user_id")
                    new_host_id = new_host.get("user_id")
                else:
                    new_host_id = None

                # Cập nhật Redis
                redis_client.set(f"room:{room_id}", json.dumps(room))
                
                # Thông báo cho tất cả người chơi
                socketio.emit('player_left', {
                    'room_id': room_id,
                    'username': username,
                    'player_slots': room["player_slots"],
                    'current_players': room["current_players"],
                    'new_host_id': new_host_id
                }, room=room_id)
            else:
                # Xóa phòng nếu không còn ai
                redis_client.delete(f"room:{room_id}")
                socketio.emit('room_deleted', {'room_id': room_id}, broadcast=True)

        return jsonify({"success": True}), 200

    except Exception as e:
        print(f"Error in leave_room: {e}")
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
    # Lấy thông tin phòng từ Redis
    room_data = redis_client.get(f"room:{room_id}")
    if not room_data:
        flash("Room does not exist.", "danger")
        return redirect(url_for("home"))

    room = json.loads(room_data)
    username = session.get("username")

    # Kiểm tra nếu người dùng đã có trong phòng (tab trùng)
    if username not in room["current_players"]:
        if len(room["current_players"]) < room["max_players"]:
            room["current_players"].append(username)
        else:
            flash("Room is full.", "danger")
            return redirect(url_for("home"))

    # Lưu lại trạng thái phòng vào Redis
    redis_client.set(f"room:{room_id}", json.dumps(room))

    # Lưu thông tin phòng hiện tại vào session
    session['current_room'] = room_id

    # Xác định template dựa trên room_id
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
    
@app.route("/room-data/<room_id>", methods=["GET"])
@login_required
def get_room_data(room_id):
    try:
        print(f"Fetching data for room {room_id}")
        
        room_data = redis_client.get(f"room:{room_id}")
        if not room_data:
            print(f"Room {room_id} not found in Redis")
            return jsonify({"error": "Room does not exist"}), 404

        try:
            room = json.loads(room_data)
            print(f"Room data loaded: {room}")
        except json.JSONDecodeError as e:
            print(f"Error decoding room data: {e}")
            return jsonify({"error": "Invalid room data"}), 500

        # Kiểm tra kiểu dữ liệu của room
        if not isinstance(room, dict):
            print(f"Invalid room data type: {type(room)}")
            return jsonify({"error": "Invalid room data structure"}), 500

        # Lấy max_players với giá trị mặc định là 4
        max_players = int(room.get("max_players", 4))
        player_slots = [None] * max_players

        # Kiểm tra và lấy danh sách người chơi
        current_players = room.get("current_players", [])
        if not isinstance(current_players, list):
            print(f"Invalid current_players type: {type(current_players)}")
            current_players = []

        # Lấy thông tin từ Firebase
        firebase_response = requests.get(FIREBASE_URL)
        if firebase_response.status_code != 200:
            print(f"Firebase request failed: {firebase_response.status_code}")
            return jsonify({"error": "Failed to fetch user data"}), 500

        users = firebase_response.json()
        if not isinstance(users, dict):
            print(f"Invalid users data type: {type(users)}")
            users = {}

        # Xử lý player_slots
        for username in current_players:
            # Tìm thông tin user trong Firebase
            user_data = None
            for user_info in users.values():
                if isinstance(user_info, dict) and user_info.get("username") == username:
                    user_data = user_info
                    break

            if user_data:
                # Tìm slot trống đầu tiên hoặc slot có username tương ứng
                for i in range(max_players):
                    current_slot = player_slots[i]
                    if current_slot is None or (isinstance(current_slot, dict) and current_slot.get("username") == username):
                        player_slots[i] = {
                            "username": username,
                            "avatar": user_data.get("profilePicture", "/static/images/default-avatar.png"),
                            "score": user_data.get("stats", {}).get("point", 1000)
                        }
                        break

        # Log kết quả cuối cùng
        print(f"Final player_slots: {player_slots}")
        
        # Cập nhật lại Redis với player_slots mới
        room["player_slots"] = player_slots
        redis_client.set(f"room:{room_id}", json.dumps(room))

        return jsonify(player_slots)

    except Exception as e:
        print(f"Unexpected error in get_room_data: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/check-room/<room_id>", methods=["GET"])
@login_required
def check_room(room_id):
    # Lấy thông tin phòng từ Redis
    room_data = redis_client.get(f"room:{room_id}")
    if not room_data:
        return jsonify({"exists": False}), 404

    room = json.loads(room_data)

    # Kiểm tra phòng có người chơi không
    if not room.get("current_players"):
        print(f"Room {room_id} has no players. Deleting the room.")  # Debugging log
        redis_client.delete(f"room:{room_id}")
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

@socketio.on("join_room")
def handle_join_room(data):
    room_id = data.get("room_id")
    username = session.get("username")

    if not username:
        return

    room_data = redis_client.get(f"room:{room_id}")
    if not room_data:
        emit("error", {"error": "Room does not exist."}, to=request.sid)
        return

    room = json.loads(room_data)

    # Kiểm tra và thêm người chơi nếu chưa có trong phòng
    if username not in room["current_players"]:
        if len(room["current_players"]) < room["max_players"]:
            room["current_players"].append(username)
            redis_client.set(f"room:{room_id}", json.dumps(room))
            
            # Emit event với danh sách người chơi mới
            socketio.emit('player_joined', {
                'room_id': room_id,
                'username': username,
                'current_players': room["current_players"]
            }, room=room_id)
        else:
            emit("error", {"error": "Room is full."}, to=request.sid)
            return

    # Join socket room
    join_room(room_id)

@socketio.on('disconnect')
def on_disconnect():
    if 'current_room' in session:
        room_id = session['current_room']
        room_data = redis_client.get(f"room:{room_id}")

        if room_data:
            room = json.loads(room_data)
            username = session.get('username')
            user_tabs = room.get("user_tabs", {})

            # Chỉ xử lý khi thực sự rời phòng, không phải reload
            if request.headers.get("Connection") == "close":
                if username in room["current_players"]:
                    room["current_players"].remove(username)
                    
                    # Xóa phòng nếu không còn người chơi
                    if len(room["current_players"]) == 0:
                        redis_client.delete(f"room:{room_id}")
                        socketio.emit('room_deleted', {
                            'room_id': room_id,
                            'message': 'Room has been deleted'
                        }, broadcast=True)
                    else:
                        # Cập nhật lại thông tin phòng trong Redis
                        redis_client.set(f"room:{room_id}", json.dumps(room))
                        
                        # Thông báo cho các người chơi khác
                        socketio.emit('player_left', {
                            'room_id': room_id,
                            'username': username,
                            'remaining_players': room["current_players"]
                        }, room=room_id)

# Trong file app.py hoặc game_handlers.py

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
    """
    Kiểm tra điều kiện để bắt đầu game
    """
    if not room_data:
        return False
    
    try:
        # Lấy số người chơi hiện tại (không tính slot trống)
        current_players = [p for p in room_data['player_slots'] if p is not None]
        min_players = 2  # Số người chơi tối thiểu
        
        # Kiểm tra số lượng người chơi
        if len(current_players) < min_players:
            return False
        
        # Kiểm tra tất cả người chơi đã ready (trừ host)
        host_username = None
        for player in current_players:
            if player.get('is_host'):
                host_username = player.get('username')
                break
        
        # Kiểm tra trạng thái ready của tất cả người chơi (trừ host)
        for player in current_players:
            if player.get('username') != host_username and not player.get('is_ready', False):
                return False
        
        return True
        
    except Exception as e:
        print(f"Error checking game start conditions: {e}")
        return False

@socketio.on('player_ready')
def handle_player_ready(data):
    """
    Xử lý khi người chơi nhấn Ready
    """
    try:
        room_id = data['room_id']
        username = data['username']
        is_ready = data['is_ready']
        
        # Lấy thông tin phòng
        room_data = get_room_data(room_id)
        if not room_data:
            return
        
        # Cập nhật trạng thái ready cho người chơi
        for player in room_data['player_slots']:
            if player and player.get('username') == username:
                player['is_ready'] = is_ready
                break
        
        # Lưu thông tin phòng đã cập nhật
        if save_room_data(room_id, room_data):
            # Gửi thông báo cập nhật cho tất cả người chơi trong phòng
            emit('player_ready_update', {
                'username': username,
                'is_ready': is_ready,
                'can_start': can_start_game(room_data)  # Thêm thông tin có thể start game không
            }, room=room_id)
            
            print(f"Player {username} {'ready' if is_ready else 'cancelled ready'} in room {room_id}")
    
    except Exception as e:
        print(f"Error handling player ready: {e}")

@socketio.on('start_game')
def handle_start_game(data):
    """
    Xử lý khi host nhấn Start Game
    """
    try:
        room_id = data['room_id']
        room_data = get_room_data(room_id)
        
        # Kiểm tra điều kiện start game
        if not can_start_game(room_data):
            emit('game_error', {
                'message': 'Cannot start game. Not all players are ready.'
            }, room=room_id)
            return
        
        # Khởi tạo trạng thái game
        game_state = initialize_game(room_data)
        
        # Lưu trạng thái game vào Redis
        redis_client.set(f"game:{room_id}", json.dumps(game_state))
        
        # Cập nhật trạng thái phòng
        room_data['game_state'] = 'playing'
        save_room_data(room_id, room_data)
        
        # Thông báo game bắt đầu cho tất cả người chơi
        emit('game_started', {
            'game_state': game_state,
            'message': 'Game is starting!'
        }, room=room_id)
        
        print(f"Game started in room {room_id}")
        
    except Exception as e:
        print(f"Error starting game: {e}")
        emit('game_error', {
            'message': 'Failed to start game. Please try again.'
        }, room=room_id)

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

# Trong app.py hoặc routes.py

@app.route('/game/<room_id>')
@login_required
def game_page(room_id):
    """
    Render trang game
    """
    try:
        # Lấy thông tin phòng
        room_data = get_room_data(room_id)
        if not room_data:
            flash('Room not found!', 'error')
            return redirect(url_for('rooms'))
            
        # Kiểm tra người dùng có trong phòng không
        current_user_id = session.get('user_id')
        if not any(p and p.get('user_id') == current_user_id 
                  for p in room_data['player_slots']):
            flash('You are not in this room!', 'error')
            return redirect(url_for('rooms'))
            
        # Render trang game
        return render_template('game.html', 
                             room_id=room_id,
                             room_data=room_data)
                             
    except Exception as e:
        print(f"Error loading game page: {e}")
        flash('Error loading game!', 'error')
        return redirect(url_for('rooms'))
    
# app.py

@socketio.on('swap_slots')
def handle_swap_slots(data):
    try:
        room_id = data['room_id']
        from_slot = data['from_slot']
        to_slot = data['to_slot']

        room_data = redis_client.get(f"room:{room_id}")
        if not room_data:
            return

        room = json.loads(room_data)
        
        # Swap vị trí người chơi
        room["player_slots"][from_slot], room["player_slots"][to_slot] = \
            room["player_slots"][to_slot], room["player_slots"][from_slot]

        # Cập nhật slot number trong thông tin người chơi
        if room["player_slots"][from_slot]:
            room["player_slots"][from_slot]["slot"] = from_slot
        if room["player_slots"][to_slot]:
            room["player_slots"][to_slot]["slot"] = to_slot

        # Lưu thay đổi vào Redis
        redis_client.set(f"room:{room_id}", json.dumps(room))

        # Thông báo cho tất cả người chơi về việc thay đổi vị trí
        emit('slots_swapped', {
            'player_slots': room["player_slots"]
        }, room=room_id)

    except Exception as e:
        print(f"Error swapping slots: {e}")

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))  # Render sẽ cung cấp cổng qua biến môi trường PORT
    socketio.run(app, host='0.0.0.0', port=port)
    #socketio.run(app, debug=True)
