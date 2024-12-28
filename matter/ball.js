const Matter = require('matter-js');
const { totalWidth } = require('./config.js');
class Ball {
    constructor(world, engine, io) {
        this.io = io; 
        this.world = world;
        this.engine = engine; 
        this.config = require('./config.js').ball;
        this.radius = CONFIG.ball.physics.radius; 
        this.initialize();
        this.count_damping = 0; 
        this.dampingPerSecond = 0;
        this.lastSecondDampingCount = 0;
    }
    startDampingCounter() {
        setInterval(() => {
            this.dampingPerSecond = this.count_damping - this.lastSecondDampingCount;
            this.lastSecondDampingCount = this.count_damping;
            console.log("Damping calls per second:", this.dampingPerSecond);
        }, 1000);
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

        Matter.Events.on(this.engine, 'collisionEnd', (event) => {
            this.isColliding = false;
            
            // Check các collision pairs
            event.pairs.forEach(pair => {
                // Xác định ball và object va chạm
                const bodyA = pair.bodyA;
                const bodyB = pair.bodyB;
                
                let ball = null;
                
                // Tìm ball trong pair
                if (bodyA.label === 'ball') ball = bodyA;
                if (bodyB.label === 'ball') ball = bodyB;
                
                // Nếu có ball trong collision
                if (ball) {
                    const otherBody = ball === bodyA ? bodyB : bodyA;
                    
                    if (otherBody.label === 'wall' || otherBody.label.startsWith('player')) {
                        try {
                            const ballState = {
                                position: ball.position, 
                                velocity: ball.velocity, 
                                timestamp: Date.now(),
                            };
        
                            this.io.emit('sendBallState', ballState);
        
                        } catch (error) {
                            console.error('Error sending collision end ball state:', error);
                            
                            this.io.emit('sendBallState', {
                                position: ball.position,
                                velocity: ball.velocity, 
                                timestamp: Date.now()
                            });
                        }
                    }
                }
            });
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
                            console.log("Flip x");
                            this.setVelocity(-oldVel.x * this.config.physics.restitution, currentVel.y); 
                        }
                        if (Math.abs(currentVel.y) < EPSILON) {
                            console.log("Flip y");
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
        this.count_damping++; 
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
                isStatic: false,
                slop: physics.slop
            }
        );

        Matter.World.add(this.world, body);
        return body;
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