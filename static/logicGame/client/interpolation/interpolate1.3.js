class LatestStateInterpolator {
    constructor(scene) {
        this.scene = scene;
        // Store the latest server states with timestamp
        this.latestStates = new Map(); // entityId -> { position, velocity, timestamp }
    }

    updateEntityState(entityId, position, velocity, timestamp) {
        this.latestStates.set(entityId, {
            position: { x: position.x, y: position.y },
            velocity: { x: velocity.x, y: velocity.y },
            timestamp: timestamp
        });
    }

    getLatestState(entityId) {
        return this.latestStates.get(entityId) || null;
    }

    removeEntity(entityId) {
        this.latestStates.delete(entityId);
    }

    computePredictedState(serverState) {
        const currentTime = this.scene.networkManager.getServerTime();
        const deltaTime = (currentTime - serverState.timestamp) / 1000;
        const FPS = 60;
        const frameTime = 1 / FPS;
        const frames = Math.floor(deltaTime / frameTime);

        const dampingFactor = 0.96; // Player damping factor
        const dampingPower = Math.pow(dampingFactor, 1);

        // Start with the server state
        let position = { ...serverState.position };
        let velocity = { ...serverState.velocity };

        // Forward simulate the frames
        for (let i = 0; i < frames; i++) {
            // Update position based on velocity
            position.x += velocity.x;
            position.y += velocity.y;

            // // Apply velocity damping
            // velocity.x *= dampingPower;
            // velocity.y *= dampingPower;
        }

        return {
            position,
            velocity
        };
    }
}

class InterpolationManager {
    constructor(scene) {
        this.scene = scene;
        this.gameInterpolator = new LatestStateInterpolator(scene);

        // Lerp configuration
        this.minLerp = 0.01;   // minimum lerp (when near)
        this.maxLerp = 0.2;    // maximum lerp (when far)
        this.maxDistForLerp = 200; // distance threshold for max lerp
        this.teleportThreshold = 300; // distance threshold for teleporting

        this.setupSocketEvents();
    }

    setupSocketEvents() {
        this.scene.SOCKET.on('sendGameState', (data) => {
            const players = data.players;
            const timestamp = this.scene.networkManager.getServerTime(); // You might want to use server timestamp if available

            for (const playerId in players) {
                if (playerId !== this.scene.playerId) {
                    const playerData = players[playerId];
                    this.gameInterpolator.updateEntityState(
                        playerId,
                        playerData.position,
                        playerData.velocity,
                        timestamp
                    );
                }
            }
        });

        this.scene.SOCKET.on('newPlayerJoin', (data) => {
            if (data.playerId !== this.scene.playerId) {
                const playerConfig = {
                    data: {
                        name: data.name || "Player",
                        shirt: data.shirtNumber?.toString() || "0",
                        side: data.side || "left"
                    }
                };
                
                const newPlayer = new InterpolatedPlayer(this.scene, playerConfig);
                newPlayer.create(data.position.x, data.position.y);
                this.scene.players.set(data.playerId, newPlayer);

                this.gameInterpolator.updateEntityState(
                    data.playerId,
                    data.position,
                    data.velocity || { x: 0, y: 0 },
                    this.scene.networkManager.getServerTime()
                );
            }
        });
    }

    update() {
        for (const [playerId, player] of this.scene.players.entries()) {
            if (playerId === this.scene.playerId) continue;

            const serverState = this.gameInterpolator.getLatestState(playerId);
            if (!serverState || !player.body) continue;

            // Get predicted state based on server state
            const predictedState = this.gameInterpolator.computePredictedState(serverState);
            const currentPos = player.getPosition();

            // Calculate distance to predicted position
            const distance = Phaser.Math.Distance.Between(
                currentPos.x, currentPos.y,
                predictedState.position.x, predictedState.position.y
            );

            // Teleport if too far
            if (distance > this.teleportThreshold) {
                player.setPosition(predictedState.position.x, predictedState.position.y);
                return;
            }

            // Calculate dynamic lerp factor
            const distRatio = Phaser.Math.Clamp(distance / this.maxDistForLerp, 0, 1);
            const lerpFactor = this.minLerp + distRatio * (this.maxLerp - this.minLerp);

            // Lerp to predicted position
            const newX = currentPos.x + (predictedState.position.x - currentPos.x) * lerpFactor;
            const newY = currentPos.y + (predictedState.position.y - currentPos.y) * lerpFactor;
            player.setPosition(newX, newY);
        }
    }

    removePlayer(playerId) {
        this.gameInterpolator.removeEntity(playerId);
        this.scene.players.delete(playerId);
    }
}
