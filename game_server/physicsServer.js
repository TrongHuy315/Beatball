const Matter = require('matter-js');
const path = require('path');
const Wall = require('./matter/wall.js');
const Player = require('./matter/player.js');
const CONFIG = require('./matter/config.js');
const Ball = require('./matter/ball.js');
const express = require('express');
const { Engine, Events } = require('matter-js');
const { timeStamp } = require('console');
const SOCKET_PATH = process.env.SOCKET_PATH || '/socket.io';

// Use the debug library
const debug = require('debug')('socket.io:server');

process.stdout.write(`Server configured with SOCKET_PATH: ${SOCKET_PATH}\n`);

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "https://beatball.xyz",
        methods: ["GET", "POST"],
        allowedHeaders: ["*"],
        credentials: true
    },
    allowEIO3: true,
    transports: ['websocket'],
    pingTimeout: 60000,
    pingInterval: 25000,
    path: SOCKET_PATH,  // Use the environment variable here
    handlePreflightRequest: (req, res) => {
        res.writeHead(200, {
            "Access-Control-Allow-Origin": "https://beatball.xyz",
            "Access-Control-Allow-Methods": "GET,POST",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": true
        });
        res.end();
    }
});

io.engine.on('connection_error', (err) => {
    console.log('Connection error:', {
        req: err.req,
        code: err.code,
        message: err.message,
        context: err.context
    });
    debug('connection_error: %O', err);
});

io.engine.use((req, res, next) => {
    console.log('Socket.IO Request:', {
        url: req.url,
        method: req.method,
        headers: req.headers,
        query: req.query
    });
    debug('Socket.IO Request: %O', {
        url: req.url,
        method: req.method,
        headers: req.headers,
        query: req.query
    });
    next();
});

app.get('/debug/socket-path', (req, res) => {
    res.send(`Current socket path: ${SOCKET_PATH}`);
});

// Trả về để test xem server chạy
app.get('/', (req, res) => {
    res.send('Physics Server is running!');
});

// Dùng cho k8s readiness/liveness probe (gọi nội bộ cluster: http://IP:8000/health)
app.get('/health', (req, res) => {
    res.sendStatus(200);
});

// [ADDED] Cho phép bạn “curl -I https://beatball.xyz/game/game-<roomId>/health”
app.get('/game/game-:roomId/health', (req, res) => {
    res.sendStatus(200);
});

// Middleware bắt prefix /game/game-:roomId
app.use('/game/game-:roomId', (req, res, next) => {
    // Gán roomId vào request, nếu cần
    req.roomId = req.params.roomId;
    debug('Middleware for roomId: %s', req.roomId);
    next();
});

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    debug('Express request: %s %s', req.method, req.url);
    next();
});

// Add error handling middleware
app.use((err, req, res, next) => {
    console.error('Express error:', err);
    debug('Express error: %O', err);
    res.status(500).send('Internal Server Error');
});

class PhysicsEngine {
    constructor() {
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

        // Store players here
        this.players = new Map();

        // Initialize Ball, Wall
        this.ball = new Ball(this.world, this.engine, io);
        this.wall = new Wall(this.world, this.engine);

        // Player readiness
        this.playerReady = 0;

        // CELEBRATING / SCOREBOARD
        this.gameStarted = false;
        this.requiredPlayers = 9; 
        this.scores = {
            left: 0,
            right: 0
        };
        this.isCelebrating = false;

        // Set up collision for goals
        this.setUpGoalCheckEvent();

        // Set up connections / listeners
        this.setUpConnection();

        this.playerData = new Map();
        this.usedNumbers = new Set();
        try {
            const playerDataString = process.env.PLAYER_DATA;
            let playerCount = 0;
            if (playerDataString) {
                const initialPlayerData = JSON.parse(playerDataString);
                playerCount = initialPlayerData.length;
                this.initializePlayerData(initialPlayerData);
            }
            this.requiredPlayers = playerCount;
        } catch (error) {
            console.error('Error parsing player data:', error);
        }
        console.log("Number of required players: ", this.requiredPlayers); 

        try {
            const playerDataString = process.env.PLAYER_DATA;
            debug('Reading PLAYER_DATA from env:', playerDataString);
            if (playerDataString) {
                const initialPlayerData = JSON.parse(playerDataString);
                debug('Parsed PLAYER_DATA:', initialPlayerData);
            } else {
                debug('No PLAYER_DATA found in environment variables');
            }
        } catch (error) {
            console.error('Error parsing player data:', error);
            debug('Error parsing player data: %O', error);
        }
        
        // FPS settings
        this.targetInnerFPS = 1000 / 60;
        this.lastFrameTime = Date.now();
        this.lastFPSUpdate = Date.now();
        this.targetOuterFPS = 1000 / 120;
        let cur = Date.now();
        let last = Date.now();

        // GAME LOOP
        const gameLoop = () => {
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
                // Busy-wait until next game tick
            }

            last = cur;
            setImmediate(gameLoop);
        };
    }
    generateShirtNumber() {
        const MIN_NUMBER = 1;
        const MAX_NUMBER = 99;
        let number;
        
        // Keep trying until we find an unused number
        do {
            number = Math.floor(Math.random() * (MAX_NUMBER - MIN_NUMBER + 1)) + MIN_NUMBER;
        } while (this.usedNumbers.has(number));
        
        this.usedNumbers.add(number);
        return number;
    }
    initializePlayerData(initialData) {
        initialData.forEach(player => {
            this.playerData.set(player.id, {
                id: player.id,
                username: player.username,
                team: player.team,  // 'left' or 'right' from your data
                position: player.position,
                shirtNumber: this.generateShirtNumber()
            });
        });
    }
    /**
     * startGame
     * Starts the game after players are ready
     */
    startGame() {
        this.resetGame();
        // Debug logging
        console.log("Current players:", Array.from(this.players.entries()).map(([clientId, player]) => ({
            clientId,
            userId: player.userId,
            side: player.side
        })));
        console.log("Player data map:", Array.from(this.playerData.entries()));
        const gameInfo = {
            teams: {
                blue: Array.from(this.players.values())
                    .filter(p => p.side === 'left')
                    .map(p => {
                        const playerId = Array.from(this.players.entries())
                            .find(entry => entry[1] === p)[0];
                        const playerInfo = this.playerData.get(p.userId);
                        
                        if (!playerInfo) {
                            console.log(`Warning: No player info found for userId: ${p.userId}`);
                            return {
                                id: playerId,
                                position: p.body.position,
                                username: "Unknown Player",
                                shirtNumber: 0
                            };
                        }
    
                        return {
                            id: playerId,
                            position: p.body.position,
                            username: playerInfo.username || "Unknown Player",
                            shirtNumber: playerInfo.shirtNumber || 0
                        };
                    }),
                red: Array.from(this.players.values())
                    .filter(p => p.side === 'right')
                    .map(p => {
                        const playerId = Array.from(this.players.entries())
                            .find(entry => entry[1] === p)[0];
                        const playerInfo = this.playerData.get(p.userId);
                        
                        if (!playerInfo) {
                            console.log(`Warning: No player info found for userId: ${p.userId}`);
                            return {
                                id: playerId,
                                position: p.body.position,
                                username: "Unknown Player",
                                shirtNumber: 0
                            };
                        }
    
                        return {
                            id: playerId,
                            position: p.body.position,
                            username: playerInfo.username || "Unknown Player",
                            shirtNumber: playerInfo.shirtNumber || 0
                        };
                    })
            },
            scores: this.scores,
            timestamp: Date.now()
        };
    
        io.emit('gameStart', gameInfo);
    
        setTimeout(() => {
            this.gameStarted = true;
        }, 3000);
    }
    /**
     * setUpGoalCheckEvent
     * Sets up an event to check collisions for goals
     */
    setUpGoalCheckEvent() {
        debug('setUpGoalCheckEvent called');
        Events.on(this.engine, 'collisionStart', (event) => {
            event.pairs.forEach((pair) => {
                const bodyA = pair.bodyA;
                const bodyB = pair.bodyB;

                // Check va chạm với left goal
                if ((bodyA.label === 'ball' && bodyB.label === 'leftGoalDetection') ||
                    (bodyB.label === 'ball' && bodyA.label === 'leftGoalDetection')) {
                    debug('Goal collision detected: LEFT GOAL');
                    this.handleGoal('right');
                }

                // Check va chạm với right goal
                if ((bodyA.label === 'ball' && bodyB.label === 'rightGoalDetection') ||
                    (bodyB.label === 'ball' && bodyA.label === 'rightGoalDetection')) {
                    debug('Goal collision detected: RIGHT GOAL');
                    this.handleGoal('left');
                }
            });
        });
    }

    /**
     * gameState
     * Returns current game state
     */
    gameState() {
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

    /**
     * gameloop
     * Updates game-related logic each frame
     */
    gameloop() {
        debug('gameloop iteration');
        this.ball.update();
    }

    /**
     * handleGoal
     * Handles on-goal collision
     */
    handleGoal(side) {
        debug('handleGoal called for side: %s', side);
        if (this.isCelebrating) {
            debug('handleGoal ignored: isCelebrating is true');
            return;
        }
        this.isCelebrating = true;
        this.scores[side]++;
        const goalState = {
            scorer: "Sita69",
            assister: "Sati96",
            side: side,
            timeStamp: Date.now(),
            scores: {
                left: this.scores.left,
                right: this.scores.right
            }
        };
        debug('Emitting celebration: %O', goalState);
        io.emit('celebration', goalState);

        var celebrationTime = CONFIG.gameConfig.celebrationTime;
        var countDownResetGame = CONFIG.gameConfig.resetGameCountDown;
        var resetGameDelay = celebrationTime + countDownResetGame;

        setTimeout(() => {
            debug('Celebration complete, resetting game...');
            this.resetGame();
            this.isCelebrating = false;
        }, resetGameDelay * 1000);
    }

    /**
     * getSpawnPosition
     * Returns spawn position based on side
     */
    getSpawnPosition(side) {
        debug('getSpawnPosition called for side: %s', side);
        const { totalWidth, totalHeight, pitch, offset_horizontal, nets } = CONFIG;
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

    /**
     * resetGame
     * Resets ball to center and all players to their initial positions
     */
    resetGame() {
        debug('resetGame called');
        // Reset ball to center
        this.ball.setPosition(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2);
        this.ball.setVelocity(0, 0);

        const { pitch, offset_horizontal, nets } = CONFIG;
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
        debug('resetGame completed');
    }

    /**
     * setUpConnection
     * Sets up socket connections and listeners
     */
    setUpConnection() {
        debug('setUpConnection called');
        const { totalWidth, totalHeight } = CONFIG;
        io.use((socket, next) => {
            const clientId = socket.handshake.auth.clientId;
            const userId = socket.handshake.auth.userId;  // Get userId from auth
            
            if (!clientId || !userId) {
                debug('Missing clientId or userId, rejecting connection');
                return next(new Error('Invalid authentication'));
            }
            socket.clientId = clientId;
            socket.userId = userId;  // Store userId in socket
            next();
        });

        io.on('connection', (socket) => {
            console.log('Client connected:', socket.clientId);
            debug('Client connected: %s', socket.clientId);
            console.log('New connection attempt:', {
                id: socket.id,
                handshake: {
                    headers: socket.handshake.headers,
                    query: socket.handshake.query,
                    auth: socket.handshake.auth
                },
                transport: socket.conn.transport.name
            });

            socket.on('timeSync', (data) => {
                socket.emit('timeSyncResponse', {
                    clientSendTime: data.clientSendTime,
                    serverTime: Date.now()
                });
                debug('Time sync response sent to clientId: %s', clientId);
            });


            debug('New connection attempt: %O', {
                id: socket.id,
                handshake: {
                    headers: socket.handshake.headers,
                    query: socket.handshake.query,
                    auth: socket.handshake.auth
                },
                transport: socket.conn.transport.name
            });

            socket.on('error', (error) => {
                console.error('Socket error:', {
                    socketId: socket.id,
                    error: error.message,
                    stack: error.stack
                });
                debug('Socket error: %O', {
                    socketId: socket.id,
                    error: error.message,
                    stack: error.stack
                });
            });

            socket.conn.on('upgrade', (transport) => {
                console.log('Transport upgraded:', {
                    socketId: socket.id,
                    from: socket.conn.transport.name,
                    to: transport.name
                });
                debug('Transport upgraded: %O', {
                    socketId: socket.id,
                    from: socket.conn.transport.name,
                    to: transport.name
                });
            });

            const clientId = socket.clientId;

            socket.on('requestJoin', () => {
                const clientId = socket.clientId;
                const userId = socket.userId;   
            
                debug('requestJoin from clientId: %s', clientId);
                if (this.players.has(clientId)) {
                    debug('requestJoin ignored, player with clientId already exists: %s', clientId);
                    return;
                }
                // Get player data based on userId
                const playerInfo = this.playerData.get(userId);
                if (!playerInfo) {
                    debug('No player data found for userId:', userId);
                    socket.emit('game_error', { message: 'Invalid player data' });
                    return;
                }
            
                const newPlayer = new Player(this.world, this.engine, io, this);
                const spawnPosition = this.getSpawnPosition(playerInfo.team);
                newPlayer.create(spawnPosition.x, spawnPosition.y);
                newPlayer.side = playerInfo.team; // 'left' or 'right'
                newPlayer.userId = userId; 
                this.players.set(clientId, newPlayer);
            
                // Simplified data structure
                socket.emit('approveJoin', {
                    playerId: clientId,
                    position: newPlayer.body.position,
                    scores: this.scores,
                    side: playerInfo.team,
                    name: playerInfo.username,
                    shirtNumber: playerInfo.shirtNumber
                });
            
                // Simplified broadcast data
                socket.broadcast.emit('newPlayerJoin', {
                    playerId: clientId,
                    position: newPlayer.body.position,
                    side: playerInfo.team,
                    name: playerInfo.username,
                    shirtNumber: playerInfo.shirtNumber
                });
            });

            socket.on('sendInput', (data) => {
                if (this.gameStarted) {
                    const clientId = socket.clientId;
                    const player = this.players.get(clientId);
                    const input = data.input;
                    debug('sendInput from clientId: %s -> %O', clientId, input);
                    player.update(input, this.ball);
                    player.lastProcessedInput = input.sequence;
                } else {
                    debug('sendInput ignored, game not started for clientId: %s', socket.clientId);
                }
            });

            socket.on('leaveGame', () => {
                debug('leaveGame from clientId: %s', clientId);
                if (this.players.has(clientId)) {
                    const player = this.players.get(clientId);
                    Matter.World.remove(this.world, player.body);
                    this.players.delete(clientId);
                    io.emit('playerLeft', {
                        playerId: clientId
                    });
                    console.log(`Player ${clientId} left the game`);
                    debug('playerLeft for clientId: %s', clientId);
                }
            });

            socket.on('ping', () => {
                socket.emit('pong');
                debug('ping/pong exchanged with clientId: %s', clientId);
            });

            socket.on('ready', () => {
                this.playerReady++;
                process.stdout.write(`Physic engine run with ${this.requiredPlayers} allowed connection\n`);
                process.stdout.write(`Number of required players: ${this.requiredPlayers}\n`);
                debug('ready from clientId: %s -> playerReady count: %d', clientId, this.playerReady);

                if (this.playerReady == this.requiredPlayers) {
                    debug('All required players are ready, starting game');
                    this.startGame();
                }
            });

            // DEVELOPER MODE
            socket.on('ballMoveUpward', () => {
                debug('ballMoveUpward from clientId: %s', clientId);
                this.ball.setVelocity(0, -5);
            });

            socket.on('diagionalTestCombo', () => {
                debug('diagionalTestCombo from clientId: %s', clientId);
                const OFFSET = 170;
                this.ball.setPosition(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2 - OFFSET);
                this.ball.setVelocity(-5, -3);
            });

            socket.on('resetBallToCenter', () => {
                debug('resetBallToCenter from clientId: %s', clientId);
                this.ball.setPosition(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2);
                this.ball.setVelocity(0, 0);
            });

            socket.on('requestPutNextToBall', () => {
                debug('requestPutNextToBall from clientId: %s', clientId);
                this.ball.setPosition(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2);
                this.ball.setVelocity(0, 0);
                // Lấy player hiện tại
                const player = this.players.get(socket.clientId);
                if (player) {
                    const OFFSET_X = 50;
                    const newPlayerPosition = {
                        x: this.ball.body.position.x - OFFSET_X,
                        y: this.ball.body.position.y
                    };
                    player.setPosition(newPlayerPosition.x, newPlayerPosition.y);
                    player.setVelocity(0, 0);
                }
            });

            socket.on('requestPutDiagionalToBall', () => {
                debug('requestPutDiagionalToBall from clientId: %s', clientId);
                this.ball.setPosition(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2);
                this.ball.setVelocity(0, 0);
                // Lấy player hiện tại
                const player = this.players.get(socket.clientId);
                if (player) {
                    const OFFSET = 50;
                    const newPlayerPosition = {
                        x: this.ball.body.position.x - OFFSET,
                        y: this.ball.body.position.y - OFFSET
                    };
                    player.setPosition(newPlayerPosition.x, newPlayerPosition.y);
                    player.setVelocity(0, 0);
                }
            });
        });
    }
}

// Initialize physics engine
const physicsEngine = new PhysicsEngine(); 
process.stdout.write(`Environment PORT: ${process.env.PORT}\n`);

const PORT = process.env.PORT || 8000;
http.listen(PORT, () => {
    console.log(`Physics server running on port ${PORT}`);
    debug('Physics server running on port %d', PORT);
});