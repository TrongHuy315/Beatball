import eventlet
eventlet.monkey_patch()

from flask import Flask, render_template, request, redirect, url_for, flash
from flask_socketio import SocketIO, emit

app = Flask(__name__)
socketio = SocketIO(app)

socketio = SocketIO(app, async_mode='eventlet')

app.secret_key = 'BeatBall@xyz'

@app.route("/")
def main():
    return render_template("index.html")

@app.route("/home")
def home():
    return render_template("home.html")

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

if __name__ == "__main__":
    socketio.run(app, debug=True)
