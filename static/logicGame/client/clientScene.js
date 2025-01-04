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
        this.gameStarted = false; 
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
        
        
        this.visibleServerBall = false; 
        this.visibleClientBall = false;  
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

        this.kickSounds = [
        ];


    }
    preload() {
        this.load.audio('endGameSound', '/static/sound/endGameSound/endGameSound1.mp3');
        this.scoreboard = new Scoreboard();
        
        // Thêm listener cho sự kiện 9 giây cuối
        this.scoreboard.setWarningTimeCallback(() => {
            if (!this.isEndGameSoundPlaying && this.endGameSound) {
                this.endGameSound.play();
                this.isEndGameSoundPlaying = true;
            }
        });
        
        // Thêm listener cho sự kiện hết giờ
        this.scoreboard.setTimeUpCallback(() => {
            if (this.endGameSound && this.isEndGameSoundPlaying) {
                this.endGameSound.stop();
                this.isEndGameSoundPlaying = false;
            }
        });



        this.load.on('filecomplete', (key, type, data) => {
            console.log('Successfully loaded:', key, type);
        });
    
        this.load.on('loaderror', (file) => {
            console.error('Error loading file:', file.key);
            console.error('File URL:', file.url);
        });

        this.load.audio('kick1', '/static/sound/normalKickSound/normalKick1.mp3');
    }
    create() {
        this.endGameSound = this.sound.add('endGameSound', {
            volume: 1,
            loop: true
        });
        this.kickSound = this.sound.add('kick1');
        this.kickSounds = [this.kickSound];
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

        this.menuDisplay = new MenuDisplay(this);
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
        if (this.player && this.gameStarted) this.player.update();
        if (this.ball) this.ball.update();
        if (this.ball1) this.ball1.update();
        
        // Update interpolation
        if (this.interpolators) {
            this.interpolators.update();
        }
    }

    // CONSTATLY UPDATE SCENE 
    update() {
        if (this.menuDisplay) {
            this.menuDisplay.update();
        }
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
            this.ball3.setPosition(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2); 
            this.ball3.setVelocity(0, 0); 
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
    letCelebrate (data) {
        const {gameConfig} = CONFIG; 
        const timeElapsed = Date.now() - data.timeStamp;
        const remainingCelebrationTime = Math.max(0, gameConfig.celebrationTime * 1000 - timeElapsed);    
        var goalDuration = gameConfig.goalPercent * remainingCelebrationTime; 
        var cheerDuration = gameConfig.cheerPercent * remainingCelebrationTime; 
        // chỗ này update scoreboard 
        this.scoreboard.updateScore(data.side, data.scores[data.side]);

        // chỗ này là show text goal cho nó cái tâm ở đâu đó 
        const remainingTime = Math.max(0, remainingCelebrationTime - (goalDuration + cheerDuration));
        console.log("Remaining time until countdown: ", remainingTime); 
        // GoalText xong rồi thì chỗ này là show text cheer duration 

        // xong rồi sau celebrationTime thì tính countDown reset game, kiểu ra số đếm ở giữa sân là 2 1 rồi reset game
        // Show Goal Text
        this.showGoalText(goalDuration, () => {
            this.showCheerText(data, cheerDuration, () => {
                const remainingTime = Math.max(0, remainingCelebrationTime - (goalDuration + cheerDuration));
                console.log('Starting countdown after:', remainingTime);
                this.time.delayedCall(remainingTime, () => {
                    this.showCountdown();
                });
            });
        });
        
    }
    showGoalText(duration, callback) {
        const container = this.add.container(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2);
        
        const goalText = this.add.text(0, 0, 'GOAL!', {
            fontSize: '120px',
            fontFamily: 'Arial Black',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);
        
        goalText.setBlendMode(Phaser.BlendModes.ADD);
        goalText.setPipeline('rexGlowPostFx');
        goalText.postFX.add({
            distance: 15,
            outerStrength: 4,
            innerStrength: 2,
            color: 0xffffff
        });
        
        container.add(goalText);
        
        // Sử dụng duration được truyền vào
        this.tweens.add({
            targets: goalText,
            scaleX: { from: 0.1, to: 1.2 },
            scaleY: { from: 0.1, to: 1.2 },
            alpha: { from: 0, to: 1 },
            duration: duration * 0.3, // Dành 30% thời gian cho animation vào
            ease: 'Back.easeOut',
            onComplete: () => {
                // Giữ text trong 40% thời gian
                this.time.delayedCall(duration * 0.4, () => {
                    // Fade out trong 30% thời gian còn lại
                    this.tweens.add({
                        targets: container,
                        alpha: 0,
                        duration: duration * 0.3,
                        onComplete: () => {
                            container.destroy();
                            if (callback) callback();
                        }
                    });
                });
            }
        });
    }
    showCheerText(data, duration, callback) {
        const container = this.add.container(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2);
        
        const scorerText = this.add.text(0, -30, `${data.scorer} scores!`, {
            fontSize: '48px',
            fontFamily: 'Arial',
            color: '#FFFFFF',
            align: 'center'
        }).setOrigin(0.5);
        
        if (data.assister) {
            const assistText = this.add.text(0, 30, `Assist: ${data.assister}`, {
                fontSize: '32px',
                fontFamily: 'Arial',
                color: '#CCCCCC',
                align: 'center'
            }).setOrigin(0.5);
            container.add(assistText);
        }
        
        container.add(scorerText);
        
        // Svử dụng duration được truyền vào
        this.tweens.add({
            targets: container,
            alpha: { from: 0, to: 1 },
            duration: duration * 0.3, // Fade in trong 30% thời gian
            ease: 'Power2',
            onComplete: () => {
                // Hiển thị trong 40% thời gian
                this.time.delayedCall(duration * 0.4, () => {
                    // Fade out trong 30% thời gian còn lại
                    this.tweens.add({
                        targets: container,
                        alpha: 0,
                        duration: duration * 0.3,
                        onComplete: () => {
                            container.destroy();
                            if (callback) callback();
                        }
                    });
                });
            }
        });
    }
    showCountdown() {
        console.log('Showing countdown');
        const countdownDuration = CONFIG.gameConfig.resetGameCountDown;
        let timeLeft = countdownDuration;
    
        const countdownText = this.add.text(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2, '', {
            fontSize: '64px',
            fontFamily: 'Arial',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5).setDepth(1000);
    
        const updateCountdown = () => {
            if (timeLeft > 0) {
                countdownText.setText(timeLeft.toString());
                
                this.tweens.add({
                    targets: countdownText,
                    scaleX: { from: 1.5, to: 1 },
                    scaleY: { from: 1.5, to: 1 },
                    duration: Math.min(500, 800), // Giảm duration để đảm bảo animation kết thúc trước số tiếp theo
                    ease: 'Power2'
                });
    
                timeLeft--;
                if (timeLeft > 0) {
                    setTimeout(updateCountdown, 1000);
                } else {
                    // Khi countdown kết thúc, giữ số 1 trong 500ms rồi mới fade out
                    setTimeout(() => {
                        this.tweens.add({
                            targets: countdownText,
                            alpha: 0,
                            duration: 500,
                            onComplete: () => {
                                countdownText.destroy();
                            }
                        });
                    }, 500);
                }
            }
        };
    
        updateCountdown();
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
            if (data.scores) {
                this.gameState.scores = data.scores;
                this.scoreboard.updateScore('left', data.scores.left);
                this.scoreboard.updateScore('right', data.scores.right);
            }
        });

        // ------ GAME STATE UPDATE -------
        socket.on('sendGameState', (data) => {
            this.handleGameState(data);
        });
        socket.on('sendBallState', (data) => {
            this.ball.handleBallState(data); 
        }); 
        socket.on('gameStart', (data) => {
            var startedTime = data.timeStamp; 
            var remainderTime = Date.now() - data.timeStamp; 
            var durationCountDown = Math.max(0, remainderTime - 3000);
            var serverStarTime = 3000 + data.timeStamp; 
            this.showStartCountdown(durationCountDown, () => {
                var elapsedTime = Date.now() - serverStarTime; 
                this.gameStarted = true; 
                this.scoreboard.resetClock(); // bạn thêm giúp tôi tính năng là nó count down tại lúc mà game đã bắt đầu elapsed time ấy 
                this.scoreboard.startCountDown(elapsedTime);
            }); 
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
        socket.on('celebration', (data) => {
            this.letCelebrate(data); 
        }); 
        socket.on('sendScoreboardState', (data) => {
            this.gameState.scores = data.scores;
            this.scoreboard.updateScore('left', data.scores.left);
            this.scoreboard.updateScore('right', data.scores.right);
        });

        // ----- SOUND UPDATE ------- 
        socket.on('kickingSound',() => {
            var soundType = CONFIG.sound.type; 
            if (this.kickSounds[soundType - 1]) {
                console.log("Sound being played"); 
                this.kickSounds[soundType - 1].play();
            }
            // Tôi có một list các sound sút bóng đã được tải rồi, giờ làm sao tôi có thể sắp xếp thứ tự nó từ 1 đến n, và play cái sound thứ soundType ? 
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
    showStartCountdown(duration, callback) {
        if (this.countdownContainer) {
            this.countdownContainer.destroy();
        }
        
        let countdownContainer = this.add.container(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2);
        this.countdownContainer = countdownContainer;
        
        const countdownText = this.add.text(0, 0, '3', {
            fontSize: '144px',
            fontFamily: 'Arial Black',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center',
            resolution: 1
        }).setOrigin(0.5);
        
        countdownText.setBlendMode(Phaser.BlendModes.NORMAL);
        countdownContainer.add(countdownText);
        countdownContainer.setDepth(9999);
        
        let currentNumber = 3;
        let isDestroyed = false;
        
        const updateNumber = () => {
            if (isDestroyed || !countdownText || !countdownText.scene) {
                return;
            }
    
            if (currentNumber > 0) {
                // Fade out số hiện tại
                this.tweens.add({
                    targets: countdownText,
                    alpha: 0,
                    scale: 0.8,
                    duration: 150,
                    ease: 'Power1',
                    onComplete: () => {
                        if (!isDestroyed) {
                            currentNumber--;
                            if (currentNumber > 0) {
                                // Cập nhật số mới và fade in
                                countdownText.setText(currentNumber.toString());
                                countdownText.setScale(1.2);
                                
                                this.tweens.add({
                                    targets: countdownText,
                                    alpha: 1,
                                    scale: 1,
                                    duration: 150,
                                    ease: 'Back.easeOut',
                                    onComplete: () => {
                                        if (!isDestroyed) {
                                            // Đợi một chút trước khi bắt đầu số tiếp theo
                                            this.time.delayedCall(700, () => {
                                                if (!isDestroyed) {
                                                    updateNumber();
                                                }
                                            });
                                        }
                                    }
                                });
                            } else {
                                showGo();
                            }
                        }
                    }
                });
            }
        };
        
        const showGo = () => {
            if (isDestroyed || !countdownText || !countdownText.scene) {
                return;
            }
    
            countdownText.setText('GO!');
            countdownText.setStyle({
                color: '#00FF00',
                fontSize: '144px',
                stroke: '#000000',
                strokeThickness: 4
            });
            countdownText.setScale(1.5);
            countdownText.setAlpha(0);
            
            this.tweens.add({
                targets: countdownText,
                scale: 1,
                alpha: 1,
                duration: 300,
                ease: 'Back.easeOut',
                onComplete: () => {
                    if (!isDestroyed) {
                        this.time.delayedCall(500, () => {
                            if (!isDestroyed) {
                                this.tweens.add({
                                    targets: countdownContainer,
                                    alpha: 0,
                                    duration: 200,
                                    onComplete: () => {
                                        isDestroyed = true;
                                        countdownContainer.destroy();
                                        if (callback) callback();
                                    }
                                });
                            }
                        });
                    }
                }
            });
        };
        
        this.events.once('shutdown', () => {
            isDestroyed = true;
            if (countdownContainer) {
                countdownContainer.destroy();
            }
        });
        
        // Bắt đầu với số 3
        countdownText.setAlpha(0);
        countdownText.setScale(1.2);
        
        this.tweens.add({
            targets: countdownText,
            alpha: 1,
            scale: 1,
            duration: 150,
            ease: 'Back.easeOut',
            onComplete: () => {
                if (!isDestroyed) {
                    this.time.delayedCall(700, () => {
                        if (!isDestroyed) {
                            updateNumber();
                        }
                    });
                }
            }
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