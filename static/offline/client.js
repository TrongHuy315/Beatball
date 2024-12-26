// static/js/game-client.js
class GameClient {
    constructor() {
        this.socket = io();
        this.localPlayer = null;
        this.remotePlayers = new Map();
        this.setupSocketEvents();
    }

    setupSocketEvents() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.socket.emit('join-game', {
                x: player.getPosition().x,
                y: player.getPosition().y,
                team: 'left', // hoặc 'right' tùy vào team
                number: CONFIG.player.graphic.numberConfig.value,
                name: CONFIG.player.graphic.nameConfig.value
            });
        });

        this.socket.on('game-state', (gameState) => {
            this.initializeGameState(gameState);
        });

        this.socket.on('player-joined', (playerData) => {
            this.addRemotePlayer(playerData);
        });

        this.socket.on('player-moved', (moveData) => {
            this.updateRemotePlayer(moveData);
        });

        this.socket.on('ball-moved', (ballData) => {
            this.updateBall(ballData);
        });

        this.socket.on('score-update', (scoreData) => {
            scoreboard.updateScore('left', scoreData.left);
            scoreboard.updateScore('right', scoreData.right);
        });

        this.socket.on('player-left', (playerId) => {
            this.removeRemotePlayer(playerId);
        });
    }

    initializeGameState(gameState) {
        gameState.players.forEach(playerData => {
            if (playerData.id !== this.socket.id) {
                this.addRemotePlayer(playerData);
            }
        });
        
        ball.setPosition(gameState.ball.x, gameState.ball.y);
        ball.setVelocity(gameState.ball.velocity_x, gameState.ball.velocity_y);
        
        scoreboard.updateScore('left', gameState.score.left);
        scoreboard.updateScore('right', gameState.score.right);
    }

    addRemotePlayer(playerData) {
        const remotePlayer = new PlayerController(gameScene);
        remotePlayer.create(playerData.x, playerData.y);
        remotePlayer.isLocal = false;
        remotePlayer.id = playerData.id;
        this.remotePlayers.set(playerData.id, remotePlayer);
    }

    updateRemotePlayer(moveData) {
        const remotePlayer = this.remotePlayers.get(moveData.id);
        if (remotePlayer) {
            remotePlayer.setPosition(moveData.x, moveData.y);
        }
    }

    removeRemotePlayer(playerId) {
        const remotePlayer = this.remotePlayers.get(playerId);
        if (remotePlayer) {
            remotePlayer.destroy();
            this.remotePlayers.delete(playerId);
        }
    }

    sendPlayerPosition(x, y) {
        this.socket.emit('player-move', { x, y });
    }

    sendBallPosition(x, y, velocityX, velocityY) {
        this.socket.emit('ball-move', {
            x, y, velocityX, velocityY
        });
    }

    sendGoalScored(team) {
        this.socket.emit('goal-scored', { team });
    }
}