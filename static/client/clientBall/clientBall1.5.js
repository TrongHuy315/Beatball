class Ball {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.initialize();
        this.count_damping = 0; 

        this.dampingPerSecond = 0;
        this.lastSecondDampingCount = 0;
        this.stick = false; 
    }
    startDampingCounter() {
        setInterval(() => {
            this.dampingPerSecond = this.count_damping - this.lastSecondDampingCount;
            this.lastSecondDampingCount = this.count_damping;
            console.log("Damping calls per second:", this.dampingPerSecond);
        }, 1000);
    }
    setupCollisionHandlers() {
        this.scene.matter.world.on('beforeupdate', () => {
            if (this.stick == 0) {
                this.oldVelocities.set(this.body.id, {
                    x: this.body.velocity.x,
                    y: this.body.velocity.y
                });
            }
        });

        this.scene.matter.world.on('collisionstart', (event) => {
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
                }
            });
        });

        this.scene.matter.world.on('collisionend', (event) => {
            event.pairs.forEach((pair) => {
                const ball = pair.bodyA.label === 'ball' ? pair.bodyA : 
                            (pair.bodyB.label === 'ball' ? pair.bodyB : null);
                const wall = pair.bodyA.label === 'wall' ? pair.bodyA : 
                            (pair.bodyB.label === 'wall' ? pair.bodyB : null);

                if (ball && wall) {
                    this.stick--;
                }
            });
        });

        this.scene.matter.world.on('collisionactive', (event) => {
            const oldVel = this.oldVelocities.get(this.body.id);
            
            // event.pairs.forEach((pair) => {
            //     const ball = pair.bodyA.label === 'ball' ? pair.bodyA : 
            //                 (pair.bodyB.label === 'ball' ? pair.bodyB : null);
            //     const wall = pair.bodyA.label === 'wall' ? pair.bodyA : 
            //                 (pair.bodyB.label === 'wall' ? pair.bodyB : null);
            //     console.log("Before Trying flipping");
            //     console.log("Stick: ", this.stick); 
            //     if (ball && wall && oldVel && this.stick > 0) {
            //         const currentVel = {x: ball.velocity.x, y: ball.velocity.y};
            //         const EPSILON = 0.1;
            //         console.log("Trying flipping"); 
            //         var ball_restitution = this.config.physics.restitution; 
            //         var wall_restitution = CONFIG.wall.bounciness; 
            //         var combinedRestitution = this.config.physics.restitution * CONFIG.wall.bounciness;
            //         if (Math.abs(currentVel.x) < EPSILON || Math.abs(currentVel.y) < EPSILON) {
            //             if (Math.abs(currentVel.x) < EPSILON) {
            //                 console.log("Flip x");
            //                 this.setVelocity(-oldVel.x * combinedRestitution, currentVel.y); 
            //             }
            //             if (Math.abs(currentVel.y) < EPSILON) {
            //                 console.log("Flip y");
            //                 this.setVelocity(currentVel.x, -oldVel.y * combinedRestitution); 
            //             }
            //         }
            //     }
            // });
        });
    }
    logVelocity () {
        console.log("Velocity: ", this.body.velocity.x, this.body.velocity.y); 
    }
    initialize() {
        this.damping = this.config.physics.damping; 
        this.graphics = this.createGraphics();
        this.body = this.createPhysicsBody();
        this.container = this.scene.add.container(
            this.scene.scale.width / 2,
            this.scene.scale.height / 2,
            [this.graphics]
        );
        this.scene.matter.add.gameObject(this.container, this.body);
        this.oldVelocities = new Map();
        this.isColliding = false; 
        this.setupCollisionHandlers(); 
        this.updateBallVisibility();
    }
    updateBallVisibility() {
        if (this.graphics) {
            this.graphics.visible = this.scene.visibleClientBall;
        }
    }
    computeClosedFormFastForward(serverState) {
        // console.log("Ball reconcile with server"); 
        const currentTime = Date.now();
        const deltaTime = (currentTime - serverState.timestamp) / 1000; 
        const FPS = 60;
        const frameTime = 1 / FPS; 

        const frames = Math.floor(deltaTime / frameTime); // Number of frames to fast forward
        const dampingFactor = this.config.physics.damping;
        const v0 = serverState.velocity;  // v0.x, v0.y
        const p0 = serverState.position;  // p0.x, p0.y
        // console.log("Number of frams to forward: ", frames); 
        // Nếu damping = 1 => chuyển động thẳng đều:
        //   v không đổi
        //   p = p0 + v0 * frames
        if (dampingFactor === 1) {
            const newVelocity = {
                x: v0.x,
                y: v0.y
            };
            const newPosition = {
                x: p0.x + v0.x * frames,
                y: p0.y + v0.y * frames
            };
            return {
                position: newPosition,
                velocity: newVelocity
            };
        } 

        // Ngược lại, nếu damping != 1 => chuyển động giảm tốc theo công thức hình học:
        //   newVelocity = v0 * d^frames
        //   displacement = v0 * (1 - d^frames) / (1 - d)
        //   position = p0 + displacement
        else {
            const dampingPower = Math.pow(dampingFactor, frames);

            // Tính vận tốc mới sau 'frames' bước
            const newVelocity = {
                x: v0.x * dampingPower,
                y: v0.y * dampingPower
            };

            // Tổng quãng đường (theo vector) bóng đi được sau 'frames' bước
            //   = v0 × (1 - d^frames) / (1 - d)
            const geometricSum = (1 - dampingPower) / (1 - dampingFactor);

            const newPosition = {
                x: p0.x + v0.x * geometricSum,
                y: p0.y + v0.y * geometricSum
            };

            return {
                position: newPosition,
                velocity: newVelocity
            };
        }
    }

    handleBallState(ballState) {
        // console.log("Handle Ball state"); 
        const serverState = {
            position: { x: ballState.position.x, y: ballState.position.y },
            velocity: { x: ballState.velocity.x, y: ballState.velocity.y },
            timestamp: ballState.timestamp
        };
        const newState = this.computeClosedFormFastForward(serverState);
        // if (newState == null) return; 
        // console.log("Diff in time: (client - server): ", Date.now() - ballState.timestamp); 
        // console.log("Position Comparison(Server, client): ", ballState.position, this.body.position); 
        // console.log("Velocity Comparison(Server, client): ", ballState.velocity, this.body.velocity); 
        this.setPosition(newState.position.x, newState.position.y);
        this.setVelocity(newState.velocity.x, newState.velocity.y);
    }

    
    createGraphics() {
        const { radius } = this.config.physics;
        const { fillColor, borderColor, borderWidth } = this.config.graphics;
        
        // Chỉ tạo texture một lần
        if (!this.scene.textures.exists('ball')) {
            const diameter = radius * 2;
            const canvas = document.createElement('canvas');
            canvas.width = diameter;
            canvas.height = diameter;
            
            const ctx = canvas.getContext('2d');
            const centerX = radius;
            const centerY = radius;
            const innerRadius = radius - (borderWidth / 2);
            
            // Xóa canvas
            ctx.clearRect(0, 0, diameter, diameter);
            
            // Vẽ phần fill chính
            ctx.beginPath();
            ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
            ctx.fillStyle = fillColor;
            ctx.fill();
            
            // Vẽ border
            ctx.lineWidth = borderWidth;
            ctx.strokeStyle = borderColor;
            ctx.stroke();
            
            // Thêm hiệu ứng bóng
            // Gradient từ trên xuống
            const gradient = ctx.createLinearGradient(
                centerX, 
                centerY - innerRadius, 
                centerX, 
                centerY + innerRadius
            );
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
            gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Highlight nhỏ ở góc trên
            ctx.beginPath();
            ctx.arc(
                centerX - innerRadius/3, 
                centerY - innerRadius/3, 
                innerRadius/4, 
                0, 
                Math.PI * 2
            );
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fill();
            
            // Tạo texture từ canvas
            this.scene.textures.addCanvas('ball', canvas);
        }
        
        // Tạo sprite từ texture
        const ball = this.scene.add.image(0, 0, 'ball');
        
        return ball;
    }

    createPhysicsBody() {
        const { physics } = this.config;
        const categories = {
            outer: 0x0001,         // 000001
            inner: 0x0002,         // 000010
            player: 0x0004,        // 000100
            ball: 0x0008,          // 001000
            net: 0x0010,           // 010000
            nonGraphicBall: 0x0020, // 100000
            predictBall: 0x0040     // 1000000
        };
        return this.scene.matter.add.circle(
            this.scene.scale.width / 2,
            this.scene.scale.height / 2,
            physics.radius,
            {
                label: 'ball3', 
                mass: physics.mass,
                restitution: physics.restitution,
                friction: physics.friction,
                frictionAir: physics.frictionAir,
                inertia: physics.inertia,
                frictionStatic: physics.frictionStatic,
                angle: physics.angle,
				collisionFilter: {
                    category: categories.ball, 
                    mask: ~(categories.nonGraphicBall | categories.predictBall) 
                }, 
                isStatic: false,
                slop: physics.slop, 
                velocity: { x: 0, y: 0 }
            }
        );
    }
    logBallVelocity() {
        console.log('\n=== Ball Velocity ===');
        console.log({
            x: Math.round(this.body.velocity.x * 100) / 100,
            y: Math.round(this.body.velocity.y * 100) / 100,
            speed: Math.round(
                Math.sqrt(
                    Math.pow(this.body.velocity.x, 2) + 
                    Math.pow(this.body.velocity.y, 2)
                ) * 100
            ) / 100
        });
        console.log('===================\n');
    }
    update() {
        var xx = this.body.velocity.x * this.damping; 
        var yy = this.body.velocity.y * this.damping; 
        this.setVelocity(xx, yy); 
    }
    logVelocity () {
        console.log("Velocity: ", this.body.velocity.x, this.body.velocity.y); 
    }
    logPosition () {
        console.log("Position: ", this.body.position.x, this.body.position.y); 
    }
    controlSpeed() {
		const velocity = this.body.velocity;
		const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
		
		if (speed > this.config.limits.maxSpeed) {
			const scale = this.config.limits.maxSpeed / speed;
			this.scene.matter.setVelocity(
				this.body,
				velocity.x * scale,
				velocity.y * scale
			);
		}
	}
	
	reset() {
		const centerX = this.scene.scale.width / 2;
		const centerY = this.scene.scale.height / 2;
		this.scene.matter.body.setPosition(this.body, {x: centerX, y: centerY});
        this.setPosition(centerX, centerY); 
		this.setVelocity(0, 0);
        this.damping = this.config.physics.damping; 
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
        this.graphics.destroy();
        this.scene.matter.world.remove(this.body);
        this.scene.events.off('update', this.update, this);
    }
}