class PlayerController {
    constructor(scene, info = null) {
        this.scene = scene;
        this.config = CONFIG.player;
        this.info = info; 

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
        this.wasKicking = false; 
        this.userId = null; 
        this.maxSpeed = CONFIG.player.movement.maxSpeed; 

        // -------------- SET UP CLIENT PREDICTION PROPERTIES ---------
        this.pendingInputs = [];
        this.serverPosition = {x: 0, y: 0};
        this.serverVelocity = {x: 0, y: 0};
        this.sequence = 0; 
        this.lastUpdatetime = this.scene.networkManager.getServerTime(); 

        // -------------- AURA ANIMATION -------- 
        this.auraAnimation = {
            isPlaying: false,
            currentRadius: 0,
            startTime: 0,
            duration: CONFIG.player.graphic.aura_duration || 0.3, // seconds
            maxOffset: CONFIG.player.graphic.offset_aura || 15,
            alpha: 1
        };

        // ------------- GHOST MODE ---------
        this.isGhostMode = false;
        this.originalFilter = null;
    
        // ------------- KEYBOARD ----------
        this.lastSpecialKeyPressTime = 0; // thời điểm lần cuối bấm LKJI
        this.offsetKeyboard = 300; // 0.3s = 300ms
        
        // Thêm object để lưu trạng thái các phím đặc biệt
        this.specialKeyStates = {
            ghost: false,  // O
            pushBall: false,   // L
            powerShot: false,  // K
            kick: false,      // J
            curveShot: false  // I
        };

        this.data = {
            goals: 0,
            assists: 0,
            name: info ? info.data.name : "Player",
            shirt: info ? info.data.shirtNumber || info.data.shirt || "0" : "0",
            side: info ? info.data.side : "left"
        };
    }
    playAuraAnimation() {
        this.auraAnimation.isPlaying = true;
        this.auraAnimation.startTime = this.scene.networkManager.getServerTime();
        this.auraAnimation.currentRadius = 0;
        this.auraAnimation.alpha = 1;
    }

    

    // PLAYER INITIALIZATION 
    create(x = 200, y = 200) {
        console.log("Starting to create player with info: ", this.data); 
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
        this.graphics.visible = true; 
        this.scene.matter.add.gameObject(this.container, this.body);
        this.createPlayerName();
        this.createAuraEffect(); 
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
            kick: Phaser.Input.Keyboard.KeyCodes.J,
            ghost: Phaser.Input.Keyboard.KeyCodes.O,
            powerShot: Phaser.Input.Keyboard.KeyCodes.K,
            pushBall: Phaser.Input.Keyboard.KeyCodes.L,
            curveShot: Phaser.Input.Keyboard.KeyCodes.I
        });

        this.lerpPlayer = new LerpPlayer(this.scene, this, this.info);
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
        this.updateAura(); 
    }
    

    // CREATE PHYSIC / GRAPHIC PHASER 
    createGraphics() {
        // Get base colors based on side
        const baseColors = this.data.side === 'left' ? {
            fillColor: '#FF4B4B',       // Red fill for left side
            borderColor: this.config.graphic.borderColor,     // Lighter red border
            highlightColor: 'rgba(255, 255, 255, 0.3)'
        } : {
            fillColor: this.config.graphic.fillColor,     // Default blue fill
            borderColor: this.config.graphic.borderColor, // Default blue border
            highlightColor: 'rgba(255, 255, 255, 0.3)'
        };
        // Create unique texture name for each player
        const textureName = `player_${this.data.side}_${this.data.shirt}`;
        
        
        if (!this.scene.textures.exists(textureName)) {
            console.log("Draw player"); 
            const { borderWidth, radius, numberConfig, nameConfig } = this.config.graphic;
    
            const diameter = (radius * 2);
    
            const canvas = document.createElement('canvas');
            canvas.width = diameter;
            canvas.height = diameter;
            
            const ctx = canvas.getContext('2d');
    
            const centerX = radius;
            const centerY = radius;
            const innerRadius = radius - borderWidth;
            
            // Draw main fill
            ctx.beginPath();
            ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
            ctx.fillStyle = baseColors.fillColor;
            ctx.fill();
            
            // Draw border
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius - borderWidth/2, 0, Math.PI * 2);
            ctx.strokeStyle = baseColors.borderColor;
            ctx.lineWidth = borderWidth;
            ctx.stroke();
            
            // Draw highlight
            ctx.beginPath();
            ctx.arc(centerX, centerY - innerRadius/4, innerRadius/6, 0, Math.PI * 2);
            ctx.fillStyle = baseColors.highlightColor;
            ctx.fill();
            
            if (numberConfig.on) {
                console.log("Draw shirt number: ", this.data.shirt); 
                ctx.font = `${numberConfig.fontWeight} 
                ${numberConfig.fontSize}px ${numberConfig.fontFamily}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Draw number stroke
                ctx.strokeStyle = numberConfig.strokeColor;
                ctx.lineWidth = numberConfig.strokeWidth;
                ctx.strokeText(this.data.shirt, centerX + numberConfig.offsetX, centerY + numberConfig.offsetY);
                
                // Draw number fill
                ctx.fillStyle = numberConfig.color;
                ctx.fillText(this.data.shirt, centerX + numberConfig.offsetX, centerY + numberConfig.offsetY);
            }
    
            if (nameConfig.on) {
                console.log("Draw name: ", this.data.name); 
                ctx.font = `${nameConfig.fontWeight} ${nameConfig.fontSize}px ${nameConfig.fontFamily}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Draw name stroke
                ctx.strokeStyle = nameConfig.strokeColor;
                ctx.lineWidth = nameConfig.strokeWidth;
                ctx.strokeText(this.data.name, centerX + nameConfig.offsetX, centerY * 2 + nameConfig.offsetY);
                
                // Draw name fill
                ctx.fillStyle = nameConfig.color;
                ctx.fillText(this.data.name, centerX + nameConfig.offsetX, centerY * 2 + nameConfig.offsetY);
            }
    
            // Create texture from canvas
            this.scene.textures.addCanvas(textureName, canvas);
        }
        
        
        return this.scene.add.image(0, 0, textureName);
    }
    createPhysicsBody(x, y) {
        const { radius } = CONFIG.player.graphic;
        const physics = CONFIG.player.physics;
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
                mask: ~(categories.inner | categories.ball | categories.lerpPlayer | categories.predictBall)  
            }
        });
    }
    updateAura() {
        if (!this.auraSprite || !this.auraAnimation.isPlaying) return;
        
        const currentTime = this.scene.networkManager.getServerTime();
        const elapsedTime = (currentTime - this.auraAnimation.startTime) / 1000;
        const progress = Math.min(elapsedTime / this.auraAnimation.duration, 1);
        
        // Hiệu ứng alpha fade out
        this.auraSprite.setAlpha((1 - progress) * 0.8);
        
        if (progress >= 1) {
            this.auraAnimation.isPlaying = false;
            this.auraSprite.setAlpha(0);
        }
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
            this.data.name,
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
        const rangeTextureName = `range_${this.data.side}_${this.data.shirt}`;
    
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
        const currentTime = this.scene.networkManager.getServerTime();
        const deltaTime = (currentTime - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = currentTime;
    
        const input = {
            sequence: this.sequence++,
            deltaTime: Math.min(deltaTime, 0.1),
            inputX: 0,
            inputY: 0,
            kick: false,
            powerShot: false,
            pushBall: false,
            curveShot: false,
            isInvisible: false,
            timestamp: currentTime
        };
    
        // Xử lý phím di chuyển WASD
        if (this.cursors.left.isDown) input.inputX -= 1;
        if (this.cursors.right.isDown) input.inputX += 1;
        if (this.cursors.up.isDown) input.inputY -= 1;
        if (this.cursors.down.isDown) input.inputY += 1;
    
        // Reset tất cả trạng thái phím đặc biệt
        Object.keys(this.specialKeyStates).forEach(key => {
            this.specialKeyStates[key] = false;
        });
    
        // Kiểm tra các phím được bấm
        const pressedKeys = {
            ghost: this.cursors.ghost.isDown,
            kick: this.cursors.kick.isDown,
            powerShot: this.cursors.powerShot.isDown,
            pushBall: this.cursors.pushBall.isDown,
            curveShot: this.cursors.curveShot.isDown
        };
    
        const pressedSpecialKeys = Object.entries(pressedKeys).filter(([_, isPressed]) => isPressed);
        const pressedCount = pressedSpecialKeys.length;
        const timeSinceLastSpecial = currentTime - this.lastSpecialKeyPressTime;
    
        if (pressedCount > 0) {
            if (pressedKeys.ghost) {
                // Nếu có O được bấm (dù một mình hay cùng phím khác)
                this.specialKeyStates.ghost = true;
            } else {
                // Không có O, xử lý theo thứ tự ưu tiên J > K > L > I
                if (timeSinceLastSpecial >= this.offsetKeyboard) {
                    if (pressedKeys.kick) {
                        this.specialKeyStates.kick = true;
                        this.lastSpecialKeyPressTime = currentTime;
                    } else if (pressedKeys.powerShot) {
                        this.specialKeyStates.powerShot = true;
                        this.lastSpecialKeyPressTime = currentTime;
                    } else if (pressedKeys.pushBall) {
                        this.specialKeyStates.pushBall = true;
                        this.lastSpecialKeyPressTime = currentTime;
                    } else if (pressedKeys.curveShot) {
                        this.specialKeyStates.curveShot = true;
                        this.lastSpecialKeyPressTime = currentTime;
                    }
                }
            }
        }
    
        // Áp dụng trạng thái phím vào input
        input.isInvisible = this.specialKeyStates.ghost;
        input.kick = this.specialKeyStates.kick;
        input.powerShot = this.specialKeyStates.powerShot;
        input.pushBall = this.specialKeyStates.pushBall;
        input.curveShot = this.specialKeyStates.curveShot;
    
        // Xử lý các hiệu ứng
        if (this.specialKeyStates.kick && !this.wasKicking) {
            this.playAuraAnimation();
        }
        this.wasKicking = this.specialKeyStates.kick;
    
        if (this.specialKeyStates.ghost && !this.isGhostMode) {
            this.activateGhostMode();
        } else if (!this.specialKeyStates.ghost && this.isGhostMode) {
            this.deactivateGhostMode();
        }
    
        // APPLY INPUT 
        this.applyInput(input);
        
        // SAVE FOR RECONCILLIATION 
        if (this.pendingInputs.length > 100) {
            this.pendingInputs = this.pendingInputs.slice(-100);
        }
        this.pendingInputs.push(input);
        
        // SEND INPUT TO SERVER 
        this.sendInputToServer(input);
    
        return input;
    }
    activateGhostMode() {
        if (this.isGhostMode) return;
        const categories = {
            outer: 0x0001,         // 000001
            inner: 0x0002,         // 000010
            player: 0x0004,        // 000100
            ball: 0x0008,          // 001000
            net: 0x0010,           // 010000
            nonGraphicBall: 0x0020, // 100000
            predictBall: 0x0040     // 1000000
        };
        
        this.isGhostMode = true;
    
        // Lưu collision filter gốc
        this.originalFilter = this.body.collisionFilter;
    
        // Mask sẽ loại trừ inner wall và các loại ball
        this.body.collisionFilter = {
            category: categories.player,
            // Cho phép va chạm với tất cả NGOẠI TRỪ inner, ball, nonGraphicBall, predictBall
            mask: categories.outer | categories.player | categories.net
            // Hoặc viết theo cách khác:
            // mask: ~(categories.inner | categories.ball | categories.nonGraphicBall | categories.predictBall)
        };
    
        // Hiệu ứng ghost
        this.graphics.setAlpha(0.5);
        this.graphics.setTint(0x00ffff);
    }

    deactivateGhostMode() {
        if (!this.isGhostMode) return;

        this.isGhostMode = false;

        // Khôi phục collision filter gốc
        if (this.originalFilter) {
            this.body.collisionFilter = this.originalFilter;
        }

        // Khôi phục graphics
        this.graphics.setAlpha(1);
        this.graphics.clearTint();
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
            if (currentSpeed > this.maxSpeed) {
                const scale = this.maxSpeed / currentSpeed;
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
                powerShot: input.powerShot,
                pushBall: input.pushBall,
                curveShot: input.curveShot,
                isInvisible: input.isInvisible,
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

    // AURA 
    createAuraEffect() {
        const { radius } = this.config.graphic;
        const maxRadius = radius + this.auraAnimation.maxOffset;
        
        // Tạo texture cho aura
        const auraTextureName = `aura_effect_${this.data.side}_${this.data.shirt}`;
        if (!this.scene.textures.exists(auraTextureName)) {
            const canvas = document.createElement('canvas');
            const size = maxRadius * 2;
            canvas.width = size;
            canvas.height = size;
            
            const ctx = canvas.getContext('2d');
            
            // Tạo radial gradient từ rìa player tới max offset
            const gradient = ctx.createRadialGradient(
                size/2, size/2, radius,  // bắt đầu từ rìa player
                size/2, size/2, maxRadius // kết thúc ở max offset
            );
            
            // Điều chỉnh gradient thành màu xanh lá
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)'); // Vẫn giữ trung tâm trắng
            gradient.addColorStop(0.3, 'rgba(150, 255, 150, 0.6)'); // Xanh lá nhạt
            gradient.addColorStop(0.6, 'rgba(50, 255, 50, 0.4)'); // Xanh lá đậm
            gradient.addColorStop(1, 'rgba(0, 255, 0, 0)'); // Xanh lá fade out
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(size/2, size/2, maxRadius, 0, Math.PI * 2);
            ctx.fill();
            
            this.scene.textures.addCanvas(auraTextureName, canvas);
        }
        
        // Tạo sprite cho aura với scale 1 (đã đúng kích thước)
        this.auraSprite = this.scene.add.sprite(0, 0, auraTextureName);
        this.auraSprite.setAlpha(0);
        this.auraSprite.setScale(1);
        this.auraSprite.setDepth(-1);
        this.auraSprite.setBlendMode(Phaser.BlendModes.ADD);
        
        this.container.add(this.auraSprite);
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
    createTrailEffect() {
        this.trailPositions = [];
        this.maxTrails = 5;
        this.trailSprites = [];
        
        // Tạo các sprite cho trail
        for(let i = 0; i < this.maxTrails; i++) {
            const trail = this.scene.add.sprite(0, 0, 'player');
            trail.setAlpha(0.15 - (i * 0.03)); // Độ mờ giảm dần
            trail.setTint(0x4444ff); // Tạo màu xanh cho trail
            trail.setDepth(-1);
            this.container.add(trail);
            this.trailSprites.push(trail);
        }
    }
    
    updateTrail() {
        // Thêm vị trí hiện tại vào đầu mảng
        this.trailPositions.unshift({x: 0, y: 0});
        
        // Giới hạn số lượng trail
        if(this.trailPositions.length > this.maxTrails) {
            this.trailPositions.pop();
        }
    
        // Cập nhật vị trí của các trail sprite
        this.trailSprites.forEach((sprite, index) => {
            if(this.trailPositions[index]) {
                sprite.setPosition(
                    this.trailPositions[index].x,
                    this.trailPositions[index].y
                );
            }
        });
    }
}