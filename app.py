from flask import Flask, render_template, request, redirect, url_for, flash

app = Flask(__name__)

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

if __name__ == "__main__":
    app.run(debug=True)

