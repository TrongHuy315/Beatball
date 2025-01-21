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
        this.haveLerp = false; 
        
        // Disable input handling
        this.cursors = null;

        // Store playerId if provided
        this.playerId = info?.playerId || null;
    }

    // Override createPhysicsBody để set isStatic = true
    createPhysicsBody(x, y) {
        const { radius } = CONFIG.player.graphic;
        const physics = CONFIG.player.physics;
        const categories = {
            outer: 0x0001,         // 000001
            inner: 0x0002,         // 000010
            player: 0x0004,        // 000100
            ball: 0x0008,          // 001000
            net: 0x0010,           // 010000
            nonGraphicBall: 0x0020, // 100000
            predictBall: 0x0040     // 1000000
        };
        return this.scene.matter.add.circle(x, y, radius, {
            label: 'interpolatePlayer', 
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
                mask: ~(this.scene.categories.inner | this.scene.categories.ball)
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