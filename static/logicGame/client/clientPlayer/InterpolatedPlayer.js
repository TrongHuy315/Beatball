class InterpolatedPlayer extends PlayerController {
    constructor(scene, teamConfig) {
        super(scene, teamConfig);
        // Vô hiệu hóa xử lý input cho interpolated players
        this.cursors = null;
        
        this.name = null; 
        this.number = null; 
        this.side = null; 
        this.spawnX = null; 
        this.spawnY = null;
        this.playerId = null; 
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