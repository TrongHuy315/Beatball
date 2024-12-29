class Ball1 {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.frameRemainder = 0; 
        this.initialize();
    }

    initialize() {
        this.damping = this.config.physics.damping; 
        this.graphics = this.createGraphicss();
        this.body = this.createPhysicsBody();
        this.container = this.scene.add.container(
            this.body.position.x,
            this.body.position.y,
            [this.graphics]
        );
        this.scene.matter.add.gameObject(this.container, this.body);
        this.stick = 0; 
    }
    createGraphicss(ballId = 1) {
        const { radius } = this.config.physics;
        const { borderColor, borderWidth } = this.config.graphics;
        const fillColors = ['red', 'blue', 'green', 'yellow', 'purple']; // Mảng các màu sắc
        const fillColor = fillColors[ballId % fillColors.length]; // Màu khác biệt theo ID
    
        // Tạo texture riêng biệt nếu chưa tồn tại
        const textureKey = `ball_${ballId}`;
        if (!this.scene.textures.exists(textureKey)) {
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
            ctx.fillStyle = fillColor; // Sử dụng màu khác biệt
            ctx.fill();
    
            // Vẽ border
            ctx.lineWidth = borderWidth;
            ctx.strokeStyle = borderColor;
            ctx.stroke();
    
    
            // Tạo texture từ canvas
            this.scene.textures.addCanvas(textureKey, canvas);
        }
    
        // Tạo sprite từ texture
        const ball = this.scene.add.image(0, 0, textureKey);
        return ball;
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
            ctx.fillStyle = 'red';
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
            nonGraphicBall: 0x0020 // 100000
        };
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
                isStatic: false,
                slop: physics.slop, 
                velocity: { x: 0, y: 0 }, 
                collisionFilter: {
                    category: categories.nonGraphicBall, 
                    mask: ~categories.ball 
                }
            }
        );
    }

    update() {
        this.frameRemainder++; 
        if (this.frameRemainder > 100) this.frameRemainder = 100; 
    }
    predictedState(serverState) {
        const predictedState = {
            position: {
                x: serverState.position.x, 
                y: serverState.position.y 
            },
            velocity: {
                x: serverState.velocity.x,
                y: serverState.velocity.y 
            }
        };
        predictedState.x += predictedState.velocity.x * this.frameRemainder; 
        predictedState.y += predictedState.velocity.y * this.frameRemainder; 
        return predictedState; 
    }
    serverReconciliation(serverState) {
        this.frameRemainder--; 
        const predictedState = this.predictedState(serverState); 
        const positionError = {
            x: this.body.position.x - predictedState.position.x,
            y: this.body.position.y - predictedState.position.y
        };
    
        const velocityError = {
            x: this.body.velocity.x - predictedState.velocity.x,
            y: this.body.velocity.y - predictedState.velocity.y
        };
    
        const distanceError = Math.sqrt(
            Math.pow(positionError.x, 2) + 
            Math.pow(positionError.y, 2)
        );
    
        const velocityErrorMagnitude = Math.sqrt(
            Math.pow(velocityError.x, 2) + 
            Math.pow(velocityError.y, 2)
        );
    
        const errorThreshold = 40;
        const velocityErrorThreshold = 20;
        this.setPosition(predictedState.position.x, predictedState.position.y);
        this.setVelocity(predictedState.velocity.x, predictedState.velocity.y);
        return; 
        if (distanceError > errorThreshold || velocityErrorMagnitude > velocityErrorThreshold) {
            this.setPosition(predictedState.position.x, predictedState.position.y);
            this.setVelocity(predictedState.velocity.x, predictedState.velocity.y);
        } else {
            const lerpFactor = Math.min(1, distanceError / errorThreshold);
            const velocityLerpFactor = Math.min(1, velocityErrorMagnitude / velocityErrorThreshold);
    
            const newX = this.body.position.x + (predictedState.position.x - this.body.position.x) * lerpFactor;
            const newY = this.body.position.y + (predictedState.position.y - this.body.position.y) * lerpFactor;
            this.setPosition(newX, newY);
    
            const newVX = this.body.velocity.x + (predictedState.velocity.x - this.body.velocity.x) * velocityLerpFactor;
            const newVY = this.body.velocity.y + (predictedState.velocity.y - this.body.velocity.y) * velocityLerpFactor;
            this.setVelocity(newVX, newVY);
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

        this.scene = null;
        this.config = null;
    }
}