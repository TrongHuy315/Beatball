const clientId = sessionStorage.getItem('clientId') || generateUniqueId();
sessionStorage.setItem('clientId', clientId);
class ClientScene extends Phaser.Scene {
    // SET UP SCENE 
    constructor() {
        super({ key: 'ClientScene' });
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
        this.categories = {
            outer: 0x0001,         // 000001
            inner: 0x0002,         // 000010
            player: 0x0004,        // 000100
            ball: 0x0008,          // 001000
            net: 0x0010,           // 010000
            nonGraphicBall: 0x0020 // 100000
        };
        // Thêm FPS monitoring
        this.frameCount = 0;
        this.lastFpsTime = 0;
        this.targetFPS = 60;
        this.targetFrameTime = 1000 / this.targetFPS;
    }
    preload() {
        this.scoreboard = new Scoreboard();
    }
    create() {
        const { totalWidth, totalHeight } = CONFIG;
        const { wall, nets, pitch } = CONFIG;
        // ----- SET UP PHYSICS WORLD -----
        this.matter.world.setBounds(0, 0, CONFIG.totalWidth, CONFIG.totalHeight);
        this.matter.world.setGravity(0, 0);

        // ----- SET UP WALLS WORLD ----- 
        createWalls(this); 
        // ----- BALL -----
        this.ball = new Ball(this, CONFIG.ball);

        // ---- SCOREBOARD ----
        this.scoreboard.draw();

        // ---- Socket Connection -----
        this.setupWebSocket();
        // ---- PING DISPLAY ---- 
        this.perfMonitor = new PerfMonitor(this);
        this.ball1 = new Ball1(this, CONFIG.ball);

        // Set up timing control
        this.lastUpdateTime = this.game.getTime();
        
        // FPS display
        this.fpsText = this.add.text(10, 10, '', { 
            fontSize: '16px', 
            fill: '#00ff00' 
        });
        // ---- INTERPOLATION 
        // this.interpolators = new InterpolationManager(this); 
    }

    // GOAL CELEBRATION 
    showGoalCelebration(scoringTeam) {
        // Tạo container để dễ quản lý các text objects
        const celebrationContainer = this.add.container(0, 0);

        // Text GOAL! chính giữa màn hình
        const goalText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 3,
            'GOAL!',
            {
                fontSize: '128px',
                fontFamily: 'Arial',
                fontWeight: 'bold',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 8
            }
        ).setOrigin(0.5).setAlpha(0);

        // Text thông báo team ghi bàn
        const teamText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2,
            `${scoringTeam.toUpperCase()} TEAM SCORES!`,
            {
                fontSize: '64px',
                fontFamily: 'Arial',
                color: scoringTeam === 'left' ? '#ff0000' : '#0000ff',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5).setAlpha(0);

        // Thêm texts vào container
        celebrationContainer.add([goalText, teamText]);

        // Animation sequence
        this.tweens.add({
            targets: [goalText, teamText],
            alpha: { from: 0, to: 1 },
            scale: { from: 0.5, to: 1 },
            duration: 1000,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Tự động ẩn sau 2 giây
                this.time.delayedCall(2000, () => {
                    this.tweens.add({
                        targets: [goalText, teamText],
                        alpha: 0,
                        duration: 500,
                        onComplete: () => {
                            celebrationContainer.destroy();
                        }
                    });
                });
            }
        });
    }

    // CONSTATLY UPDATE SCENE 
    update(time) {
        // Tính thời gian từ lần update cuối
        const currentTime = this.game.getTime();
        const deltaTime = currentTime - this.lastUpdateTime;

        // Chỉ update khi đủ thời gian (1/60 giây)
        if (deltaTime >= this.targetFrameTime) {
            // Physics và game updates
            if (this.player) this.player.update(); 
            if (this.ball) this.ball.update(); 
            if (this.ball1) this.ball1.update(); 

            // Reset timer
            this.lastUpdateTime = currentTime - (deltaTime % this.targetFrameTime);
            
            // FPS counter
            this.frameCount++;
            if (currentTime > this.lastFpsTime + 1000) {
                const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsTime));
                this.fpsText.setText(`FPS: ${fps}`);
                console.log(`Updates per second: ${fps}`);
                this.frameCount = 0;
                this.lastFpsTime = currentTime;
            }
        }

        // Interpolation và smooth updates có thể chạy mỗi frame
        if (this.interpolators) {
            this.interpolators.update(); 
        }
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
                const newPlayer = new PlayerController(this);
                newPlayer.create(playerInfo.position.x, playerInfo.position.y);
                this.players.set(playerId, newPlayer);
            }
        }
        for (const [playerId, player] of this.players.entries()) {
            if (!data.players[playerId]) {
                // this.interpolators.removePlayer(playerId); 
                player.destroy();
                this.players.delete(playerId);
            }
        }
        this.ball1.serverReconciliation({
            position: data.ball.position,
            velocity: data.ball.velocity
        });
    }
    // SET UP SOCKET EVENT 
    setupWebSocket() {
        this.SOCKET = io('http://localhost:3000', {
            transports: ['websocket'],
            upgrade: false, 
            auth: {
                clientType: 'gameClient',
                version: '1.0', 
                clientId: clientId
            }
        }); 
        var socket = this.SOCKET;

        // ----- SERVER CONNECTION ------- 
        socket.on('connect', () => {
            console.log('Connected with socket ID:', socket.id);
            socket.emit('requestJoin');
        });
        socket.on('connect_error', (error) => {
            console.log('Connection error:', error);
        });
        socket.on('approveJoin', (data) => {
            this.playerId = data.playerId;
            this.player = new PlayerController(this);
            this.player.create(data.x, data.y);
            this.players.set(data.playerId, this.player);
        });

        // ------ GAME STATE UPDATE -------
        socket.on('sendGameState', (data) => {
            this.handleGameState(data);
        });
        socket.on('sendBallState', (data) => {
            this.ball.handleBallState(data); 
        }); 

        // ------ PLAYERS UPDATE -------- 
        socket.on('newPlayerJoin', (data) => {
            if (data.playerId != this.myPlayerId) {
                const newPlayer = new PlayerController(this);
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
        socket.on('sendScoreboardState', (data) => {
            this.gameState.scores = data.scores;
            this.scoreboard.updateScore('left', data.scores.left);
            this.scoreboard.updateScore('right', data.scores.right);
        });

        // ----- DISCONNECTION UPDATE ------ 
        socket.on('somePlayerDisconnected', (data) => {
            const disconnectedPlayerId = data.playerId;
            if (this.players.has(disconnectedPlayerId)) {
                const playerToRemove = this.players.get(disconnectedPlayerId);
                
                if (playerToRemove) {
                    playerToRemove.destroy();
                }
                
                this.players.delete(disconnectedPlayerId);
                
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
        target: 60, // Mục tiêu 60 FPS
        forceSetTimeOut: false, 
        smoothStep: true 
    },
    physics: {
        default: 'matter',
        matter: {
            debug: true, // Set to false in production
            gravity: { y: 0 },
            setBounds: true, 
            positionIterations: 8,  // Tăng độ chính xác physics (default: 6)
            velocityIterations: 6,  // Tăng độ chính xác physics (default: 4)
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