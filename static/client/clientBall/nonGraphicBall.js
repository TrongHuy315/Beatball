class NonGraphicBall {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.damping = this.config.physics.damping; 
        this.initialize();
    }

    initialize() {
        this.body = this.createPhysicsBody();
    }

    createPhysicsBody() {
        const { physics } = this.config;
        const ballCategory = this.scene.categories.ball;
        const nonGraphicBallCategory = this.scene.categories.nonGraphicBall;
        return this.scene.matter.add.circle(
            this.scene.scale.width / 2,
            this.scene.scale.height / 2,
            physics.radius,
            {
                label: 'authorityBall',
                mass: physics.mass,
                restitution: physics.restitution,
                friction: physics.friction,
                frictionAir: physics.frictionAir,
                inertia: physics.inertia,
                frictionStatic: physics.frictionStatic,
                isStatic: false,
                slop: physics.slop,
                velocity: { x: 0, y: 0 },
                collisionFilter: {
                    category: nonGraphicBallCategory, 
                    mask: ~ballCategory 
                }
            }
        );
    }
    update() {
        this.body.angle = 0;
        var xx = this.body.velocity.x * this.damping; 
        var yy = this.body.velocity.y * this.damping; 
        this.setVelocity(xx, yy); 
        this.setVelocity(0, 0); 
    }
    updateServer(serverState) {
        // Cập nhật trực tiếp từ server state
        if (serverState) {
            this.setPosition(serverState.position.x, serverState.position.y);
            this.setVelocity(serverState.velocity.x, serverState.velocity.y);
        }
    }

    setVelocity(x, y) {
        this.scene.matter.setVelocity(this.body, x, y);
    }

    getVelocity() {
        return this.body.velocity;
    }

    setPosition(xx, yy) {
        this.scene.matter.body.setPosition(this.body, {x: xx, y: yy});
    }

    getPosition() {
        return this.body.position;
    }

    destroy() {
        if (this.body && this.scene && this.scene.matter) {
            this.scene.matter.world.remove(this.body);
            this.body = null;
        }
        this.scene = null;
        this.config = null;
    }
}