from flask import Flask, render_template, send_from_directory

app = Flask(__name__)

# Route to render the leaderboard HTML
@app.route("/leaderboard")
def leaderboard():
    return render_template("leaderboard.html")

@app.route("/main")
def mainUI():
    return render_template("mainUI.html")

# Route to serve UserData.txt dynamically
@app.route("/data")
def fetch_data():
    return send_from_directory("static", "leaderboard/UserData.txt")

# Exit page route
@app.route("/exit")
def exit_page():
    return "You have exited!"

if __name__ == "__main__":
    app.run(debug=True)
