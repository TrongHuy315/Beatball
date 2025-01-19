class InterpolatedPlayer extends PlayerController {
    constructor(scene, info) {
        console.log('InterpolatedPlayer constructor called with info:', info);
        super(scene, info);
        // Pass the team configuration to parent
        this.data = {
            goals: 0,
            assists: 0,
            name: info ? info.data.name : "Player",
            shirt: info ? info.data.shirtNumber || info.data.shirt || "0" : "0",
            side: info ? info.data.side : "left"
        };
        
        // Disable input handling
        this.cursors = null;

        // Store playerId if provided
        this.playerId = info?.playerId || null;
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