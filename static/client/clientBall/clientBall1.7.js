class Ball3 {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.authorityBall = null; 
        
        // Buffer để lưu các state
        this.stateBuffer = [];
        this.interpolationDelay = 100; // 100ms interpolation delay
        this.maxBufferSize = 100; // Giới hạn kích thước buffer
        
        this.initialize();
    }
	updateBallVisibility() {
        if (this.graphics) {
            this.graphics.visible = this.scene.visibleLerpBall;
        }
    }
    initialize() {
        this.graphics = this.createGraphics();
        this.body = this.createPhysicsBody();
        this.container = this.scene.add.container(
            this.body.position.x,
            this.body.position.y,
            [this.graphics]
        );
        this.scene.matter.add.gameObject(this.container, this.body);
        this.lastUpdateTime = Date.now();
		this.updateBallVisibility(); 
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
                    mask: 0, 
                }
            }
        );
    }
    // Methods createGraphics() và createPhysicsBody() giữ nguyên như cũ

    update() {
        if (!this.authorityBall) return;

        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastUpdateTime;
        this.lastUpdateTime = currentTime;

		// Tạo deep copy của position
		const currentPosition = {
			x: this.authorityBall.getPosition().x,
			y: this.authorityBall.getPosition().y
		};
	

        // Thêm state mới vào buffer
        this.addStateToBuffer({
            position: currentPosition,
            timestamp: currentTime
        });

        // Tính toán thời điểm render (delay đằng sau thời gian hiện tại)
        const renderTime = currentTime - this.interpolationDelay;

        // Tìm 2 states để interpolate
        const states = this.findInterpolationStates(renderTime);
        if (!states) return;

        const [oldState, newState] = states;
        console.log("Timp stamp comparistion: ", oldState.timestamp, newState.timestamp, Date.now()); 
		console.log("Position comparistion: ", oldState.position, newState.position, this.authorityBall.getPosition()); 
        // Tính toán interpolation factor
        const totalTime = newState.timestamp - oldState.timestamp;
        const currentDelta = renderTime - oldState.timestamp;
        const alpha = Math.min(Math.max(currentDelta / totalTime, 0), 1);

        // Interpolate position
        const newX = oldState.position.x + (newState.position.x - oldState.position.x) * alpha;
        const newY = oldState.position.y + (newState.position.y - oldState.position.y) * alpha;
        // Áp dụng position mới
        this.setPosition(newX, newY);
		this.setVelocity(0, 0); 
		console.log(this.authorityBall.getPosition().x, newX, this.authorityBall.getPosition().y, newY); 

        // Cleanup buffer
        this.cleanupBuffer(currentTime);
    }

    addStateToBuffer(state) {
		const stateCopy = {
			position: { ...state.position },
			timestamp: state.timestamp
		};
        this.stateBuffer.push(stateCopy);
        
        // Sắp xếp buffer theo timestamp
        this.stateBuffer.sort((a, b) => a.timestamp - b.timestamp);
        
        // Giới hạn kích thước buffer
        if (this.stateBuffer.length > this.maxBufferSize) {
            this.stateBuffer.shift();
        }
    }

    findInterpolationStates(renderTime) {
        if (this.stateBuffer.length < 2) return null;

        // Tìm hai states bao quanh renderTime
        for (let i = 0; i < this.stateBuffer.length - 1; i++) {
            if (this.stateBuffer[i].timestamp <= renderTime && 
                this.stateBuffer[i + 1].timestamp >= renderTime) {
                return [this.stateBuffer[i], this.stateBuffer[i + 1]];
            }
        }
        // Nếu renderTime nằm ngoài buffer, sử dụng hai states cuối cùng
        const lastTwo = this.stateBuffer.slice(-2);
        if (lastTwo.length === 2) return lastTwo;

        return null;
    }

    cleanupBuffer(currentTime) {
        // Xóa các states cũ hơn interpolationDelay*2
        const threshold = currentTime - this.interpolationDelay * 2;
        this.stateBuffer = this.stateBuffer.filter(state => 
            state.timestamp > threshold
        );
    }

    setPosition(x, y) {
        this.scene.matter.body.setPosition(this.body, {x, y});
    }
	
    getPosition() {
        return this.body.position;
    }

	setVelocity(x, y) {
		this.scene.matter.setVelocity(this.body, x, y);
	}

    getVelocity() {
        return this.body.velocity;
    }
    destroy() {
        // ... giữ nguyên như cũ
    }
}