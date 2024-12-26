const Matter = require('matter-js');
const CONFIG = require('./config.js');

class Ball {
    constructor(world) {
        this.world = world;
        this.config = CONFIG.ball;
        this.body = null;
        this.isColliding = false;
        this.oldVelocities = new Map();
        this.damping = this.config.physics.damping;
        
        this.initialize();
    }

    initialize() {
        this.body = this.createPhysicsBody();
        Matter.World.add(this.world, this.body);
        Matter.Events.on(this.world, 'beforeUpdate', () => {
            if (!this.isColliding) {
                this.oldVelocities.set(this.body.id, {
                    x: this.body.velocity.x,
                    y: this.body.velocity.y
                });
            }
            this.afterPhysicsUpdate();
        });

        Matter.Events.on(this.world, 'collisionStart', (event) => {
            this.isColliding = true;
        });

        Matter.Events.on(this.world, 'collisionEnd', () => {
            this.isColliding = false;
        });

        Matter.Events.on(this.world, 'collisionActive', (event) => {
            const oldVel = this.oldVelocities.get(this.body.id);
            
            event.pairs.forEach((pair) => {
                const ball = pair.bodyA.label === 'ball' ? pair.bodyA :
                            (pair.bodyB.label === 'ball' ? pair.bodyB : null);
                const wall = pair.bodyA.label === 'wall' ? pair.bodyA :
                            (pair.bodyB.label === 'wall' ? pair.bodyB : null);

                if (ball && wall && oldVel) {
                    const currentVel = {
                        x: ball.velocity.x,
                        y: ball.velocity.y
                    };

                    const EPSILON = 0.0001;
                    if (Math.abs(currentVel.x) < EPSILON || Math.abs(currentVel.y) < EPSILON) {
                        if (Math.abs(currentVel.x) < EPSILON) {
                            this.setVelocity(
                                -oldVel.x * this.config.physics.restitution,
                                currentVel.y
                            );
                        }
                        if (Math.abs(currentVel.y) < EPSILON) {
                            this.setVelocity(
                                currentVel.x,
                                -oldVel.y * this.config.physics.restitution
                            );
                        }
                    }
                }
            });
        });
    }

    afterPhysicsUpdate() {
        const xx = this.body.velocity.x * this.damping;
        const yy = this.body.velocity.y * this.damping;
        this.setVelocity(xx, yy);
    }

    createPhysicsBody() {
        const { physics } = this.config;
        
        return Matter.Bodies.circle(
            CONFIG.totalWidth / 2,  // center x
            CONFIG.totalHeight / 2, // center y
            physics.radius,
            {
                label: 'ball',
                mass: physics.mass,
                restitution: physics.restitution,
                friction: physics.friction,
                frictionAir: physics.frictionAir,
                inertia: physics.inertia,
                frictionStatic: physics.frictionStatic,
                angle: physics.angle,
                isStatic: false,
                slop: physics.slop
            }
        );
    }

    controlSpeed() {
        const velocity = this.body.velocity;
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        
        if (speed > this.config.limits.maxSpeed) {
            const scale = this.config.limits.maxSpeed / speed;
            this.setVelocity(
                velocity.x * scale,
                velocity.y * scale
            );
        }
    }

    reset() {
        const centerX = CONFIG.totalWidth / 2;
        const centerY = CONFIG.totalHeight / 2;
        this.setPosition(centerX, centerY);
        this.setVelocity(0, 0);
        this.damping = this.config.physics.damping;
    }

    setVelocity(x, y) {
        Matter.Body.setVelocity(this.body, { x, y });
    }

    getVelocity() {
        return this.body.velocity;
    }

    setPosition(x, y) {
        Matter.Body.setPosition(this.body, { x, y });
    }

    getPosition() {
        return this.body.position;
    }

    destroy() {
        Matter.World.remove(this.world, this.body);
        Matter.Events.off(this.world, 'beforeUpdate');
        Matter.Events.off(this.world, 'collisionStart');
        Matter.Events.off(this.world, 'collisionEnd');
        Matter.Events.off(this.world, 'collisionActive');
    }
}

module.exports = Ball;