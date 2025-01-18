class PlayerController {
    constructor(scene) {
		this.scene = scene;
        this.config = CONFIG.player;


		// -------------------- SET UP PLAYER CANVA ----------------  
        this.horizontalOffset = this.config.horizontal;
        this.verticalOffset = this.config.vertical;
        this.canvas = document.createElement('canvas');
        this.canvas.width = CONFIG.totalWidth + (this.horizontalOffset * 2);
        this.canvas.height = CONFIG.totalHeight + (this.verticalOffset * 2);
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = `${-this.horizontalOffset}px`;
        this.canvas.style.top = `${-this.verticalOffset}px`;
        this.canvas.style.pointerEvents = 'none';
        const playerContainer = document.getElementById('player_container');
        playerContainer.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // ----------------- SET UP PLAYER PROPERTIES --------------- 
        this.container = null;
        this.body = null;
        this.graphics = null;
        this.cursors = null;
        this.moveType = CONFIG.player.movement.type;
        this.rangeIndicator = null;

        // -------------- SET UP CLIENT PREDICTION PROPERTIES ---------
        this.pendingInputs = [];
        this.serverPosition = {x: 0, y: 0};
        this.serverVelocity = {x: 0, y: 0};
        this.sequence = 0; 
        this.lastUpdatetime = performance.now(); 

        this.networkManager = scene.networkManager; 
    }


	// PLAYER INITIALIZATION 
    create(x = 200, y = 200) {
        this.config = CONFIG.player;
        this.spawnX = x;
        this.spawnY = y;

        // ----- SET UP PLAYER BODY -------
        this.graphics = this.createGraphics();  // SET UP GRAPHIC 
        this.body = this.createPhysicsBody(x, y); // SET UP BODY 
        this.container = this.scene.add.container(  
            this.body.position.x,
            this.body.position.y,
            [this.graphics]
        );
        this.scene.matter.add.gameObject(this.container, this.body);
        this.createPlayerName();
        if (this.config.graphic.rangeConfig.visible) this.createRangeIndicator();

        // SET UP EVENT 
        this.scene.matter.world.on('beforeupdate', this.afterPhysicsUpdate, this);

        
        // SET ASSIGNED POSITION 
        this.setPosition(x, y);
        
        // ------------- SET UP INPUT -------------- 
        this.cursors = this.scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            kick: Phaser.Input.Keyboard.KeyCodes.L
        });
        return this;
    }

    // UPDATE PLAYER LOCALLY 
    afterPhysicsUpdate() {
    }
    update() {
        this.processInput(); 
        var xx = this.body.velocity.x * this.config.physics.damping; 
        var yy = this.body.velocity.y * this.config.physics.damping; 
        this.setVelocity(xx, yy); 
    }
    

	// CREATE PHYSIC / GRAPHIC PHASER 
	createGraphics() {
        console.log("Attempting draw player graphic"); 
        if (!this.scene.textures.exists('player')) {
            console.log("Draw player graphic"); 
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
            isStatic: false,
            collisionFilter: {
                category: this.scene.categories.player,
                mask: ~this.scene.categories.inner  // Va chạm với tất cả trừ inner
            }
        });
    }
	createPlayerName() {
        const nameConfig = this.config.graphic.nameConfig;
        if (!nameConfig.on) return;
    
        const style = {
            fontSize: `${nameConfig.fontSize}px`,
            fontFamily: nameConfig.fontFamily,
            fontWeight: nameConfig.fontWeight,
            color: nameConfig.color,
            stroke: nameConfig.strokeColor,
            strokeThickness: nameConfig.strokeWidth
        };
    
        this.nameText = this.scene.add.text(
            0, // Vị trí local trong container
            nameConfig.offsetY, // Offset Y từ center của container
            nameConfig.value,
            style
        );
        this.nameText.setOrigin(0.5);
        this.nameText.setDepth(1);
    
        // Thêm vào container để nó di chuyển theo
        this.container.add(this.nameText);
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


    // CLIENT PREDICTION 
    processInput() {
    if (!this.cursors) return;
        
        // Use networkManager time instead of performance.now()
        const currentTime =  this.scene.networkManager.getServerTime(); 
        const deltaTime = (currentTime - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = currentTime;

        // Limit deltaTime to avoid physics glitches
        const cappedDeltaTime = Math.min(deltaTime, 0.1);

        const input = {
            sequence: this.sequence++,
            deltaTime: cappedDeltaTime,
            inputX: 0,
            inputY: 0,
            kick: this.cursors.kick.isDown,
            serverTime: currentTime  // Changed from timestamp to serverTime
        };
        
        if (this.cursors.left.isDown) input.inputX -= 1;
        if (this.cursors.right.isDown) input.inputX += 1;
        if (this.cursors.up.isDown) input.inputY -= 1;
        if (this.cursors.down.isDown) input.inputY += 1;

        // Apply input locally
        this.applyInput(input);
        
        // Save input for reconciliation
        this.pendingInputs.push(input);
        if (this.pendingInputs.length > 100) {
            this.pendingInputs = this.pendingInputs.slice(-100);
        }
        
        // Send to server
        this.sendInputToServer(input);

        return input;
    }
    applyInput(input) {
        const { maxSpeed, acceleration, deceleration } = CONFIG.player.movement;
        let vx = this.body.velocity.x;
        let vy = this.body.velocity.y;
        
        const deltaTime = input.deltaTime;
        
        // Handle input
        let { inputX, inputY } = input;
        

        if (inputX !== 0 || inputY !== 0) {
            const inputMagnitude = Math.sqrt(inputX * inputX + inputY * inputY);
            inputX /= inputMagnitude;
            inputY /= inputMagnitude;
    
            // v = v0 + a*t
            vx += inputX * acceleration * deltaTime;
            vy += inputY * acceleration * deltaTime;
    
            // Cap max speed
            const currentSpeed = Math.sqrt(vx * vx + vy * vy);
            if (currentSpeed > maxSpeed) {
                const scale = maxSpeed / currentSpeed;
                vx *= scale;
                vy *= scale;
            }
        }
        this.scene.matter.setVelocity(this.body, vx, vy);
    }
    sendInputToServer(input) {
        if (!this.scene.SOCKET) return;
        this.scene.SOCKET.emit('sendInput', {
            input: {
                sequence: input.sequence,
                deltaTime: input.deltaTime,
                inputX: input.inputX,
                inputY: input.inputY,
                kick: input.kick,
                timestamp: input.timestamp
            },
        });
    }
    serverReconciliation(serverState) {
        let predictedState = {
            position: { x: serverState.position.x, y: serverState.position.y },
            velocity: { x: serverState.velocity.x, y: serverState.velocity.y }
        };

        this.pendingInputs = this.pendingInputs.filter(input => {
            if (input.sequence <= serverState.lastProcessedInput) {
                return false;
            }
            
            let vx = predictedState.velocity.x;
            let vy = predictedState.velocity.y;
            
            const damping = this.config.physics.damping;
            vx *= damping;
            vy *= damping;

            if (input.inputX !== 0 || input.inputY !== 0) {
                const { acceleration, maxSpeed } = this.config.movement;
                
                let inputX = input.inputX;
                let inputY = input.inputY;
                if (inputX !== 0 && inputY !== 0) {
                    const normalize = 1 / Math.sqrt(2);
                    inputX *= normalize;
                    inputY *= normalize;
                }

                vx += inputX * acceleration * input.deltaTime;
                vy += inputY * acceleration * input.deltaTime;

                const currentSpeed = Math.sqrt(vx * vx + vy * vy);
                if (currentSpeed > maxSpeed) {
                    const scale = maxSpeed / currentSpeed;
                    vx *= scale;
                    vy *= scale;
                }
            }

            predictedState.position.x += vx * input.deltaTime;
            predictedState.position.y += vy * input.deltaTime;
            
            predictedState.velocity.x = vx;
            predictedState.velocity.y = vy;

            return true;
        });

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

        if (distanceError > errorThreshold || velocityErrorMagnitude > velocityErrorThreshold) {
            this.setPosition(predictedState.position.x, predictedState.position.y);
            this.setVelocity(predictedState.velocity.x, predictedState.velocity.y);
        } else {
            // Nếu error nhỏ, lerp correction
            const lerpFactor = Math.min(0.3, distanceError / errorThreshold);
            const velocityLerpFactor = Math.min(0.3, velocityErrorMagnitude / velocityErrorThreshold);

            // Lerp position
            const newX = this.body.position.x + (predictedState.position.x - this.body.position.x) * lerpFactor;
            const newY = this.body.position.y + (predictedState.position.y - this.body.position.y) * lerpFactor;
            this.setPosition(newX, newY);

            // Lerp velocity
            const newVX = this.body.velocity.x + (predictedState.velocity.x - this.body.velocity.x) * velocityLerpFactor;
            const newVY = this.body.velocity.y + (predictedState.velocity.y - this.body.velocity.y) * velocityLerpFactor;
            this.setVelocity(newVX, newVY);
        }
    }   

	// SET GET POSITION / VELOCITY 
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

    // DRAW ALL NECCESSARY STUFF USER CANVA API - called on multiple frame if player is not in bound 
	draw() { 
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const { radius, fillColor, borderColor, borderWidth, 
                numberConfig, nameConfig, rangeConfig } = this.config.graphic;

        // Vẽ range indicator nếu được bật
        if (rangeConfig.visible) {
            this.drawRangeIndicator();
        }

        // Vẽ player
        this.ctx.beginPath();
        this.ctx.arc(this.position.x, this.position.y, radius - borderWidth, 0, Math.PI * 2);
        this.ctx.fillStyle = fillColor;
        this.ctx.fill();

        // Vẽ border
        this.ctx.beginPath();
        this.ctx.arc(this.position.x, this.position.y, radius - borderWidth/2, 0, Math.PI * 2);
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = borderWidth;
        this.ctx.stroke();

        // Vẽ highlight
        this.ctx.beginPath();
        this.ctx.arc(
            this.position.x, 
            this.position.y - (radius - borderWidth)/4, 
            (radius - borderWidth)/6, 
            0, Math.PI * 2
        );
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fill();

        // Vẽ số
        if (numberConfig.on) {
            this.drawNumber();
        }

        // Vẽ tên
        if (nameConfig.on) {
            this.drawName();
        }
    }
	drawRangeIndicator() {
        const { radius } = this.config.graphic;
        const { color, width, offset, alpha } = this.config.graphic.rangeConfig;

        const innerRadius = radius + offset;
        const outerRadius = innerRadius + width;

        this.ctx.globalAlpha = alpha;
        this.ctx.beginPath();
        this.ctx.arc(this.position.x, this.position.y, outerRadius, 0, Math.PI * 2);
        this.ctx.arc(this.position.x, this.position.y, innerRadius, 0, Math.PI * 2, true);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
    }
    drawNumber() {
        const cfg = this.config.graphic.numberConfig;
        this.ctx.font = `${cfg.fontWeight} ${cfg.fontSize}px ${cfg.fontFamily}`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Stroke
        this.ctx.strokeStyle = cfg.strokeColor;
        this.ctx.lineWidth = cfg.strokeWidth;
        this.ctx.strokeText(
            cfg.value.toString(), 
            this.position.x + cfg.offsetX, 
            this.position.y + cfg.offsetY
        );

        // Fill
        this.ctx.fillStyle = cfg.color;
        this.ctx.fillText(
            cfg.value.toString(), 
            this.position.x + cfg.offsetX, 
            this.position.y + cfg.offsetY
        );
    }
    drawName() {
        const cfg = this.config.graphic.nameConfig;
        
        // Kiểm tra tọa độ hợp lệ
        if (isNaN(this.position.x) || isNaN(this.position.y)) {
            console.log("Invalid coordinates:", this.position.x, this.position.y);
            return;
        }
        
        const drawX = Math.floor(this.position.x + (cfg.offsetX || 0));
        const drawY = Math.floor(this.position.y + (cfg.offsetY || 0));
        
        this.ctx.font = `${cfg.fontWeight} ${cfg.fontSize}px ${cfg.fontFamily}`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
    
        // Stroke
        this.ctx.strokeStyle = cfg.strokeColor;
        this.ctx.lineWidth = cfg.strokeWidth;
        this.ctx.strokeText(cfg.value, drawX, drawY);
    
        // Fill
        this.ctx.fillStyle = cfg.color;
        this.ctx.fillText(cfg.value, drawX, drawY);
    }

    // SERVER TIME 
    syncTimeWithServer() {
        // Send a ping to the server and calculate the round-trip time
        const pingTime = Date.now();
        this.sendPingToServer();
        // On receiving pong from server:
        this.onPongFromServer = (serverTime) => {
            const pongTime = Date.now();
            const latency = pongTime - pingTime;
            this.clientTimeOffset = serverTime + latency / 2 - pongTime;
        };
    }
    getServerTime() {
        return Date.now() + this.clientTimeOffset;
    }

	// DESTROY 
	destroy() {
        // 1. Remove physics event listener
        if (this.scene && this.scene.matter && this.scene.matter.world) {
            this.scene.matter.world.off('beforeupdate', this.afterPhysicsUpdate, this);
        }
    
        // 2. Remove children from container BEFORE destroying container
        if (this.container) {
            if (this.rangeIndicator) {
                this.container.remove(this.rangeIndicator);
                this.rangeIndicator.destroy();
                this.rangeIndicator = null;
            }
            
            if (this.nameText) {
                this.container.remove(this.nameText);
                this.nameText.destroy();
                this.nameText = null;
            }
            
            if (this.graphics) {
                this.container.remove(this.graphics);
                this.graphics.destroy();
                this.graphics = null;
            }
            if (this.container) {
                this.container.destroy();
                this.container = null;
            }
        
        }

        // 3. Cleanup Matter.js physics body
        if (this.body && this.scene && this.scene.matter) {
            this.scene.matter.world.remove(this.body);
            this.body = null;
        }
    
        // 4. Cleanup keyboard inputs
        if (this.cursors) {
            for (let key in this.cursors) {
                if (this.cursors[key]) {
                    this.cursors[key].removeAllListeners();
                    this.cursors[key] = null;
                }
            }
            this.cursors = null;
        }
        // 5. Clear context
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx = null;
        }

        // 6. Cleanup canvas
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
            this.canvas = null;
        }
    
        // 8. Clear references and data
        this.pendingInputs = [];
        this.serverPosition = null;
        this.serverVelocity = null;
        this.config = null;
        this.scene = null;
        this.position = null;
    }

    setTeamColor(teamColors) {
        const { fillColor, borderColor } = this.config.graphic;
        this.config.graphic.fillColor = teamColors.primary;
        
        // Recreate graphics with new color
        if (this.graphics) {
            this.graphics.destroy();
            this.graphics = this.createGraphics();
            if (this.container) {
                this.container.add(this.graphics);
            }
        }
    }

}