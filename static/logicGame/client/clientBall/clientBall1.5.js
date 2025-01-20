class Ball {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.networkManager = scene.networkManager;
        this.stateBuffer = [];
        this.maxBufferSize = 60; // 1 second at 60fps
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
			if (this.stick === 0 && Math.min(Math.abs(this.body.velocity.x), Math.abs(this.body.velocity.y)) > 0) {
				this.oldVelocities.set(this.body.id, {
					x: this.body.velocity.x,
					y: this.body.velocity.y
				});
			}
		});
	
		this.scene.matter.world.on('collisionstart', (event) => {
			event.pairs.forEach((pair) => {
				const ball3 = pair.bodyA.label === 'ball' ? pair.bodyA : 
							  (pair.bodyB.label === 'ball' ? pair.bodyB : null);
				const wall = pair.bodyA.label === 'wall' ? pair.bodyA : 
							 (pair.bodyB.label === 'wall' ? pair.bodyB : null);
	
				if (ball3 && wall) {
					this.stick++;
					console.log("Colliding with wall"); 
					if (this.stick > 1) return;
	
					const oldVel = this.oldVelocities.get(this.body.id);
					if (!oldVel) return;
	
					const pushDirection = wall.customType;
					const dampingDirection = 0.38;
	
					let newVelX = oldVel.x;
					let newVelY = oldVel.y;
	
					switch (pushDirection) {
						case 'U':
							newVelY = -newVelY * dampingDirection;
							break;
						case 'D':
							newVelY = -newVelY * dampingDirection;
							break;
						case 'L':
							newVelX = -newVelX * dampingDirection;
							break;
						case 'R':
							newVelX = -newVelX * dampingDirection;
							break;
					}
					console.log("Old xy: ", oldVel.x, oldVel.y); 
					console.log("New xy: ", newVelX, newVelY); 
					this.setVelocity(
						newVelX,
						newVelY
					);
				}
			});
		});
	
		this.scene.matter.world.on('collisionend', (event) => {
			event.pairs.forEach((pair) => {
				const ball3 = pair.bodyA.label === 'ball' ? pair.bodyA : 
							  (pair.bodyB.label === 'ball' ? pair.bodyB : null);
				const wall = pair.bodyA.label === 'wall' ? pair.bodyA : 
							 (pair.bodyB.label === 'wall' ? pair.bodyB : null);
	
				if (ball3 && wall) {
					this.stick--; 
				}
			});
		});
	
		this.scene.matter.world.on('collisionactive', (event) => {
			if (this.stick > 0) {
				// Có thể thêm logic xử lý va chạm liên tục ở đây nếu cần
			}
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
        const currentTime = this.scene.networkManager.getServerTime();
        const deltaTime = (currentTime - serverState.timestamp) / 1000;
        const FPS = 60;
        const frameTime = 1 / FPS;
      
        const frames = Math.floor(deltaTime / frameTime);
        // console.log("Number of frames to forward: ", frames);
      
        const dampingFactor = this.config.physics.damping;
        const v0 = { ...serverState.velocity };
        const p0 = { ...serverState.position };
      
        // Field dimensions
        const { totalWidth, totalHeight, offset_horizontal, offset_vertical, pitch, nets } = CONFIG;
        const y1 = offset_vertical + pitch.borderWidth;
        const y2 = y1 + pitch.height;
        const x1 = offset_horizontal + nets.borderWidth + pitch.borderWidth + nets.width;
        const x2 = x1 + pitch.width;
        const y3 = totalHeight / 2 - nets.height / 2;
        const y4 = totalHeight / 2 + nets.height / 2;
      
        // Precompute whatever factor you need for damping
        const dampingPower = Math.pow(dampingFactor, 1); // effectively dampingFactor each frame
      
        if (dampingFactor === 1) {
          // If there's no damping, just iterate frames and do collisions
          for (let i = 0; i < frames; i++) {
            // Update position
            p0.x += v0.x;
            p0.y += v0.y;
      
            // Check collisions in y-direction
            if (p0.y - this.radius <= y1 || p0.y + this.radius >= y2) {
              v0.y *= -0.38;
            }
            // Check collisions in x-direction (excluding the net area)
            if (p0.x - this.radius <= x1 || p0.x + this.radius >= x2) {
              if (p0.y < y3 || p0.y > y4) {
                v0.x *= -0.38;
              }
            }
          }
      
          // Final position & velocity after N frames
          return {
            position: { x: p0.x, y: p0.y },
            velocity: { x: v0.x, y: v0.y }
          };
        } else {
          // If there is damping, apply it each frame after checking collisions
          for (let i = 0; i < frames; i++) {
            // Update position
            p0.x += v0.x;
            p0.y += v0.y;
      
            // Check collisions in y-direction
            if (p0.y - this.radius <= y1 || p0.y + this.radius >= y2) {
              v0.y *= -0.38;
            }
            // Check collisions in x-direction (excluding the net area)
            if (p0.x - this.radius <= x1 || p0.x + this.radius >= x2) {
              if (p0.y < y3 || p0.y > y4) {
                v0.x *= -0.38;
              }
            }
      
            // Apply damping after collision checks
            v0.x *= dampingPower;
            v0.y *= dampingPower;
          }
      
          // Final position & velocity after N frames with damping
          return {
            position: { x: p0.x, y: p0.y },
            velocity: { x: v0.x, y: v0.y }
          };
        }
    }
    handleBallState(ballState) {
        const serverState = {
            position: { x: ballState.position.x, y: ballState.position.y },
            velocity: { x: ballState.velocity.x, y: ballState.velocity.y },
            timestamp: ballState.timestamp
        };
        const newState = this.computeClosedFormFastForward(serverState);
        
        // console.log("Diff in time: (client - server): ", this.scene.networkManager.getServerTime() - ballState.timestamp); 
        // console.log("Position Comparison(Server, client): ", ballState.position, this.body.position); 
        // console.log("Velocity Comparison(Server, client): ", ballState.velocity, this.body.velocity); 
        
        this.setPosition(newState.position.x, newState.position.y);
        this.setVelocity(newState.velocity.x, newState.velocity.y);
    }

    
    createGraphics() {
        const { radius } = this.config.physics;
        const { fillColor, borderColor, borderWidth } = this.config.graphics;
        this.radius = radius; 
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
            outer: 0x0001,
            inner: 0x0002,
            player: 0x0004,
            ball: 0x0008,
            net: 0x0010,
            nonGraphicBall: 0x0020,
            predictBall: 0x0040, 
            lerpPlayer: 0x0080,
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
                    mask: ~(categories.ball | categories.predictBall | categories.player | categories.lerpPlayer),  
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