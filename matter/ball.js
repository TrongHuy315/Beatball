const Matter = require('matter-js');
const CONFIG = require('./config.js');

class Ball {
    constructor(world, engine, io) {
        this.io = io; 
        this.world = world;
        this.engine = engine; 
        this.config = CONFIG.ball;
        this.radius = CONFIG.ball.physics.radius; 
        this.damping = this.config.physics.damping;
        this.stick = 0; 
        this.oldVelocities = new Map();
        this.initialize();
    }

    initialize() {
        this.body = this.createBody();

        // Listen to Matter.js events
        Matter.Events.on(this.engine, 'beforeUpdate', () => {
            if (this.stick == 0) {
                this.oldVelocities.set(this.body.id, {
                    x: this.body.velocity.x,
                    y: this.body.velocity.y
                });
            }
        });

        Matter.Events.on(this.engine, 'collisionStart', (event) => {
            this.handleCollisionStart(event);
        });

        Matter.Events.on(this.engine, 'collisionEnd', (event) => {
            this.handleCollisionEnd(event);
        });

        Matter.Events.on(this.engine, 'collisionActive', (event) => {
            this.handleCollisionActive(event);
        });

        // Set initial position
        this.setPosition(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2);
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

    handleCollisionStart(event) {
        event.pairs.forEach((pair) => {
            const ball = pair.bodyA.label === 'ball' ? pair.bodyA : 
                        (pair.bodyB.label === 'ball' ? pair.bodyB : null);
            const wall = pair.bodyA.label === 'wall' ? pair.bodyA : 
                        (pair.bodyB.label === 'wall' ? pair.bodyB : null);
    
            if (ball && wall) {
                this.stick++;
                if (this.stick > 1) return;
                const oldVel = this.oldVelocities.get(this.body.id);
                if (!oldVel) return;
    
                const pushDirection = wall.customType;
                const dampingDirection = 0.5;
    
                // console.log("Pre-send Velocity: ", ball.velocity);
                // console.log("Pre-send Position: ", ball.position);
    
                // Lấy vector vận tốc cũ
                let newVelX = oldVel.x;
                let newVelY = oldVel.y;
    
                switch (pushDirection) {
                    case 'U': // Đẩy lên
                        newVelY = -newVelY; 
                        break; 
                    case 'D': // Đẩy xuống
                        newVelY = -newVelY; // Đảo chiều Y
                        break;
                    case 'L': // Đẩy sang trái 
                        newVelX = -newVelX; 
                        break; 
                    case 'R': // Đẩy sang phải
                        newVelX = -newVelX; // Đảo chiều X
                        break;
                }
    
                // Áp dụng dampingDirection cho toàn bộ vector
                this.setVelocity(
                    newVelX * dampingDirection,
                    newVelY * dampingDirection
                );
    
                // console.log("After-send Velocity: ", ball.velocity);
                // console.log("After-send Position: ", ball.position);
                this.sendBallState();
            }
        });
    }

    handleCollisionEnd(event) {
        event.pairs.forEach((pair) => {
            const ball = pair.bodyA.label === 'ball' ? pair.bodyA : 
                        (pair.bodyB.label === 'ball' ? pair.bodyB : null);
            const wall = pair.bodyA.label === 'wall' ? pair.bodyA : 
                        (pair.bodyB.label === 'wall' ? pair.bodyB : null);

            if (ball && wall) {
                this.stick--;
                // if (this.stick == 0)  this.sendBallState(); 
            }
        });
    }

    handleCollisionActive(event) {
        // do nothing 
    }

    setVelocity(x, y) {
        Matter.Body.setVelocity(this.body, { x, y });
    }

    setPosition(x, y) {
        Matter.Body.setPosition(this.body, { x, y });
    }
    update() {
        var xx = this.body.velocity.x * this.damping; 
        var yy = this.body.velocity.y * this.damping; 
        this.setVelocity(xx, yy); 
        this.sendBallState(); 
    }
    sendBallState() {
        const ballState = {
            position: this.body.position,
            velocity: this.body.velocity,
            timestamp: Date.now(),
        };
        // console.log("Actual Sending Position: ", ballState.position); 
        this.io.emit('sendBallState', ballState);
    }

    reset() {
        this.setPosition(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2);
        this.setVelocity(0, 0);
        this.damping = this.config.physics.damping;
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
