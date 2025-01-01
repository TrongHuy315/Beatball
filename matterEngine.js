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

        this.targetInnerFPS = 1000 / 60; 
        this.lastFrameTime = Date.now();
        this.frameCount = 0;
        this.lastFPSUpdate = Date.now();
        
        this.targetOuterFPS = 1000 / 120; 

        this.frameMonitor = {
            lastTime: Date.now(),
            frames: [],
            interval: 3000, // 3 seconds
            lastReport: Date.now()
        };
        let cur = Date.now(); 
        let last = Date.now(); 

        const gameLoop = () => {
            const currentTime = Date.now();
            const delta = currentTime - this.lastFrameTime; 
            // this.updateFrameStats(currentTime); 
            cur = Date.now(); 
            if (delta >= this.targetInnerFPS) {
                // console.log(this.targetInnerFPS, delta); 
                // console.log(cur - last); 
                this.gameloop();
                Matter.Engine.update(this.engine, this.targetInnerFPS);
                io.emit('sendGameState', this.gameState());
                // Update timing tracking
                this.frameCount++;
                this.lastFrameTime = currentTime - (delta - this.targetInnerFPS);

                // Log FPS mỗi giây
                if (currentTime - this.lastFPSUpdate >= 1000) {
                    // console.log({
                    //     fps: this.frameCount,
                    //     actualFrameTime: 1000 / this.frameCount + 'ms',
                    //     targetInnerFPS: this.targetInnerFPS + 'ms'
                    // });
                    this.frameCount = 0;
                    this.lastFPSUpdate = currentTime;
                }
            }
            while (Date.now() - currentTime < this.targetOuterFPS - 1) {
            }
            last = cur; 
            setImmediate(gameLoop);
        };
        gameLoop(); 
    }
    
    updateFrameStats(currentTime) {
        const frameTime = currentTime - this.frameMonitor.lastTime;
        
        if (frameTime > 0) {
            this.frameMonitor.frames.push(frameTime);
            this.frameMonitor.lastTime = currentTime;
        }
    
        // Log mỗi 3 giây
        if (currentTime - this.frameMonitor.lastReport >= this.frameMonitor.interval) {
            const frames = this.frameMonitor.frames;
            
            if (frames.length > 0) {
                const avgFrameTime = frames.reduce((a, b) => a + b, 0) / frames.length;
                const avgFPS = 1000 / avgFrameTime;
    
                console.log('\n=== Frame Time Statistics ===');
                console.log({
                    samples: frames.length,
                    averageFrameTime: avgFrameTime.toFixed(2) + 'ms',
                    averageFPS: avgFPS.toFixed(1),
                    targetInnerFPS: this.targetInnerFPS + 'ms'
                });
                console.log('==========================\n');
            }
    
            // Reset cho interval tiếp theo
            this.frameMonitor.frames = [];
            this.frameMonitor.lastReport = currentTime;
        }
    }
    logBallVelocity() {
        console.log('\n=== Ball Velocity ===');
        console.log({
            x: Math.round(this.ball.body.velocity.x * 100) / 100,
            y: Math.round(this.ball.body.velocity.y * 100) / 100,
            speed: Math.round(
                Math.sqrt(
                    Math.pow(this.ball.body.velocity.x, 2) + 
                    Math.pow(this.ball.body.velocity.y, 2)
                ) * 100
            ) / 100
        });
        console.log('===================\n');
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

            // DEVELOPER MODE 
            socket.on('ballMoveUpward', () => {
                // this.ball.setVelocity(0, 0); 
                this.ball.setVelocity(0, -5); 
            }); 
            socket.on('diagionalTestCombo', () => {
                const OFFSET = 170; 
                this.ball.setPosition(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2 - OFFSET);  
                this.ball.setVelocity(-5, -3); 
            }); 
            socket.on('resetBallToCenter', () => {
                // this.ball.setVelocity(0, 0); 
                this.ball.setPosition(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2); 
                this.ball.setVelocity(0, 0); 
            }); 
            socket.on('requestPutNextToBall', () => {
                this.ball.setPosition(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2); 
                this.ball.setVelocity(0, 0); 
                // Lấy player hiện tại
                const player = this.players.get(socket.clientId);
                if (player) {
                    const OFFSET_X = 50; // Khoảng cách theo trục X từ player đến ball

                    const newPlayerPosition = {
                        x: this.ball.body.position.x - OFFSET_X, // Đặt bên trái bóng
                        y: this.ball.body.position.y // Cùng độ cao với bóng
                    };

                    player.setPosition(newPlayerPosition.x, newPlayerPosition.y);
                    player.setVelocity(0, 0); // Dừng player
                }
            }); 
            socket.on('requestPutDiagionalToBall', () => {
                this.ball.setPosition(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2); 
                this.ball.setVelocity(0, 0); 
                // Lấy player hiện tại
                const player = this.players.get(socket.clientId);
                if (player) {
                    const OFFSET = 50; // Khoảng cách theo trục X từ player đến ball

                    const newPlayerPosition = {
                        x: this.ball.body.position.x - OFFSET, // Đặt bên trái bóng
                        y: this.ball.body.position.y - OFFSET// Cùng độ cao với bóng
                    };

                    player.setPosition(newPlayerPosition.x, newPlayerPosition.y);
                    player.setVelocity(0, 0); // Dừng player
                }
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