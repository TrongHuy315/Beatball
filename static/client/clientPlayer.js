class PlayerController {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.body = null;
        this.graphics = null;
        this.cursors = null;
        this.moveType = CONFIG.player.movement.type;
        this.rangeIndicator = null; 

        this.pendingInputs = []; 
        this.lastProcessedInput  = 0; 
        this.serverPosition = {x: 0, y : 0}; 
        this.serverVelocity = {x: 0, y : 0}; 
    }

    create(x = 200, y = 200) {
        this.config = CONFIG.player; 
        this.graphics = this.createGraphics();
        this.body = this.createPhysicsBody(x, y);
        this.spawnX = x; 
        this.spawnY = y; 
        this.container = this.scene.add.container(
            this.body.position.x,
            this.body.position.y,
            [this.graphics]
        );

        this.scene.matter.add.gameObject(this.container, this.body);
        this.setUpBallConfig();
        this.createPlayerName(); 
        this.createRangeIndicator(); 
        this.scene.matter.world.on('beforeupdate', this.afterPhysicsUpdate, this);
        // set up key 
        this.cursors = this.scene.input.keyboard.addKeys({
            up: 'W',
            down: 'S',
            left: 'A',
            right: 'D',
            kick: 'L'
        });
        return this;
    }
    afterPhysicsUpdate() {
        var xx = this.body.velocity.x * this.config.physics.damping; 
        var yy = this.body.velocity.y * this.config.physics.damping; 
        this.setVelocity(xx, yy); 
    }
    
    
    setUpBallConfig() {
        const { normal_kick_distance, normal_kick_velocity_add } = CONFIG.player.ballConfig;
        this.normalKickDistance = normal_kick_distance;
        this.normalKickVelocity = normal_kick_velocity_add;
    }
    createGraphics() {
        if (!this.scene.textures.exists('player')) {
            const { fillColor, borderColor, borderWidth, radius, numberConfig, nameConfig} = this.config.graphic;

            const diameter = (radius * 2);

            const canvas = document.createElement('canvas');
            canvas.width = diameter;
            canvas.height = diameter;
            
            const ctx = canvas.getContext('2d');

            const centerX = radius;
            const centerY = radius;
            const innerRadius = radius - borderWidth;
            
            // Vẽ phần fill chính
            ctx.beginPath();
            ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
            ctx.fillStyle = fillColor;
            ctx.fill();
            
            // Vẽ border
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius - borderWidth/2, 0, Math.PI * 2);
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = borderWidth;
            ctx.stroke();
            
            // Vẽ highlight
            ctx.beginPath();
            ctx.arc(centerX, centerY - innerRadius/4, innerRadius/6, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fill();
            
            if (numberConfig.on) {
                ctx.font = `${numberConfig.fontWeight} 
                ${numberConfig.fontSize}px ${numberConfig.fontFamily}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Vẽ stroke của số
                ctx.strokeStyle = numberConfig.strokeColor;
                ctx.lineWidth = numberConfig.strokeWidth;
                ctx.strokeText(numberConfig.value.toString(), centerX + numberConfig.offsetX, centerY + numberConfig.offsetY);
                
                // Vẽ số
                ctx.fillStyle = numberConfig.color;
                ctx.fillText(numberConfig.value.toString(), centerX + numberConfig.offsetX, centerY + numberConfig.offsetY);
            }

            if (nameConfig.on) {
                ctx.font = `${nameConfig.fontWeight} ${nameConfig.fontSize}px ${nameConfig.fontFamily}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Vẽ stroke của tên
                ctx.strokeStyle = nameConfig.strokeColor;
                ctx.lineWidth = nameConfig.strokeWidth;
                ctx.strokeText(nameConfig.value, centerX + nameConfig.offsetX, centerY * 2 + nameConfig.offsetY);
                
                // Vẽ tên
                ctx.fillStyle = nameConfig.color;
                ctx.fillText(nameConfig.value, centerX + nameConfig.offsetX, centerY * 2 + nameConfig.offsetY);
            }
            // Tạo texture từ canvas
            this.scene.textures.addCanvas('player', canvas);
        }
        
        return this.scene.add.image(0, 0, 'player');
    }


    createPhysicsBody(x, y) {
        const { radius } = CONFIG.player.graphic;
        const physics = CONFIG.player.physics;
        return this.scene.matter.add.circle(x, y, radius, {
            label: 'player', 
            mass: physics.mass,
            restitution: physics.restitution,
            friction: physics.friction,
            frictionAir: physics.frictionAir,
            frictionStatic: physics.frictionStatic,
            inertia: physics.inertia,
            slop: physics.slop,
            isStatic: false
        });

    }

    update(ball) {
        if (this.moveType === 'force') {
            this.updateForceMovement();
        } else {
            this.updateVelocityMovement();
        }
        if (this.nameText) {
            this.nameText.setPosition(
                this.body.position.x,
                this.body.position.y + this.config.graphic.nameConfig.offsetY
            );
        }
        this.handleKick(ball);
        console.log("X Y vel", this.body.velocity.x, this.body.velocity.y);
        console.log("X Y pos", this.body.position.x, this.body.position.y); 
    }

    updateForceMovement() {
        const { force, maxSpeed, deceleration } = CONFIG.player.movement;
        const velocity = this.body.velocity;
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

        if (speed < maxSpeed) {
            let fx = 0;
            let fy = 0;

            if (this.cursors.left.isDown) fx -= force;
            if (this.cursors.right.isDown) fx += force;
            if (this.cursors.up.isDown) fy -= force;
            if (this.cursors.down.isDown) fy += force;

            if (fx !== 0 && fy !== 0) {
                const normalize = 1 / Math.sqrt(2);
                fx *= normalize;
                fy *= normalize;
            }

            this.scene.matter.applyForce(this.body, { x: fx, y: fy });
        }

        if (!this.cursors.left.isDown && !this.cursors.right.isDown &&
            !this.cursors.up.isDown && !this.cursors.down.isDown) {
            this.scene.matter.setVelocity(this.body,
                velocity.x * deceleration,
                velocity.y * deceleration
            );
        }
    }
    processInput() {
        const { maxSpeed, acceleration, deceleration } = CONFIG.player.movement;
        let inputX = 0;
        let inputY = 0;
        if (this.cursors.left.isDown) inputX -= 1;
        if (this.cursors.right.isDown) inputX += 1;
        if (this.cursors.up.isDown) inputY -= 1;
        if (this.cursors.down.isDown) inputY += 1;
        if (inputX !== 0 || inputY !== 0) {
            const input = {
                inputX,
                inputY,
                sequence: ++this.lastProcessedSequence,
                timestamp: Date.now(),
                deltaTime: this.scene.game.loop.delta / 1000
            };
            this.pendingInputs.push(input);
            this.scene.SOCKET.emit('sendInput', {
                movement: input
            });
            return input;
        }
        return null;
    }
    applyInput(input) {
        const { maxSpeed, acceleration, deceleration } = CONFIG.player.movement;
        let vx = this.body.velocity.x;
        let vy = this.body.velocity.y;
        
        const deltaTime = input.deltaTime;
        const decelerationRate = Math.pow(deceleration, deltaTime);
        
        let { inputX, inputY } = input;

        // Normalize input vector
        if (inputX !== 0 || inputY !== 0) {
            const inputMagnitude = Math.sqrt(inputX * inputX + inputY * inputY);
            inputX /= inputMagnitude;
            inputY /= inputMagnitude;

            // v = v0 + a*t
            vx += inputX * acceleration * deltaTime;
            vy += inputY * acceleration * deltaTime;

            // Giới hạn tốc độ tối đa
            const currentSpeed = Math.sqrt(vx * vx + vy * vy);
            if (currentSpeed > maxSpeed) {
                const scale = maxSpeed / currentSpeed;
                vx *= scale;
                vy *= scale;
            }
        } else {
            // Áp dụng deceleration khi không có input
            if (Math.abs(vx) < 0.01) vx = 0;
            if (Math.abs(vy) < 0.01) vy = 0;
        }

        this.scene.matter.setVelocity(this.body, vx, vy);
    }
    handleKick(ball) {
        // Tính khoảng cách giữa player và bóng
        const { player } = CONFIG;
        const distance = Phaser.Math.Distance.Between(
            this.body.position.x,
            this.body.position.y,
            ball.body.position.x,
            ball.body.position.y
        );

        const minDistance = (player.graphic.radius + ball.config.physics.radius + this.normalKickDistance);


        if (distance <= minDistance && Phaser.Input.Keyboard.JustDown(this.cursors.kick)) {
            const angle = Phaser.Math.Angle.Between(
                this.body.position.x,
                this.body.position.y,
                ball.body.position.x,
                ball.body.position.y
            );

            // Tính vector velocity mới cho bóng
            const velocity = {
                x: Math.cos(angle) * this.normalKickVelocity,
                y: Math.sin(angle) * this.normalKickVelocity
            };

            // Áp dụng velocity mới vào bóng
            // Cộng thêm vào velocity hiện tại của bóng
            const currentVelocity = ball.body.velocity;

            this.scene.matter.setVelocity(
                ball.body,
                currentVelocity.x + velocity.x,
                currentVelocity.y + velocity.y
            );
        }
    }
    onServerUpdate(serverState) {
        // Cập nhật vị trí và vận tốc từ server
        this.serverPosition = serverState.position;
        this.serverVelocity = serverState.velocity;

        // Tính toán sai số
        const positionError = {
            x: this.serverPosition.x - this.body.position.x,
            y: this.serverPosition.y - this.body.position.y
        };

        // Xử lý sai số
        const errorThreshold = 50;
        if (Math.abs(positionError.x) > errorThreshold || 
            Math.abs(positionError.y) > errorThreshold) {
            this.setPosition(this.serverPosition.x, this.serverPosition.y);
            this.setVelocity(this.serverVelocity.x, this.serverVelocity.y);
        } else {
            const lerpFactor = 0.3;
            this.setPosition(
                this.body.position.x + positionError.x * lerpFactor,
                this.body.position.y + positionError.y * lerpFactor
            );
        }

        // Xóa các input đã được xử lý và áp dụng lại các input còn lại
        this.pendingInputs = this.pendingInputs.filter(input => {
            if (input.sequence <= serverState.lastProcessedInput) {
                return false;
            }
            this.applyInput(input);
            return true;
        });
    }
    reset () {
        this.setVelocity(0, 0); 
        this.setPosition(this.spawnX, this.spawnY); 
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

}

