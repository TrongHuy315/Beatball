const Matter = require('matter-js');
const path = require('path');
const Wall = require('./matter/wall.js');
const Player = require('./matter/player.js');
const CONFIG = require('./matter/config.js');
const Ball = require('./matter/ball.js');
const express = require('express');
const { Engine, Events } = require('matter-js');
const { timeStamp } = require('console');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["*"],
        credentials: true
    },
    allowEIO3: true,
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    path: '/socket.io'
});
app.get('/', (req, res) => {
    res.send('Physics Server is running!');
});
app.get('/health', (req, res) => {
	res.sendStatus(200); // hoặc res.json({status: 'ok'})
  });
class PhysicsEngine {
    constructor(totalConnection) {
        // ENGINE SET UP  
        this.engine = Matter.Engine.create({
            enableSleeping: false, 
            gravity: {
                x: 0,
                y: 0,
                scale: 0
            },
        });
        this.world = this.engine.world;        
        this.players = new Map();
        this.ball = new Ball(this.world, this.engine, io); 
        this.wall = new Wall(this.world, this.engine); 
        this.playerReady = 0; 
        // ----- CELEBRATING / SCOREBOARD ----- 
        this.gameStarted = false; 
        this.requiredPlayers = 3; 
        this.scores = {
            left: 0,
            right: 0
        }; 
        this.setUpGoalCheckEvent(); 
        this.isCelebrating = false; 

        // -- SET UP CONNECTION ----- 
        this.setUpConnection(); 

        // -------- FPS --------- 
        this.targetInnerFPS = 1000 / 60; 
        this.lastFrameTime = Date.now();
        this.lastFPSUpdate = Date.now();
        this.targetOuterFPS = 1000 / 120; 
        let cur = Date.now(); 
        let last = Date.now(); 
        
        // ------ GAME LOOP ---------
        const gameLoop = () => {
            process.stdout.write("Loop passed");
            const currentTime = Date.now();
            const delta = currentTime - this.lastFrameTime; 
            cur = Date.now(); 
            if (delta >= this.targetInnerFPS) {
                this.gameloop();
                Matter.Engine.update(this.engine, this.targetInnerFPS);
                io.emit('sendGameState', this.gameState());
                this.lastFrameTime = currentTime - (delta - this.targetInnerFPS);
            }
            while (Date.now() - currentTime < this.targetOuterFPS - 1) {
            }
            last = cur; 
            setImmediate(gameLoop);
        };
        gameLoop(); 
    }
    startGame () {
        this.resetGame();
        const gameInfo = {
            leftTeam: Array.from(this.players.values())
                .filter(p => p.side === 'left')
                .map(p => ({
                    id: Array.from(this.players.entries())
                        .find(entry => entry[1] === p)[0],
                    position: p.body.position
                })),
            rightTeam: Array.from(this.players.values())
                .filter(p => p.side === 'right')
                .map(p => ({
                    id: Array.from(this.players.entries())
                        .find(entry => entry[1] === p)[0],
                    position: p.body.position
                })),
            scores: this.scores, 
            timeStamp: Date.now()
        };
        
        io.emit('gameStart', gameInfo);
        
        setTimeout(() => {
            this.gameStarted = true;
        }, 3000);
    }
    setUpGoalCheckEvent () {
        Events.on(this.engine, 'collisionStart', (event) => {
            event.pairs.forEach((pair) => {
                const bodyA = pair.bodyA;
                const bodyB = pair.bodyB;
                
                // Check va chạm với left goal
                if ((bodyA.label === 'ball' && bodyB.label === 'leftGoalDetection') ||
                    (bodyB.label === 'ball' && bodyA.label === 'leftGoalDetection')) {
                    this.handleGoal('right'); 
                }
                
                // Check va chạm với right goal
                if ((bodyA.label === 'ball' && bodyB.label === 'rightGoalDetection') ||
                    (bodyB.label === 'ball' && bodyA.label === 'rightGoalDetection')) {
                    this.handleGoal('left'); 
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
                shooting: player.shooting,
                isGhostMode: player.isGhostMode, 
                lastProcessedInput: player.lastProcessedInput
            };
        });
        return state; 
	}
	gameloop() {
        this.ball.update(); 
	}
    handleGoal (side) {
        if (this.isCelebrating) return; 
        this.isCelebrating = true; 
        this.scores[side]++; 
        const goalState = {
            scorer: "Sita69", 
            assister: "Sati96", 
            side: side, 
            timeStamp: Date.now(),  
            scores: {  // thêm tỉ số hiện tại
                left: this.scores.left,
                right: this.scores.right
            }
        }; 
        io.emit('celebration', goalState)
        var celebrationTime = CONFIG.gameConfig.celebrationTime; 
        var countDownResetGame = CONFIG.gameConfig.resetGameCountDown; 
        var resetGameDelay = celebrationTime + countDownResetGame; 
        
        setTimeout(() => {
            this.resetGame();
            this.isCelebrating = false; 
        }, resetGameDelay * 1000);
    }
    getSpawnPosition(side) {
        const { totalWidth, totalHeight, pitch, offset_horizontal, nets} = CONFIG;
        const pitchLeft = offset_horizontal + pitch.borderWidth + nets.borderWidth + nets.width;         
        // Tính toán vị trí dựa trên tỷ lệ so với pitch
        if (side === 'left') {
            return {
                x: pitchLeft + pitch.width * 0.25, // 1/4 chiều ngang sân
                y: totalHeight / 2
            };
        } else {
            return {
                x: pitchLeft + pitch.width * 0.75, // 3/4 chiều ngang sân
                y: totalHeight / 2
            };
        }
    }
    resetGame() {
        // Reset ball to center
        this.ball.setPosition(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2);
        this.ball.setVelocity(0, 0);
    
        // Reset players based on their assigned sides
        const { pitch, offset_horizontal, nets} = CONFIG;
        const pitchLeft = offset_horizontal + pitch.borderWidth + nets.borderWidth + nets.width;
        const pitchWidth = pitch.width;
    
        // Separate players by team
        const leftTeam = Array.from(this.players.values()).filter(p => p.side === 'left');
        const rightTeam = Array.from(this.players.values()).filter(p => p.side === 'right');
    
        // Reset left team
        leftTeam.forEach((player, index) => {
            const yOffset = (index + 1) / (leftTeam.length + 1) * pitch.height;
            player.setPosition(
                pitchLeft + pitchWidth * 0.25,
                CONFIG.offset_vertical + pitch.borderWidth + yOffset
            );
            player.setVelocity(0, 0);
        });
    
        // Reset right team
        rightTeam.forEach((player, index) => {
            const yOffset = (index + 1) / (rightTeam.length + 1) * pitch.height;
            player.setPosition(
                pitchLeft + pitchWidth * 0.75,
                CONFIG.offset_vertical + pitch.borderWidth + yOffset
            );
            player.setVelocity(0, 0);
        });
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
                    return;
                }
                var assignedSide = 'left'; 

                const newPlayer = new Player(this.world, this.engine, io, this);
                const spawnPosition = this.getSpawnPosition(assignedSide);
                newPlayer.create(spawnPosition.x, spawnPosition.y); 
                newPlayer.side = assignedSide; 
                this.players.set(clientId, newPlayer);

                socket.emit('approveJoin', {
                    playerId: clientId,
                    position: newPlayer.body.position, 
                    scores: this.scores,
                    side: assignedSide
                });
                
                socket.broadcast.emit('newPlayerJoin', {
                    playerId: clientId,
                    position: newPlayer.body.position, 
                    side: assignedSide 
                });
            });
            
            // PLAYER REQUEST 
            socket.on('sendInput', (data) => {
                if (this.gameStarted) {
                    const clientId = socket.clientId; 
                    const player = this.players.get(clientId);
                    const input = data.input;
                    player.update(input, this.ball); 
                    player.lastProcessedInput = input.sequence;
                }
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
            socket.on('ready', () => {
                this.playerReady++; 
                if (this.playerReady == this.requiredPlayers) {
                    this.startGame(); 
                }
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
}
const physicsEngine = new PhysicsEngine(2);
process.stdout.write("Physic engine run with 2 allowed connection\n");
process.stdout.write(`Environment PORT: ${process.env.PORT}\n`);

const PORT = process.env.PORT || 8000;
http.listen(PORT, () => {
    console.log(`Physics server running on port ${PORT}`);
});