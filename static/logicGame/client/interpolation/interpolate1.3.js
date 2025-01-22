/**********************************************************
 * LERP INTERPOLATION - NO BUFFER, NO DELAY
 * Just always move toward the latest server state
 **********************************************************/

class LatestStateInterpolator {
    constructor(scene) {
        this.scene = scene;
        // Store the latest reported server position for each entity { entityId -> { x, y } }
        this.latestPositions = new Map();
    }

    /**
     * Update or store the latest position for an entity
     */
    updateEntityState(entityId, position) {
        this.latestPositions.set(entityId, {
            x: position.x,
            y: position.y
        });
    }

    /**
     * Retrieve the latest position the server sent for a given entity
     */
    getLatestPosition(entityId) {
        return this.latestPositions.get(entityId) || null;
    }

    /**
     * Remove an entity (e.g. if the player leaves)
     */
    removeEntity(entityId) {
        this.latestPositions.delete(entityId);
    }
}

class InterpolationManager {
    constructor(scene) {
        this.scene = scene;
        this.gameInterpolator = new LatestStateInterpolator(scene);

        // This factor governs how quickly we LERP:
        //  0.0 = no movement, 1.0 = instantly snap to server position
        //  Something like 0.15-0.25 often feels okay
        this.lerpFactor = 0.15;

        // Hook up socket events
        this.setupSocketEvents();
    }

    setupSocketEvents() {
        // Listen for "sendGameState" from server
        this.scene.SOCKET.on('sendGameState', (data) => {
            const players = data.players;
            // Update for each remote player
            for (const playerId in players) {
                if (playerId !== this.scene.playerId) {
                    // This is the newly reported server position
                    const position = players[playerId].position;
                    this.gameInterpolator.updateEntityState(playerId, position);
                }
            }
        });

        // If new players join:
        this.scene.SOCKET.on('newPlayerJoin', (data) => {
            if (data.playerId !== this.scene.playerId) {
                const playerConfig = {
                    data: {
                        name: data.name || "Player",
                        shirt: data.shirtNumber?.toString() || "0",
                        side: data.side || "left"
                    }
                };
                // Create the local representation of that remote player
                const newPlayer = new InterpolatedPlayer(this.scene, playerConfig);
                newPlayer.create(data.position.x, data.position.y);
                this.scene.players.set(data.playerId, newPlayer);

                // Record their initial position
                this.gameInterpolator.updateEntityState(data.playerId, data.position);
            }
        });
    }

    /**
     * Call this every frame (e.g. in your Phaser update() loop).
     * We move remote players' positions toward the latest known server position.
     */
    update() {
        // For each remote player, LERP to the stored “latest” position
        for (const [playerId, player] of this.scene.players.entries()) {
            // Skip local (your own) player
            if (playerId === this.scene.playerId) continue;

            // Get the latest server position
            const targetPos = this.gameInterpolator.getLatestPosition(playerId);
            if (targetPos && player.body) {
                // Current position
                const oldX = player.body.position.x;
                const oldY = player.body.position.y;

                // Lerp to the new position
                const newX = oldX + this.lerpFactor * (targetPos.x - oldX);
                const newY = oldY + this.lerpFactor * (targetPos.y - oldY);

                // Update the sprite/body
                player.setPosition(newX, newY);
            }
        }
    }

    /**
     * Cleanly remove a player from interpolation and your local store
     */
    removePlayer(playerId) {
        this.gameInterpolator.removeEntity(playerId);
        this.scene.players.delete(playerId);
    }
}

export {
    LatestStateInterpolator,
    InterpolationManager
};