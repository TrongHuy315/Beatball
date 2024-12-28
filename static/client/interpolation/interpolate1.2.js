class EntityInterpolation {
    constructor(initialDelay = 100) {
        this.stateBuffer = [];
        this.interpolationDelay = initialDelay; // 100ms delay
        this.maxBufferSize = 60;
    }
    updateDelay(newDelay) {
        this.interpolationDelay = newDelay;
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
            // Nên thêm log để debug
            if (this.stateBuffer.length > 0) {
                console.debug(`Interpolation buffer: ${this.stateBuffer.length} states, 
                             oldest: ${this.stateBuffer[0].timestamp}, 
                             newest: ${this.stateBuffer[this.stateBuffer.length-1].timestamp}`);
            }
            return oldState || newState || null;
        }
    
        const timeDiff = newState.timestamp - oldState.timestamp;
        if (timeDiff === 0) return oldState; // Tránh chia cho 0
        
        const t = Math.max(0, Math.min(1, (renderTimestamp - oldState.timestamp) / timeDiff));
    
        // Có thể thêm velocity interpolation nếu cần
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
    updateInterpolationDelay(networkState) {
        const newDelay = this.calculateOptimalDelay(networkState);
        this.interpolators.forEach(interpolator => {
            interpolator.updateDelay(newDelay);
        });
    }
    calculateOptimalDelay(networkState) {
        // Base delay on network conditions
        const baseDelay = networkState.latency * 1.2; // 1.5x latency as base
        const jitterBuffer = networkState.jitter * 0; // 2x jitter as buffer
        const serverTickRate = (1000 / 60); 
        
        // Minimum and maximum bounds for delay
        const minDelay = 30; // Minimum 50ms
        const maxDelay = 200; // Maximum 200ms
        
        // Calculate optimal delay
        const optimalDelay = baseDelay + jitterBuffer + serverTickRate;
        
        // Clamp between min and max
        return Math.min(Math.max(optimalDelay, minDelay), maxDelay);
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

        this.lastNetworkUpdate = Date.now();
        this.networkUpdateInterval = 1000; // Update every second
        this.debug = false;
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
        // Update interpolation delay based on network conditions
        const currentTime = Date.now();
        if (currentTime - this.lastNetworkUpdate >= this.networkUpdateInterval) {
            if (this.scene.perfMonitor) {
                const networkState = this.scene.perfMonitor.getCurrentNetworkState();
                this.gameInterpolator.updateInterpolationDelay(networkState);
                if (this.debug) {
                    console.debug('Network State:', networkState);
                    console.debug('Interpolation Stats:', this.getInterpolationStats());
                }
            }
            this.lastNetworkUpdate = currentTime;
        }
        for (const [playerId, player] of this.scene.players.entries()) {
            if (playerId !== this.scene.playerId) {
                const interpolatedState = this.gameInterpolator.getInterpolatedPosition(playerId);
                if (interpolatedState && player.body) {
                    player.setPosition(interpolatedState.position.x, interpolatedState.position.y);
                    if (this.debug) {
                        const delta = {
                            x: interpolatedState.position.x - prevPos.x,
                            y: interpolatedState.position.y - prevPos.y
                        };
                        if (Math.abs(delta.x) > 50 || Math.abs(delta.y) > 50) {
                            console.warn(`Large position delta for player ${playerId}:`, delta);
                        }
                    }
                }
            }
        }
    }

    removePlayer(playerId) {
        this.gameInterpolator.removeEntity(playerId);
    }
    getInterpolationStats() {
        return {
            delay: this.gameInterpolator.interpolators.values().next().value?.interpolationDelay || 0,
            bufferSizes: Array.from(this.gameInterpolator.interpolators.entries()).map(([id, interp]) => ({
                id,
                size: interp.stateBuffer.length
            }))
        };
    }
}

