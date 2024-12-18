import eventlet
eventlet.monkey_patch()  # Monkey patch phải được gọi trước tất cả các import khác

from flask import Flask, render_template, request, redirect, url_for, flash
from flask import send_from_directory
from flask_socketio import SocketIO, emit
import os

app = Flask(__name__)
socketio = SocketIO(app)

socketio = SocketIO(app, cors_allowed_origins=['https://beatball.onrender.com'])

app.secret_key = 'BeatBall@xyz'

@app.route("/")
def main():
    return render_template("index.html")

@app.route("/home")
def home():
    return render_template("home.html")

@app.route("/login")
def login():
    return render_template("login.html")

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
    port = int(os.environ.get('PORT', 5000))  # Render sẽ cung cấp cổng qua biến môi trường PORT
    socketio.run(app, host='0.0.0.0', port=port)
    #socketio.run(app, debug=True)
