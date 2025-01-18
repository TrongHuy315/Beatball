class InterpolatedPlayer extends PlayerController {
    constructor(scene, teamConfig) {
        // Pass the team configuration to parent
        this.data = {
            goal: 0,
            assist: 0,
            name: info?.data?.name || "Player",
            shirt: info?.data?.shirt || "0",
            side: info?.data?.side || "left"
        };
        
        // Disable input handling
        this.cursors = null;

        // Store playerId if provided
        this.playerId = teamConfig?.data?.playerId || null;
    }

    // Override createPhysicsBody để set isStatic = true
    createPhysicsBody(x, y) {
        const { radius } = CONFIG.player.graphic;
        const physics = CONFIG.player.physics;
        return this.scene.matter.add.circle(x, y, radius, {
            label: 'player', 
            mass: physics.mass,
            restitution: physics.restitution,
            friction: physics.friction,
            frictionAir: physics.frictionAir,
            frictionStatic: physics.frictionStatic,
            inertia: physics.inertia,
            slop: physics.slop,
            isStatic: true,  // Set static để velocity luôn = 0
            collisionFilter: {
                category: this.scene.categories.player,
                mask: ~this.scene.categories.inner
            }
        });
    }

    applyData(data) {
        this.name = data.name; 
        this.number = data.number; 
        this.side = data.side; 
        this.spawnX = data.spawnX; 
        this.spawnY = data.spawnY; 
        this.playerId = data.playerId; 
        this.create(this.spawnX, this.spawnY); 
    }

    processInput() {
        return null;
    }

    update() {
        this.updateAura();
    }

    updateFromServer(state) {
        if (state.position) {
            this.setPosition(state.position.x, state.position.y);
        }
        
        if (typeof state.shooting !== 'undefined') {
            if (state.shooting) {
                this.playAuraAnimation();
            }
        }
        
        if (typeof state.isGhostMode !== 'undefined') {
            if (state.isGhostMode && !this.isGhostMode) {
                this.activateGhostMode();
            } else if (!state.isGhostMode && this.isGhostMode) {
                this.deactivateGhostMode();   
            }
        } 
    }
}