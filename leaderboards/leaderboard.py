from flask import Flask, render_template, send_from_directory

app = Flask(__name__)

# Route to render the leaderboard HTML
@app.route("/")
def leaderboard():
    return render_template("leaderboard.html")

# Route to serve UserData.txt dynamically
@app.route("/data")
def fetch_data():
    return send_from_directory("static", "UserData.txt")

# Exit page route
@app.route("/exit")
def exit_page():
    return "You have exited!"

if __name__ == "__main__":
    app.run(debug=True)
