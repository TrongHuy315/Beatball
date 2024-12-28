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
        this.cnt = 0; 
        this.request_counting = 0; 
        this.engine = Matter.Engine.create({
            gravity: {
                x: 0,
                y: 0,
                scale: 0
            },
        });
        this.world = this.engine.world;        
        this.players = new Map();
        this.wall = new Wall(this.world); 
        this.ball = new Ball(this.world, this.engine, io); 
        this.setUpConnection(); 

        this.targetFrameTime = 1000 / 60; 
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
    }
    logPlayerStats() {
        console.log('\n=== Player Statistics ===');
        console.log(`Total Connected Players: ${this.players.size}`);
        
        if (this.players.size > 0) {
            console.log('\nActive Players:');
            this.players.forEach((player, id) => {
                console.log(`- Player ${id}:`, {
                    position: {
                        x: Math.round(player.body.position.x),
                        y: Math.round(player.body.position.y)
                    },
                    velocity: {
                        x: Math.round(player.body.velocity.x),
                        y: Math.round(player.body.velocity.y)
                    }
                });
            });
        }
    
        console.log('========================\n');
    }
    logWorldState() {
        console.log('\n=== World State ===');
        console.log('Total bodies in world:', this.world.bodies.length);
        
        // Group bodies by label
        const bodyGroups = {};
        this.world.bodies.forEach(body => {
            if (!bodyGroups[body.label]) {
                bodyGroups[body.label] = [];
            }
            bodyGroups[body.label].push({
                id: body.id,
                position: body.position,
                hasPlayer: this.players.has(body.id)
            });
        });

        console.log('Bodies by type:', bodyGroups);
        console.log('Players in this.players Map:', Array.from(this.players.keys()));
        console.log('===================\n');
    }
    onCollisionShow() {
        Events.on(this.engine, 'collisionStart', (event) => {
            event.pairs.forEach((pair) => {
                const bodyA = pair.bodyA;
                const bodyB = pair.bodyB;
                if ((bodyA.label == 'player' && bodyB.label == 'ball') || (bodyB.label == 'player' && bodyA.label == 'ball')) {
                    this.cnt++; 
                    console.log(`Collision between: ${bodyA.label} and ${bodyB.label}`, this.cnt, `times`);
                }
            });
        });
    }
    onBodyAddShow() {
        Events.on(this.engine, 'afterAdd', (event) => {
            const body = event.object;
            console.log('\n=== New Body Added to World ===');
            console.log('Body Label:', body.label);
            console.log('Body ID:', body.id);
            console.log('Stack trace:');
            console.trace();
            console.log('================================\n');
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
    getPlayerStatus(clientId) {
        if (this.players.has(clientId)) {
            return 'active';
        } else if (this.disconnectedPlayers.has(clientId)) {
            const disconnectData = this.disconnectedPlayers.get(clientId);
            const timeLeft = this.disconnectTimeout - (Date.now() - disconnectData.timestamp);
            return {
                status: 'disconnected',
                timeLeft: Math.max(0, timeLeft)
            };
        }
        return 'removed';
    }

	setUpConnection () {        
        const {totalWidth, totalHeight} = CONFIG; 
        io.use((socket, next) => {
            const clientId = socket.handshake.auth.clientId;
            if (!clientId) {
                return next(new Error('No client ID'));
            }
            socket.clientId = clientId; // Lưu clientId vào socket
            next();
        });
        io.on('connection', (socket) => {            
            const clientId = socket.clientId;
            socket.on('requestJoin', () => {
                if (this.players.has(clientId)) {
                    console.log('Player already exists:', clientId);
                    return;
                }

                console.log("A player request joinning"); 
                this.request_counting++; 

                const newPlayer = new Player(this.world, this.engine, io);
                newPlayer.create(totalWidth / 2, totalHeight / 2); 
                this.players.set(clientId, newPlayer);

                socket.emit('approveJoin', {
                    playerId: clientId,
                    position: newPlayer.body.position
                });
                
                socket.broadcast.emit('newPlayerJoin', {
                    playerId: clientId,
                    position: newPlayer.body.position
                });
            });
            
            // PLAYER REQUEST 
            socket.on('sendInput', (data) => {
                const clientId = socket.clientId; 
                const player = this.players.get(clientId);
                const input = data.input;
                player.update(input, this.ball); 
                player.lastProcessedInput = input.sequence;
            }); 

            socket.on('leaveGame', () => {
                if (this.players.has(clientId)) {
                    const player = this.players.get(clientId);
                    Matter.World.remove(this.world, player.body);
                    this.players.delete(clientId);
                    io.emit('playerLeft', {
                        playerId: clientId
                    });
                    
                    console.log(`Player ${clientId} left the game`);
                }
            });
            socket.on('ping', () => {
                socket.emit('pong'); 
            }); 
        });
	}
    cleanupGhostPlayers() {
        const playerBodies = this.world.bodies.filter(body => body.label === 'player');
        
        playerBodies.forEach(body => {
            // Nếu body có label='player' nhưng không có trong this.players Map
            const hasMatchingPlayer = Array.from(this.players.values()).some(player => player.body.id === body.id);
            
            if (!hasMatchingPlayer) {
                console.log(`Removing ghost player body ID: ${body.id}`);
                Matter.World.remove(this.world, body);
            }
        });
    }
}
const physicsEngine = new PhysicsEngine();

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Physics server running on port ${PORT}`);
});