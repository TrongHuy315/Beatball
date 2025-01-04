class Ball {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.frameRemainder = 0; 
        this.authorityBall = scene.authorityBall; 
        this.initialize();
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
        const ballCategory = this.scene.categories.ball;
        const nonGraphicBallCategory = this.scene.categories.nonGraphicBall;
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
                isStatic: true,
                slop: physics.slop, 
                velocity: { x: 0, y: 0 }, 
                collisionFilter: {
                    category: ballCategory, 
                    mask: ~nonGraphicBallCategory 
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

        const teleportThreshold = 100; 
        if (distance > teleportThreshold) {
            this.setPosition(authorityPos.x, authorityPos.y);
        } else {
            const lerpFactor = 0.3; 
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
}