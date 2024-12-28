const Matter = require('matter-js');
const path = require('path');
const Wall = require('./matter/wall.js');
const Player = require('./matter/player.js');
const CONFIG = require('./matter/config.js');
const Ball = require('./matter/ball.js');
const express = require('express');
const { Engine, Events } = require('matter-js');
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
        let cnt = 0; 
        this.engine = Matter.Engine.create({
            gravity: {
                x: 0,
                y: 0,
                scale: 0
            },
        });
        this.world = this.engine.world;        
        this.walls = new Wall(this.world);
        this.players = new Map();
        this.ball = new Ball(this.world, this.engine, io); 
        this.setUpConnection(); 
        // Tracking timing
        this.targetFrameTime = 1000 / 60; // 16.67ms per frame
        this.lastFrameTime = Date.now();
        this.frameCount = 0;
        this.lastFPSUpdate = Date.now();

        const gameLoop = () => {
            const currentTime = Date.now();
            const delta = currentTime - this.lastFrameTime;

            if (delta >= this.targetFrameTime) {
                // Update game
                Matter.Engine.update(this.engine, this.targetFrameTime);
                this.gameloop();
                io.emit('sendGameState', this.gameState());

                // Update timing tracking
                this.frameCount++;
                this.lastFrameTime = currentTime;

                // Log FPS mỗi giây
                // if (currentTime - this.lastFPSUpdate >= 1000) {
                //     console.log({
                //         fps: this.frameCount,
                //         actualFrameTime: (1000 / this.frameCount).toFixed(2) + 'ms',
                //         targetFrameTime: this.targetFrameTime + 'ms'
                //     });
                //     this.frameCount = 0;
                //     this.lastFPSUpdate = currentTime;
                // }
            }
            setImmediate(gameLoop);
        };
        gameLoop(); 
        Events.on(this.engine, 'collisionStart', (event) => {
            event.pairs.forEach((pair) => {
                const bodyA = pair.bodyA;
                const bodyB = pair.bodyB;
                if ((bodyA.label == 'player' && bodyB.label == 'ball') || (bodyB.label == 'player' && bodyA.label == 'ball')) {
                    cnt++; 
                    console.log(`Collision between: ${bodyA.label} and ${bodyB.label}`, cnt, `times`);
                }
            });
        });
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
        this.ball.update(); 
	}
	setUpConnection () {
        const {totalWidth, totalHeight} = CONFIG; 
        io.on('connection', (socket) => {            
            // PLAYER JOIN 
            socket.on('requestJoin', () => {
                const newPlayer = new Player(this.world, this.engine, io);
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