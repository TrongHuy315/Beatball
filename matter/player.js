const Matter = require('matter-js');
const CONFIG = require('./config.js');

class Player {
    constructor(world, engine, io) {
        this.world = world;
        this.engine = engine; 
        this.body = null;
        this.spawnX = 200;
        this.spawnY = 200;
        this.moveType = CONFIG.player.movement.type;
        this.sequence = 0;
        this.lastProcessedInput = null;
        this.io = io; 
        this.goals = 0; 
        this.assists = 0;
        this.points = 0;  
        this.side = 0; 
        // Ball kick config 
        const { normalKickDistance, normalKickVelocityAdd } = CONFIG.player.ballConfig;
        this.normalKickDistance = normalKickDistance;
        this.normalKickVelocityAdd = normalKickVelocityAdd;
    }
    afterPhysicsUpdate() {
        if (this.body) {
            const damping = CONFIG.player.physics.damping || 0.98;
            const xx = this.body.velocity.x * damping;
            const yy = this.body.velocity.y * damping;
            this.setVelocity(xx, yy);
        }
    }
    create(x = 200, y = 200) {
        this.spawnX = x;
        this.spawnY = y;
        this.body = this.createPhysicsBody(x, y);
        Matter.World.add(this.world, this.body);
        Matter.Events.on(this.engine, 'beforeUpdate', this.afterPhysicsUpdate.bind(this));
        return this;
    }

    createPhysicsBody(x, y) {
        const { radius } = CONFIG.player.graphic;
        const physics = CONFIG.player.physics;
        const categories = {
            outer: 0x0001,  // 00001
            inner: 0x0002,  // 00010
            player: 0x0004, // 00100
            ball: 0x0008,   // 01000
            net: 0x00016    // 10000
        };
        return Matter.Bodies.circle(x, y, radius, {
            label: 'player',
            mass: physics.mass,
            restitution: physics.restitution,
            friction: physics.friction,
            frictionAir: physics.frictionAir,
            frictionStatic: physics.frictionStatic,
            inertia: physics.inertia,
            slop: physics.slop,
            isStatic: false, 
            collisionFilter: {
                category: categories.player,
                mask: ~categories.inner  
            }
        });
    }

    update(input, ball) {
        if (this.moveType === 'force') {
            this.updateForceMovement(input);
        } else {
            this.updateVelocityMovement(input);
        }

        if (input.kick) {
            this.handleKick(ball);
        }

        this.lastProcessedInput = input.sequence;
    }

    updateForceMovement(input) {
        const { force, maxSpeed, deceleration } = CONFIG.player.movement;
        const velocity = this.body.velocity;
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

        if (speed < maxSpeed) {
            let fx = 0;
            let fy = 0;

            fx = input.inputX * force;
            fy = input.inputY * force;

            if (fx !== 0 && fy !== 0) {
                const normalize = 1 / Math.sqrt(2);
                fx *= normalize;
                fy *= normalize;
            }

            Matter.Body.applyForce(this.body, this.body.position, { x: fx, y: fy });
        }

        if (input.inputX === 0 && input.inputY === 0) {
            Matter.Body.setVelocity(this.body, {
                x: velocity.x * deceleration,
                y: velocity.y * deceleration
            });
        }
    }

    updateVelocityMovement(input) {
        const { maxSpeed, acceleration, deceleration } = CONFIG.player.movement;
        let vx = this.body.velocity.x;
        let vy = this.body.velocity.y;
        
        const deltaTime = input.deltaTime;
        if (input.inputX !== 0 || input.inputY !== 0) {
            // v = v0 + a*t
            vx += input.inputX * acceleration * deltaTime;
            vy += input.inputY * acceleration * deltaTime;
    
            // Limit max speed
            const currentSpeed = Math.sqrt(vx * vx + vy * vy);
            if (currentSpeed > maxSpeed) {
                const scale = maxSpeed / currentSpeed;
                vx *= scale;
                vy *= scale;
            }
        }
    
        Matter.Body.setVelocity(this.body, { x: vx, y: vy });
    }

    handleKick(ball) {
        const { player} = CONFIG;
        const distance = this.getDistanceTo(ball.body.position);
        const minDistance = (player.graphic.radius + ball.radius + this.normalKickDistance);
        if (distance <= minDistance) {
            const angle = this.getAngleTo(ball.body.position);

            const velocity = {
                x: Math.cos(angle) * this.normalKickVelocityAdd,
                y: Math.sin(angle) * this.normalKickVelocityAdd
            };

            const currentVelocity = ball.body.velocity;
            Matter.Body.setVelocity(ball.body, {
                x: currentVelocity.x + velocity.x,
                y: currentVelocity.y + velocity.y
            });
            this.io.emit('sendBallState', {
                position: {
                    x: ball.body.position.x,
                    y: ball.body.position.y
                },
                velocity: {
                    x: ball.body.velocity.x,
                    y: ball.body.velocity.y
                }, 
                timestamp: Date.now()
            });
            this.io.emit('kickingSound'); 
        }
    }

    getDistanceTo(position) {
        return Math.sqrt(
            Math.pow(this.body.position.x - position.x, 2) +
            Math.pow(this.body.position.y - position.y, 2)
        );
    }

    getAngleTo(position) {
        return Math.atan2(
            position.y - this.body.position.y,
            position.x - this.body.position.x
        );
    }

    reset() {
        Matter.Body.setVelocity(this.body, { x: 0, y: 0 });
        Matter.Body.setPosition(this.body, { x: this.spawnX, y: this.spawnY });
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

    getLastProcessedInput() {
        return this.lastProcessedInput;
    }
    destroy() {
        if (this.world) {
            Matter.Events.off(this.world, 'beforeUpdate', this.afterPhysicsUpdate);
        }
        if (this.body) {
            Matter.World.remove(this.world, this.body);
        }
    }
}

module.exports = Player;