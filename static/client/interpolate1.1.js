class EntityInterpolation {
    constructor() {
        this.stateBuffer = [];
        this.interpolationDelay = 100; // 100ms delay
        this.maxBufferSize = 60;
    }

    addState(state) {
        this.stateBuffer.push(state);
        this.stateBuffer.sort((a, b) => a.timestamp - b.timestamp);
        
        if (this.stateBuffer.length > this.maxBufferSize) {
            this.stateBuffer.shift();
        }
    }

    getCurrentState(currentTime) {
        const renderTimestamp = currentTime - this.interpolationDelay;
        const [oldState, newState] = this.findStates(renderTimestamp);
        
        if (!oldState || !newState) {
            return oldState || newState || null;
        }

        const timeDiff = newState.timestamp - oldState.timestamp;
        const t = Math.max(0, Math.min(1, (renderTimestamp - oldState.timestamp) / timeDiff));

        return {
            position: {
                x: oldState.position.x + (newState.position.x - oldState.position.x) * t,
                y: oldState.position.y + (newState.position.y - oldState.position.y) * t
            }
        };
    }

    findStates(timestamp) {
        let oldState = null;
        let newState = null;

        for (let i = 0; i < this.stateBuffer.length; i++) {
            const state = this.stateBuffer[i];
            if (state.timestamp <= timestamp) {
                oldState = state;
            } else {
                newState = state;
                break;
            }
        }

        return [oldState, newState];
    }

    clearBuffer() {
        this.stateBuffer = [];
    }
}

class GameInterpolator {
    constructor() {
        this.interpolators = new Map(); // Map để lưu interpolator cho từng entity
        this.lastUpdateTime = Date.now();
    }

    // Thêm hoặc cập nhật state cho một entity
    updateEntityState(entityId, position) {
        if (!this.interpolators.has(entityId)) {
            this.interpolators.set(entityId, new EntityInterpolation());
        }

        const interpolator = this.interpolators.get(entityId);
        interpolator.addState({
            timestamp: Date.now(),
            position: position
        });
    }

    // Lấy vị trí đã được interpolate cho một entity
    getInterpolatedPosition(entityId) {
        const interpolator = this.interpolators.get(entityId);
        if (!interpolator) return null;

        const currentTime = Date.now();
        return interpolator.getCurrentState(currentTime);
    }

    // Xóa một entity khỏi interpolation system
    removeEntity(entityId) {
        this.interpolators.delete(entityId);
    }
}

class InterpolationManager {
    constructor(scene) {
        this.scene = scene;
        this.gameInterpolator = new GameInterpolator();
        this.setupInterpolation();
    }

    setupInterpolation() {
        this.scene.SOCKET.on('sendGameState', (data) => {
            const players = data.players;
            for (const playerId in players) {
                if (playerId !== this.scene.playerId) {
                    this.gameInterpolator.updateEntityState(playerId, players[playerId].position);
                }
            }
        });
    }

    update() {
        for (const [playerId, player] of this.scene.players.entries()) {
            if (playerId !== this.scene.playerId) {
                const interpolatedState = this.gameInterpolator.getInterpolatedPosition(playerId);
                if (interpolatedState && player.body) {
                    player.setPosition(interpolatedState.position.x, interpolatedState.position.y);
                }
            }
        }
    }

    removePlayer(playerId) {
        this.gameInterpolator.removeEntity(playerId);
    }
}

