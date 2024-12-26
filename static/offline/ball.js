class Ball {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.initialize();
    }

    initialize() {
        this.damping = this.config.physics.damping; 
        this.graphics = this.createGraphics();
        this.body = this.createPhysicsBody();
        this.scene.events.on('update', this.update, this);
        this.scene.matter.world.on('beforeupdate', this.afterPhysicsUpdate, this);
        this.scene.matter.world.on('collisionstart', (event) => {
            this.isColliding = true;
        });
        
        this.scene.matter.world.on('collisionend', () => {
            this.isColliding = false;
        });
        this.oldVelocities = new Map();

        // Collision Start handler
        this.scene.matter.world.on('beforeupdate', (event) => {
            if (!this.isColliding) {
                this.oldVelocities.set(this.body.id, {
                    x: this.body.velocity.x,
                    y: this.body.velocity.y
                });
            }
        });
    
        // Collision Active handler - đăng ký riêng
        this.scene.matter.world.on('collisionactive', (event) => {
            const oldVel = this.oldVelocities.get(this.body.id); 
            console.log(oldVel.x, oldVel.y); 
            event.pairs.forEach((pair) => {
                const ball = pair.bodyA.label === 'ball' ? pair.bodyA : 
                            (pair.bodyB.label === 'ball' ? pair.bodyB : null);
                const wall = pair.bodyA.label === 'wall' ? pair.bodyA : 
                            (pair.bodyB.label === 'wall' ? pair.bodyB : null);
    
                if (ball && wall) {
                    console.log("Ball and wall"); 
                    if (!oldVel) return;
    
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
    
    }
    afterPhysicsUpdate() {
        console.log("damping: ", this.damping); 
        var xx = this.body.velocity.x * this.damping; 
        var yy = this.body.velocity.y * this.damping; 
        this.setVelocity(xx, yy); 
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
        
        return this.scene.matter.add.circle(
            this.scene.scale.width / 2,
            this.scene.scale.height / 2,
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
                slop: physics.slop, 
                velocity: { x: 0, y: 0 }
            }
        );
    }

    update() {
        this.graphics.setPosition(this.body.position.x, this.body.position.y);
        this.body.angle = 0;
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
		// this.scene.matter.body.setPosition(this.body, {x: centerX, y: centerY});
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