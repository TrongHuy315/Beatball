const clientId = sessionStorage.getItem('clientId') || generateUniqueId();
sessionStorage.setItem('clientId', clientId);
const { Engine, Runner } = Matter;
class ClientScene extends Phaser.Scene {
    // SET UP SCENE 
    constructor() {
        super({ key: 'ClientScene' });
        this.player = null;
        this.ball = null;
        this.scoreboard = null;
        this.players = new Map();
        this.playerId;
        this.frameCount = 0; 
        this.lastFrameTime = 0; 
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
        this.targetInnerFPS = 60;
        this.targetOuterFPS = 60; 
        this.targetFrameTime = 1000 / this.targetInnerFPS;
        this.lastUpdateTime = Date.now(); 

        this.lastFpsTime = Date.now(); // Thêm dòng này
        this.lastFPSUpdate = Date.now(); // Thêm dòng này 

        this.receiveServerData = false; 
        this.visibleServerBall = true; 
        this.visibleClientBall = true;  
        this.visibleLerpBall = true; 

        // Thêm tracking frame time
        this.frameTimeLog = [];
        this.lastFrameTimeLog = Date.now();
        this.frameTimeLogInterval = 3000;  // Log mỗi 3 giây
        this.maxFrameTime = 0;
        this.minFrameTime = Infinity;
        this.sumFrameTime = 0;
        
        this.last = Date.now(); 
        this.cur = Date.now(); 

        // Thêm thuộc tính cho runner
        this.runner = null;
        this.isRunnerActive = false;

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
        this.ball3 = new Ball3(this, CONFIG.ball);
        this.ball3.authorityBall = this.ball; // Truyền ball làm authority ball

        // ---- SCOREBOARD ----
        this.scoreboard.draw();

        // ---- Socket Connection -----
        this.setupWebSocket();
        // ---- PING DISPLAY ---- 
        this.perfMonitor = new PerfMonitor(this);
        if (this.visibleServerBall) this.ball1 = new Ball1(this, CONFIG.ball); 
        // Set up timing control
        this.lastUpdateTime = this.game.getTime();
        
        // FPS display
        this.fpsText = this.add.text(10, 10, '', { 
            fontSize: '16px', 
            fill: '#00ff00' 
        });
        // ---- INTERPOLATION 
        this.interpolators = new InterpolationManager(this); 
        this.matter.world.autoUpdate = false;
        this.startGameLoop(); 

        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.zKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.xKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
        this.cKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
        this.vKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.V);
        this.bKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);

        // this.initializeRunner();
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
    startGameLoop() {
        var last; 
        const gameLoop = () => {
            const currentTime = Date.now();
            var cur = Date.now(); 
            if (currentTime - this.lastFrameTime >= 1000 / this.targetInnerFPS) {
                this.gameLoop();
                this.matter.world.step(this.targetFrameTime);            
                this.frameCount++;
                this.lastFrameTime = currentTime - (currentTime - this.lastFrameTime - 1000 / this.targetInnerFPS); 
                // if (currentTime - this.lastFPSUpdate >= 1000) {
                //     console.log({
                //         fps: this.frameCount,
                //         actualFrameTime: 1000 / this.frameCount + 'ms',
                //         targetFrameTime: this.targetFrameTime + 'ms'
                //     });
                //     this.frameCount = 0;
                //     this.lastFPSUpdate = currentTime;
                // }
            }
            last = cur; 
            requestAnimationFrame(gameLoop); 
        };
    
        gameLoop(); 
    }
    initializeRunner() {
        // Tạo runner với các options được định nghĩa trong API
        this.runner = Runner.create({
            delta: 1000 / this.targetInnerFPS,       // Fixed timestep size (16.666ms for 60fps)
            enabled: true,                           // Enable runner by default
            maxFrameTime: 1000 / 30,                 // Performance budget (33.333ms)
            frameDeltaSmoothing: true,              // Enable frame rate smoothing
            frameDeltaSnapping: true,               // Round frame delta to nearest 1 Hz
            maxUpdates: 4                           // Limit max updates per frame
        });
    
        // Đăng ký các events theo API
        Matter.Events.on(this.runner, 'beforeTick', (event) => {
            // Logic trước mỗi tick
            if (this.interpolators) {
                this.interpolators.update();
            }
        });
    
        Matter.Events.on(this.runner, 'tick', (event) => {
            // Logic chính trong mỗi tick
            this.gameLoop();
        });
    
        Matter.Events.on(this.runner, 'afterTick', (event) => {
            // FPS tracking
            const currentTime = Date.now();
            this.frameCount++;
            
            if (currentTime - this.lastFPSUpdate >= 1000) {
                console.log({
                    fps: this.frameCount,
                    frameDelta: this.runner.frameDelta + 'ms',
                    actualFrameTime: 1000 / this.frameCount + 'ms',
                    engineDelta: this.runner.delta + 'ms'
                });
                this.frameCount = 0;
                this.lastFPSUpdate = currentTime;
            }
        });
    
        Matter.Events.on(this.runner, 'beforeUpdate', (event) => {
            // Logic trước mỗi engine update
        });
    
        Matter.Events.on(this.runner, 'afterUpdate', (event) => {
            // Logic sau mỗi engine update
        });
    
        // Khởi động runner với engine
        Runner.run(this.runner, this.matter.world.engine);
    }
    
    // Thêm phương thức để dừng/tiếp tục runner
    stopRunner() {
        if (this.runner) {
            this.runner.enabled = false;  // Pause runner
        }
    }
    
    startRunner() {
        if (this.runner) {
            this.runner.enabled = true;   // Resume runner
        }
    }
    
    // Thêm phương thức để destroy runner khi cần
    destroyRunner() {
        if (this.runner) {
            Runner.stop(this.runner);
            // Xóa tất cả events
            Matter.Events.off(this.runner, 'beforeTick');
            Matter.Events.off(this.runner, 'tick');
            Matter.Events.off(this.runner, 'afterTick');
            Matter.Events.off(this.runner, 'beforeUpdate');
            Matter.Events.off(this.runner, 'afterUpdate');
            this.runner = null;
        }
    }
    
    gameLoop() {
        if (this.player) this.player.update();
        if (this.ball) this.ball.update();
        if (this.ball1) this.ball1.update();
        
        // Update interpolation
        if (this.interpolators) {
            this.interpolators.update();
        }
    }

    // CONSTATLY UPDATE SCENE 
    update() {
        if (this.spaceKey.isDown) {
            // Gửi yêu cầu reset bóng đến server
            if (this.SOCKET) {
                this.SOCKET.emit('ballMoveUpward');
            }
            // this.ball.setPosition(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2); 
            this.ball.setVelocity(0, -5); 
        }
        if (this.zKey.isDown) {
            // Gửi yêu cầu reset bóng đến server
            if (this.SOCKET) {
                this.SOCKET.emit('resetBallToCenter');
            }
            this.ball.setPosition(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2); 
            this.ball.setVelocity(0, 0); 
        }
        if (this.xKey.isDown) {
            if (this.SOCKET) {
                this.SOCKET.emit('requestPutNextToBall');
            }
            this.ball.setPosition(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2); 
            this.ball.setVelocity(0, 0); 
            const OFFSET_X = 50; 
            const newPlayerPosition = {
                x: this.ball.body.position.x - OFFSET_X, 
                y: this.ball.body.position.y 
            };

            this.player.setPosition(newPlayerPosition.x, newPlayerPosition.y);
            this.player.setVelocity(0, 0); 
        }
        if (this.cKey.isDown) {
            if (this.SOCKET) {
                this.SOCKET.emit('requestPutDiagionalToBall');
            }
            this.ball.setPosition(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2); 
            this.ball.setVelocity(0, 0); 
            const OFFSET = 50; 
            const newPlayerPosition = {
                x: this.ball.body.position.x - OFFSET, 
                y: this.ball.body.position.y - OFFSET 
            };

            this.player.setPosition(newPlayerPosition.x, newPlayerPosition.y);
            this.player.setVelocity(0, 0); 
        }
        if (this.vKey.isDown) {
            if (this.SOCKET) {
                this.SOCKET.emit('diagionalTestCombo');
                const OFFSET = 170; 
                this.ball.setPosition(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2 - OFFSET); 
                this.ball.setVelocity(-5, -3); 
                this.ball3.setPosition(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2 - OFFSET); 
                this.ball3.setVelocity(-5, -3); 
            }
        }
        if (this.bKey.isDown) {
            this.ball.setPosition(this.ball.body.position.x + 4, this.ball.body.position.y); 
        }
        if (this.ball && this.ball1) {
            const dx = this.ball.body.position.x - this.ball1.body.position.x;
            const dy = this.ball.body.position.y - this.ball1.body.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Log khoảng cách và vị trí của cả 2 bóng
            // console.log({
            //     distance: distance.toFixed(2) + 'px',
            //     ball: {
            //         x: this.ball.body.position.x.toFixed(2),
            //         y: this.ball.body.position.y.toFixed(2)
            //     },
            //     ball1: {
            //         x: this.ball1.body.position.x.toFixed(2),
            //         y: this.ball1.body.position.y.toFixed(2)
            //     },
            //     difference: {
            //         x: dx.toFixed(2),
            //         y: dy.toFixed(2)
            //     }
            // });
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
                const newPlayer = new PlayerController(this);
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
            const disconnectsedPlayerId = data.playerId;
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