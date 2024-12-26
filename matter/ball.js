const Matter = require('matter-js');
const { totalWidth } = require('./config.js');
class Ball {
    constructor(world, engine) {
        this.world = world;
        this.engine = engine; 
        this.config = require('./config.js').ball;
        this.initialize();
    }

    initialize() {
        this.damping = this.config.physics.damping; 
        this.body = this.createBody();
        this.isColliding = false;
        this.oldVelocities = new Map();

        Matter.Events.on(this.engine, 'beforeUpdate', () => {            
            if (!this.isColliding) {
                this.oldVelocities.set(this.body.id, {
                    x: this.body.velocity.x,
                    y: this.body.velocity.y
                });
            }
        });

        Matter.Events.on(this.engine, 'collisionStart', () => {
            this.isColliding = true;
        });

        Matter.Events.on(this.engine, 'collisionEnd', () => {
            this.isColliding = false;
        });

        Matter.Events.on(this.engine, 'collisionActive', (event) => {
            const oldVel = this.oldVelocities.get(this.body.id);
            if (!oldVel) return;

            event.pairs.forEach((pair) => {
                const ball = pair.bodyA.label === 'ball' ? pair.bodyA : 
                            (pair.bodyB.label === 'ball' ? pair.bodyB : null);
                const wall = pair.bodyA.label === 'wall' ? pair.bodyA : 
                            (pair.bodyB.label === 'wall' ? pair.bodyB : null);
    
                if (ball && wall) {
                    const currentVel = {x: ball.velocity.x, y: ball.velocity.y};
            
                    const EPSILON = 0.0001;
                    if (Math.abs(currentVel.x) < EPSILON || Math.abs(currentVel.y) < EPSILON) {
                        if (Math.abs(currentVel.x) < EPSILON) {
                            this.setVelocity(-oldVel.x * this.config.physics.restitution, currentVel.y); 
                        }
                        if (Math.abs(currentVel.y) < EPSILON) {
                            this.setVelocity(currentVel.x, -oldVel.y * this.config.physics.restitution); 
                        }
                    }
                }
            });
        });
        this.setPosition(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2); 
    }
    update() {
        var xx = this.body.velocity.x * this.damping; 
        var yy = this.body.velocity.y * this.damping; 
        this.setVelocity(xx, yy); 
    }
    createBody() {
        const { physics } = this.config;
        
        const body = Matter.Bodies.circle(
            CONFIG.totalWidth / 2,
            CONFIG.totalHeight / 2,
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

        Matter.World.add(this.world, body);
        return body;
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
        this.setPosition(this.config.spawnX, this.config.spawnY);
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
        Matter.Events.off(this.engine, 'beforeUpdate');
        Matter.Events.off(this.engine, 'collisionStart');
        Matter.Events.off(this.engine, 'collisionEnd');
        Matter.Events.off(this.engine, 'collisionActive');
        this.oldVelocities.clear();
        this.body = null;
        this.world = null;
    }
}

module.exports = Ball;