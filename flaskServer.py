# from flask import Flask, request
# from flask_socketio import SocketIO
# import socketio as client_socketio

# app = Flask(__name__)
# socketio = SocketIO(app, cors_allowed_origins="*")

# physics_client = client_socketio.Client()
# physics_client.connect('http://localhost:3001')

# @socketio.on('connect')
# def handle_connect():


# @socketio.on('move_player')
# def handle_move(data):
#     physics_client.emit('player_move', {
#         'player_id': request.sid,
#         'force': data['force']
#     })


# @physics_client.on('sendGameState')
# def handle_game_state(data):
#     socketio.emit('sendGameState', data)

# if __name__ == '__main__':
#     socketio.run(app, port=5000)