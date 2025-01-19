class Ball3 {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.frameRemainder = 0; 
        this.authorityBall = scene.authorityBall; 
		this.oldVelocities = new Map(); // Khởi tạo map để lưu vận tốc cũ
        this.initialize();
    }
	updateBallVisibility() {
        if (this.graphics) {
            this.graphics.visible = this.scene.visibleLerpBall;
        }
    }
    initialize() {
        this.damping = this.config.physics.damping; 
        this.graphics = this.createGraphics();
        this.body = this.createPhysicsBody();
        this.container = this.scene.add.container(
            this.body.position.x,
            this.body.position.y,
            [this.graphics]
        );
        this.scene.matter.add.gameObject(this.container, this.body);
		this.stick = 0; 
		this.setPosition(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2); 
		this.setupCollisionHandlers(); 
		this.updateBallVisibility(); 
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
				const ball3 = pair.bodyA.label === 'ball3' ? pair.bodyA : 
							  (pair.bodyB.label === 'ball3' ? pair.bodyB : null);
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
				const ball3 = pair.bodyA.label === 'ball3' ? pair.bodyA : 
							  (pair.bodyB.label === 'ball3' ? pair.bodyB : null);
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
	
    
    createGraphics() {
		const { radius } = this.config.physics;
		const { borderColor, borderWidth } = this.config.graphics;
		
		// Đổi tên texture thành 'ball3'
		if (!this.scene.textures.exists('ball3')) {  // Đổi từ 'ball' thành 'ball3'
			const diameter = radius * 2;
			const canvas = document.createElement('canvas');
			canvas.width = diameter;
			canvas.height = diameter;
			
			const ctx = canvas.getContext('2d');
			const centerX = radius;
			const centerY = radius;
			const innerRadius = radius - (borderWidth / 2);
			
			ctx.clearRect(0, 0, diameter, diameter);
			
			// Vẽ phần fill chính với màu đỏ
			ctx.beginPath();
			ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
			ctx.fillStyle = '#ff0000';  // Màu đỏ
			ctx.fill();
			
			// Vẽ border
			ctx.lineWidth = borderWidth;
			ctx.strokeStyle = borderColor;
			ctx.stroke();
			
			// Gradient và highlight
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
			
			// Tạo texture mới với tên 'ball3'
			this.scene.textures.addCanvas('ball3', canvas);
		}
		
		// Sử dụng texture 'ball3'
		const ball = this.scene.add.image(0, 0, 'ball3');
		
		return ball;
	}

    createPhysicsBody() {
        const { physics } = this.config;
        const ballCategory = this.scene.categories.ball;
        const nonGraphicBallCategory = this.scene.categories.nonGraphicBall;
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
				isStatic: false,
				slop: 0.05, 
				velocity: { x: 0, y: 0 }, 
				collisionFilter: {
					category: categories.predictBall, 
					mask: ~(categories.ball | categories.nonGraphicBall | categories.predictBall)
				}
			}
		);
    }

    update() {
        if (!this.authorityBall) return;

        const authorityPos = this.authorityBall.getPosition();
        const currentPos = this.getPosition();
        
        const distance = Phaser.Math.Distance.Between(
            currentPos.x, currentPos.y,
            authorityPos.x, authorityPos.y
        );

        const teleportThreshold = 300; 
        if (distance > teleportThreshold) {
            this.setPosition(authorityPos.x, authorityPos.y);
			this.setVelocity(this.authorityBall.body.velocity.x, this.authorityBall.body.velocity.y); 
        } else {
			this.setVelocity(this.authorityBall.body.velocity.x, this.authorityBall.body.velocity.y); 
            const lerpFactor = 0.05; 
            const newX = currentPos.x + (authorityPos.x - currentPos.x) * lerpFactor;
            const newY = currentPos.y + (authorityPos.y - currentPos.y) * lerpFactor;
            this.setPosition(newX, newY);
        }
    }
    setPosition(xx, yy) {
        this.scene.matter.body.setPosition(this.body, {x: xx, y: yy});
    }

    getPosition() {
        return this.body.position;
    }

    destroy() {
        if (this.container) {
            if (this.graphics) {
                this.container.remove(this.graphics);
                this.graphics.destroy();
                this.graphics = null;
            }
            this.container.destroy();
            this.container = null;
        }

        if (this.body && this.scene && this.scene.matter) {
            this.scene.matter.world.remove(this.body);
            this.body = null;
        }

        this.authorityBall = null;
        this.scene = null;
        this.config = null;
    }
	setVelocity(x, y) {
		this.scene.matter.setVelocity(this.body, x, y);
	}

    getVelocity() {
        return this.body.velocity;
    }
}