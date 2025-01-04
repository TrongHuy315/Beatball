class Ball {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.frameRemainder = 0; 
		if (!scene || !config) {
			throw new Error('Scene and config are required');
		}
		// Thêm state buffer cho interpolation
        this.maxBufferSize = 1000;
        this.stateBuffer = new Array(this.maxBufferSize);
        this.bufferStart = 0;  // index of oldest state
        this.bufferLength = 0; // current number of states
        this.renderDelay = this.scene.perfMonitor.getInterpolationDelay();
		this.lastProcessedStateTime = 0;
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
	updateInterpolation(currentTime) { // hmmm; 
        // Cập nhật renderDelay từ PerfMonitor
        this.renderDelay = this.scene.perfMonitor.getInterpolationDelay();
        const renderTimestamp = currentTime - this.renderDelay;
		console.log("Render Delay: ", this.renderDelay); 
        // Cleanup old states	
        this.cleanupStates(renderTimestamp);

        // Get interpolation states
        const states = this.getInterpolationStates(renderTimestamp);
        if (!states) return;

        // Calculate and apply interpolated state
        const interpolatedState = this.calculateInterpolatedState(states, renderTimestamp);
        if (interpolatedState) {
            this.applyInterpolatedState(interpolatedState);
        }
    }

	bufferState(serverState, serverTime) { // O(1) ACCURATE
        const newState = {
            position: { ...serverState.position },
            velocity: { ...serverState.velocity },
            timestamp: serverTime
        };

        // Tính vị trí để thêm state mới
        const insertIndex = (this.bufferStart + this.bufferLength) % this.maxBufferSize;
        
        // Thêm state mới
        this.stateBuffer[insertIndex] = newState;
        
        // Cập nhật độ dài buffer
        if (this.bufferLength < this.maxBufferSize) {
            this.bufferLength++;
        } else {
            // Buffer đầy, di chuyển start pointer
            this.bufferStart = (this.bufferStart + 1) % this.maxBufferSize;
        }
    }
	getState(index) { // O(1) ACCURATE 
        if (index < 0 || index >= this.bufferLength) return null;
        return this.stateBuffer[(this.bufferStart + index) % this.maxBufferSize];
    }
	cleanupStates(renderTimestamp) { // O(1) ACCURATE 
        while (this.bufferLength >= 2 && 
               this.getState(1).timestamp <= renderTimestamp) {
            this.bufferStart = (this.bufferStart + 1) % this.maxBufferSize;
            this.bufferLength--;
        }
    }
	getInterpolationStates(renderTimestamp) { // O(1) ACCURATE
		if (this.bufferLength >= 2) {
			const state = this.getState(0);
			const nextState = this.getState(1);
			
			if (state.timestamp <= renderTimestamp && 
				nextState.timestamp >= renderTimestamp) {
				return {
					oldState: state,
					newState: nextState
				};
			}
		} else if (this.bufferLength === 1) {
			const state = this.getState(0);
			return {
				oldState: state,
				newState: state
			};
		}
		return null;
	}
	calculateInterpolatedState(states, renderTimestamp) { // O(1): ACCURATE 
        const { oldState, newState } = states;
        
        if (oldState === newState) {
            return oldState;
        }

        // Tính hệ số alpha
        const total = newState.timestamp - oldState.timestamp;
        const partial = renderTimestamp - oldState.timestamp;
        const alpha = total > 0 ? partial / total : 1;

        return this.interpolateStates(oldState, newState, alpha);
    }
	resetStateBuffer(serverState, serverTime) { // ACCURATE
        this.stateBuffer = new Array(this.maxBufferSize);
        this.bufferStart = 0;
        this.bufferLength = 0;
        this.bufferState(serverState, serverTime);
    }
	handleServerState(serverState, serverTime) { // ACCURATE
        this.bufferState(serverState, serverTime);
        
        // Reset buffer nếu time difference quá lớn
        if (Math.abs(serverTime - this.lastProcessedStateTime) > 1000) {
            this.resetStateBuffer(serverState, serverTime);
        }
        
        this.lastProcessedStateTime = serverTime;
    }
	applyInterpolatedState(state) {  // IS IT NEEDED TO CALCULATE THE VELOCITY 
        this.setPosition(state.position.x, state.position.y);
        this.setVelocity(state.velocity.x, state.velocity.y);
    }
	interpolateStates(oldState, newState, alpha) { // O(1) ACCURATE
        return {
            position: {
                x: oldState.position.x + (newState.position.x - oldState.position.x) * alpha,
                y: oldState.position.y + (newState.position.y - oldState.position.y) * alpha
            },
            velocity: {
                x: oldState.velocity.x + (newState.velocity.x - oldState.velocity.x) * alpha,
                y: oldState.velocity.y + (newState.velocity.y - oldState.velocity.y) * alpha
            }
        };
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
                isStatic: false,
                slop: physics.slop, 
                velocity: { x: 0, y: 0 }
            }
        );
    }

    update(currentTime) {
		this.updateInterpolation(currentTime);
    }
	setVelocity(x, y) { // ACCURATE
		this.scene.matter.setVelocity(this.body, x, y);
	}

    getVelocity() { // ACCURATE
        return this.body.velocity;
    }

    setPosition(xx, yy) { // ACCURATE
        this.scene.matter.body.setPosition(this.body, {x: xx, y: yy});
    }

    getPosition() { // ACCURATE
        return this.body.position;
    }

    destroy() { // ACCURATE
		this.stateBuffer = new Array(this.maxBufferSize);
		this.bufferStart = 0;
		this.bufferLength = 0;
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