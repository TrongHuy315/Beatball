const Matter = require('matter-js');
const path = require('path');
const Wall = require('./matter/wall.js');
const Player = require('./matter/player.js');
const CONFIG = require('./matter/config.js');
const Ball = require('./matter/ball.js');
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*", // Cho phép tất cả domains kết nối
        methods: ["GET", "POST"]
    }
});
// Serve static files từ nhiều thư mục
app.use('/client', express.static(path.join(__dirname, 'static/client')));
app.use('/matter', express.static(path.join(__dirname, 'matter')));
// Serve HTML khi truy cập root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'clientGame.html'));
});
class PhysicsEngine {
    constructor() {

        this.engine = Matter.Engine.create({
            gravity: {
                x: 0,
                y: 0,
                scale: 0
            }
        });
        this.world = this.engine.world;
        
        this.walls = new Wall(this.world);
        this.players = new Map();
        this.ball = new Ball(this.world); 
        this.setUpConnection(); 
        setInterval(() => {
            Matter.Engine.update(this.engine);
            this.gameloop(); 
        }, 1000 / 60);
    }
	gameState () {
		const state = {
            ball: {
                position: this.ball.body.position,
                velocity: this.ball.body.velocity,
            },
            players: {},  
            timestamp: Date.now()
        };

        this.players.forEach((player, id) => {
            state.players[id] = {
                position: player.body.position,
                velocity: player.body.velocity,
                lastProcessedInput: player.lastProcessedInput
            };
        });
        return state; 
	}
	gameloop() {
        io.emit('sendGameState', this.gameState()); 
	}
	setUpConnection () {
        const {totalWidth, totalHeight} = CONFIG; 
        io.on('connection', (socket) => {            
            // PLAYER JOIN 
            socket.on('requestJoin', () => {
                const newPlayer = new Player(this.world, this.engine);
                newPlayer.create(totalWidth / 2, totalHeight / 2); 
                this.players.set(socket.id, newPlayer);
                
                socket.emit('approveJoin', {
                    playerId: socket.id,
                    position: newPlayer.body.position
                });
                
                socket.broadcast.emit('newPlayer', {
                    playerId: socket.id,
                    position: newPlayer.body.position
                });
            });
            
            // PLAYER REQUEST 
            socket.on('sendInput', (data) => {
                const player = this.players.get(socket.id);
                const input = data.input;
                player.update(input, this.ball); 
                player.lastProcessedInput = input.sequence;
            }); 

            // PLAYER DISCONNECT 
            socket.on('disconnect', () => {
                console.log('Player disconnected:', socket.id);
                if (this.players.has(socket.id)) {
                    Matter.World.remove(this.world, this.players.get(socket.id).body);
                    this.players.delete(socket.id);
                }
                io.emit('playerLeft', { playerId: socket.id });
            });
            
            // PLAYER PING 
            socket.on('ping', () => {
                socket.emit('pong'); 
            }); 
        });
	}
}
// Khởi tạo game engine
const physicsEngine = new PhysicsEngine();

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Physics server running on port ${PORT}`);
});