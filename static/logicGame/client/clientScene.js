const clientId = sessionStorage.getItem('clientId') || generateUniqueId();
sessionStorage.setItem('clientId', clientId);
const { Engine, Runner } = Matter;
import { CelebrationManager } from './display/celebration.js';
import { SoundManager } from './display/soundManager.js';
import { Scoreboard } from './display/scoreboard.js';
import { GameStartDisplay} from './display/gameStart.js';

class ClientScene extends Phaser.Scene {
    // SET UP SCENE 
    constructor() {
        super({ key: 'ClientScene' });

        this.gameSessionData = {
            roomId: null,
            userId: null,
            userTeam: null,
            gameData: null,
            isReady: false,
            players: new Map(),
            scores: {
                left: 0,
                right: 0
            },
            gameStatus: 'waiting',
            timestamp: null,
            serverUrl: null  
        };
        
        this.player = null;
        this.ball = null;
        this.scoreboard = null;
        this.players = new Map();
        this.playerId; 

        this.gameState = {
            celebrating: false,
            scores: {
                left: 0,
                right: 0
            }
        };

        this.gameStarted = false; 
        this.categories = {
            outer: 0x0001,         // 000001
            inner: 0x0002,         // 000010
            player: 0x0004,        // 000100
            ball: 0x0008,          // 001000
            net: 0x0010,           // 010000
            nonGraphicBall: 0x0020 // 100000
        };


        this.targetInnerFPS = 60;
        this.targetOuterFPS = 60; 
        this.targetFrameTime = 1000 / this.targetInnerFPS;
        this.lastFrameTime = 0; 
        this.receiveServerData = false;
        
        
        this.visibleServerBall = false; 
        this.visibleClientBall = false;  
        this.visibleLerpBall = true; 


        this.gameStartDisplay = null; 
        this.celebrationManager = null;  
        this.kickSounds = [
        ];
        this.init(gameData); 

    }
    init(data) {
        if (data) {
            this.gameSessionData.roomId = data.roomId;
            this.gameSessionData.userId = data.userId;
            this.gameSessionData.userTeam = data.team;
            this.gameSessionData.gameData = data.gameData;
            this.gameSessionData.serverUrl = data.serverUrl;
        }
    }
    preload() {
        this.soundManager = new SoundManager(this);
        this.soundManager.preload();
    }
    create() {
        this.soundManager.create(); 
        this.gameStartDisplay = new GameStartDisplay(this);

        this.scoreboard = new Scoreboard(this);
        const { totalWidth, totalHeight } = CONFIG;
        const { wall, nets, pitch } = CONFIG;
        // ----- SET UP PHYSICS WORLD -----
        this.matter.world.setBounds(0, 0, CONFIG.totalWidth, CONFIG.totalHeight);
        this.matter.world.setGravity(0, 0);

        // ----- SET UP WALLS WORLD ----- 
        createWalls(this); 
        // ----- BALL -----
        this.ball = new Ball(this, CONFIG.ball);
        this.ball3 = new Ball3(this, CONFIG.ball);
        this.ball3.authorityBall = this.ball; // Truyền ball làm authority ball

        // ---- SCOREBOARD ----
        this.scoreboard.draw();

        // ---- Socket Connection -----
        this.setupWebSocket();

        if (this.visibleServerBall) this.ball1 = new Ball1(this, CONFIG.ball); 
        
        // ---- INTERPOLATION  
        this.matter.world.autoUpdate = false;
        this.startGameLoop(); 

        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.zKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.xKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
        this.cKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
        this.vKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.V);
        this.bKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);

        this.menuDisplay = new MenuDisplay(this);

        this.perfMonitor = new PerfMonitor(this); 

        this.interpolators = new InterpolationManager(this);

        this.celebrationManager = new CelebrationManager(this);

        this.gameStartDisplay.showWaitingScreen(); 
    }
    startGameLoop() {
        var last; 
        const gameLoop = () => {
            const currentTime = Date.now();
            if (currentTime - this.lastFrameTime >= 1000 / this.targetInnerFPS) {
                this.gameLoop();
                this.matter.world.step(this.targetFrameTime);            
                this.lastFrameTime = currentTime - (currentTime - this.lastFrameTime - 1000 / this.targetInnerFPS); 
            }
            requestAnimationFrame(gameLoop); 
        };
    
        gameLoop(); 
    }
    gameLoop() {
        if (this.player && this.gameStarted) this.player.update();
        if (this.ball) this.ball.update();
        if (this.ball1) this.ball1.update();
    }

    // CONSTATLY UPDATE SCENE 
    update() {
        if (this.interpolators) {
            this.interpolators.update();
        }
        if (this.menuDisplay) {
            this.menuDisplay.update();
        }
        this.ball3.update(); 
    }

    // HANDLE RECEIVED DATA 
    handleGameState(data) {
        for (const playerId in data.players) {
            const playerInfo = data.players[playerId];
            if (playerId === this.playerId) {
                const localPlayer = this.players.get(playerId);
                if (localPlayer) {
                    localPlayer.serverReconciliation({
                        position: playerInfo.position,
                        velocity: playerInfo.velocity,
                        lastProcessedInput: playerInfo.lastProcessedInput,
                        timestamp: data.timestamp
                    });
                }
            } 
            else if (!this.players.has(playerId))
            {
                // Sử dụng InterpolatedPlayer cho các player khác
                const newPlayer = new InterpolatedPlayer(this, {
                    team: playerInfo.team // hoặc side, tùy theo data từ server
                });
                newPlayer.create(playerInfo.position.x, playerInfo.position.y);
                this.players.set(playerId, newPlayer);
            }
        }
        for (const [playerId, player] of this.players.entries()) {
            if (!data.players[playerId]) {
                this.interpolators.removePlayer(playerId); 
                player.destroy();
                this.players.delete(playerId);
            }
        }
        if (this.ball1) {
            this.ball1.serverReconciliation({
                position: data.ball.position,
                velocity: data.ball.velocity
            });
        } 
        if (this.receiveServerData == false) {
            this.ball.setPosition(data.ball.position.x, data.ball.position.y); 
            this.ball.setVelocity(data.ball.velocity.x, data.ball.velocity.y); 
            this.receiveServerData = true; 
        }
    }

    // SET UP SOCKET EVENT 
    setupWebSocket() {
        // const gameServerUrl = document.getElementById('game-server-url').value;
        this.gameSessionData.serverUrl = "https://beatball.xyz";  // Thay đổi thành domain

        this.SOCKET = io("https://beatball.xyz", {  // Sử dụng domain
            transports: ['websocket'],
            upgrade: false,
            path: '/socket.io',  // Thêm path cho socket.io
            secure: true,  // Bật SSL/TLS
            reconnection: true,  // Thêm auto reconnect
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 20000,
            auth: {
                clientType: 'gameClient',
                version: '1.0',
                clientId: clientId,
                roomId: this.gameSessionData.roomId,
                userId: this.gameSessionData.userId,
                team: this.gameSessionData.userTeam
            }
        });

        var socket = this.SOCKET;

        // ----- SERVER CONNECTION ------- 
        socket.on('connect', () => {
            this.events.emit('socket-ready');
            console.log('Connected with socket ID:', socket.id);
            socket.emit('requestJoin');
        });

        socket.on('connect_error', (error) => {
            console.log('Connection error:', error);
        });

        socket.on('approveJoin', (data) => {
            this.playerId = data.playerId;
            this.player = new PlayerController(this);
            this.player.playerId = data.playerId;
            this.player.create(data.x, data.y);
            this.players.set(data.playerId, this.player);

            if (data.scores) {
                this.gameState.scores = data.scores;
                this.scoreboard.updateScore('left', data.scores.left);
                this.scoreboard.updateScore('right', data.scores.right);
            }
            socket.emit('ready'); 
        });


        // ------ GAME STATE UPDATE -------
        socket.on('sendGameState', (data) => {
            this.handleGameState(data);
        });

        socket.on('sendBallState', (data) => {
            this.ball.handleBallState(data); 
        }); 

        socket.on('gameStart', (data) => {
            this.gameStartDisplay.hideWaitingScreen();
            var startedTime = data.timeStamp; 
            var remainderTime = Date.now() - data.timeStamp; 
            var durationCountDown = Math.max(0, remainderTime - 3000);
            var serverStarTime = 3000 + data.timeStamp; 
            
            this.gameStartDisplay.showStartCountdown(durationCountDown, () => {
                var elapsedTime = Date.now() - serverStarTime; 
                this.gameStarted = true; 
                this.scoreboard.resetClock();
                this.scoreboard.startCountDown(elapsedTime);
            }); 
        });  

        // ------ PLAYERS UPDATE -------- 
        socket.on('newPlayerJoin', (data) => {
            if (data.playerId !== this.playerId) { // Sửa != thành !==
                const teamConfig = {
                    team: data.side
                };
                const newPlayer = new InterpolatedPlayer(this, teamConfig);
                newPlayer.create(data.x, data.y);
                this.players.set(data.playerId, newPlayer);
            }
        });
        // ------- SCORE UPDATE ------- 
        socket.on('scoreUpdate', (data) => {
            this.scoreboard.updateScore(data.side, data.score);
            this.gameState.scores = data.scores;
        });
        socket.on('goalScored', (data) => {
            this.scoreboard.updateScore(data.team, data.score[data.team]);
            this.gameState.scores = data.score;            
            this.showGoalCelebration(data.team);
        });
        socket.on('celebration', (data) => {
            this.celebrationManager.letCelebrate(data);
        }); 
        socket.on('sendScoreboardState', (data) => {
            this.gameState.scores = data.scores;
            this.scoreboard.updateScore('left', data.scores.left);
            this.scoreboard.updateScore('right', data.scores.right);
        });

        // ----- SOUND UPDATE ------- 
        socket.on('kickingSound',() => {
            var soundType = CONFIG.sound.type;
            this.soundManager.playKickSound(soundType);
        });

        // ----- DISCONNECTION UPDATE ------ 
        socket.on('somePlayerDisconnected', (data) => {
            const disconnectedPlayerId = data.playerId; // Sửa typo
            if (this.players.has(disconnectedPlayerId)) {
                const playerToRemove = this.players.get(disconnectedPlayerId);
                
                if (playerToRemove) {
                    playerToRemove.destroy();
                }
                
                this.players.delete(disconnectedPlayerId);
                this.interpolators.removePlayer(disconnectedPlayerId);
                
                console.log(`Player ${disconnectedPlayerId} disconnected`);
            }
        });

        socket.on('disconnect', (reason) => {
            console.log('Disconnected:', reason);
            if (reason === 'io server disconnect') {
                // Server đã disconnect có chủ ý, không reconnect
                socket.connect();
            }
            // Các trường hợp khác để Socket.IO tự xử lý reconnect
        });
        
    }
}

const configPhaser = {
    type: Phaser.WEBGL,
    width: CONFIG.totalWidth,
    height: CONFIG.totalHeight,
    backgroundColor: 0x000000,
    parent: 'player_container',
    transparent: true,
    fps: {
        target: 120, // Mục tiêu 60 FPS
        forceSetTimeOut: true,
        smoothStep: false 
    },
    physics: {
        default: 'matter',
        matter: {
            debug: false, // Set to false in production
            gravity: { y: 0 },
            setBounds: true, 
        }
    },
    scene: ClientScene
};

const game = new Phaser.Game(configPhaser);
window.addEventListener('beforeunload', (event) => {
    if (game.scene.scenes[0].SOCKET) {
        game.scene.scenes[0].SOCKET.emit('leaveGame');
    }
});