class PlayerController {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.body = null;
        this.graphics = null;
        this.cursors = null;
        this.moveType = CONFIG.player.movement.type;
        this.rangeIndicator = null; 
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
    }
    createRangeIndicator() {
        const { radius } = this.config.graphic;    
        const { color, width: ringWidth, offset, visible, alpha } = this.config.graphic.rangeConfig;
        
        // Bán kính trong và ngoài của vòng đai
        const innerRadius = radius + offset;
        const outerRadius = innerRadius + ringWidth;
        
        // Diameter cần để chứa toàn bộ vòng đai
        const diameter = 2 * (outerRadius);
    
        const canvas = document.createElement('canvas');
        canvas.width = diameter;
        canvas.height = diameter;
    
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
    
        const centerX = diameter / 2;
        const centerY = diameter / 2;
    
        // Vẽ 2 hình tròn và lấy phần khác nhau
        ctx.beginPath();
        // Vẽ vòng tròn ngoài
        ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
        // Vẽ vòng tròn trong (ngược chiều kim đồng hồ để tạo lỗ)
        ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2, true);
        
        // Tô màu phần vành đai
        ctx.fillStyle = color;
        ctx.fill();
    
        // Tạo texture
        const rangeTextureName = `range_${this.config.graphic.numberConfig.value}`;
        
        if (!this.scene.textures.exists(rangeTextureName)) {
            this.scene.textures.addCanvas(rangeTextureName, canvas);
        }
    
        // Tạo image
        this.rangeIndicator = this.scene.add.image(0, 0, rangeTextureName);
        
        // Scale để vẽ đúng kích thước
        const scale = (outerRadius * 2) / diameter;
        this.rangeIndicator.setScale(scale);
    
        this.rangeIndicator.setAlpha(alpha);
        this.rangeIndicator.setVisible(visible);
        this.rangeIndicator.setDepth(-1);
    
        this.container.add(this.rangeIndicator);
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
    createPlayerName() {
        const nameConfig = this.config.graphic.nameConfig;
        if (!nameConfig.on) return;

        // Tạo style cho text
        const style = {
            fontSize: `${nameConfig.fontSize}px`,
            fontFamily: nameConfig.fontFamily,
            fontWeight: nameConfig.fontWeight,
            color: nameConfig.color,
            stroke: nameConfig.strokeColor,
            strokeThickness: nameConfig.strokeWidth
        };

        // Tạo text object
        this.nameText = this.scene.add.text(
            this.body.position.x,
            this.body.position.y + nameConfig.offsetY,
            nameConfig.value,
            style
        );
        this.nameText.setOrigin(0.5); // Căn giữa text
        this.nameText.setDepth(-1); 
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
        var xx = this.body.velocity.x * this.config.physics.damping; 
        var yy = this.body.velocity.y * this.config.physics.damping; 
        this.setVelocity(xx, yy); 
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

    updateVelocityMovement() {
        const { maxSpeed, acceleration, deceleration } = CONFIG.player.movement;
        let vx = this.body.velocity.x;
        let vy = this.body.velocity.y;
        
        const deltaTime = this.scene.game.loop.delta / 1000;
        const decelerationRate = Math.pow(deceleration, deltaTime);
        
        // Xử lý input
        let inputX = 0;
        let inputY = 0;
        
        if (this.cursors.left.isDown) inputX -= 1;
        if (this.cursors.right.isDown) inputX += 1;
        if (this.cursors.up.isDown) inputY -= 1;
        if (this.cursors.down.isDown) inputY += 1;
    
        // Xử lý acceleration khi có input
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

