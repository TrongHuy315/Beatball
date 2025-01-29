class Ball3 {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.frameRemainder = 0; 
        this.authorityBall = null;
        this.oldVelocities = new Map();
        this.stick = 0;
        this.avoidLerp = 0;
        this.avoidLerpTime = 1; // in second
        this.initialize();
		this.collideWall = false; 
		this.lastCollidePosition = null;
		this.lastTimeCollide = Date.now(); 
    }
	ignoreCollidePosition(pos) {
		if (this.lastCollidePosition == null) return false;
		const distance = Math.sqrt(
			Math.pow(pos.x - this.lastCollidePosition.x, 2) + 
			Math.pow(pos.y - this.lastCollidePosition.y, 2)
		);   
		return distance <= 10;
	}
	calculateCollisionPoint(validPoints) {
		if (!validPoints || validPoints.length === 0) {
			return null;
		}
		
		// Calculate each sum separately and log each addition
		let sumX = 0;
		let sumY = 0;
		
		validPoints.forEach((point, i) => {
			console.log(`Adding point ${i}:`, point.x, point.y);
			sumX += point.x;
			sumY += point.y;
			console.log(`Running sums - X: ${sumX}, Y: ${sumY}`);
		});
	
		const result = {
			x: sumX / validPoints.length,
			y: sumY / validPoints.length
		};
	
		console.log("Final calculation:", {
			sumX,
			sumY,
			count: validPoints.length,
			result
		});
	
		return result;
	}
	isCollideWithWall() {
        const { totalWidth, totalHeight, offset_horizontal, offset_vertical, pitch, nets } = CONFIG;
        const y1 = offset_vertical + pitch.borderWidth;
        const y2 = y1 + pitch.height;
        const x1 = offset_horizontal + nets.borderWidth + pitch.borderWidth + nets.width;
        const x2 = x1 + pitch.width;
        var offset = 0.05;
        if (this.getPosition().x - this.config.physics.radius - x1 <= offset) {
            return true;
        }
        if (x2 - (this.getPosition().x + this.config.physics.radius) <= offset) {
            return true;
        }
        if (this.getPosition().y - this.config.physics.radius - y1 <= offset) {
            return true;
        }
        if (y2 - (this.getPosition().y + this.config.physics.radius) <= offset) {
            return true;
        }
        return false;
    }
	isWallChangeVelocity() {
		const oldVel = this.getVelocity();
		const currentVel = this.authorityBall.getVelocity();
		const epsilon = 0.1;
		
		const xChangedDirection = oldVel.x * currentVel.x < 0;
		const yChangedDirection = oldVel.y * currentVel.y < 0;
		
		if (xChangedDirection !== yChangedDirection) {
			if (xChangedDirection) {
				return Math.abs(Math.abs(oldVel.x) - Math.abs(currentVel.x)) < epsilon;
			} else {
				return Math.abs(Math.abs(oldVel.y) - Math.abs(currentVel.y)) < epsilon;
			}
		}
		return false;
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
	opsAvoidLerp () {
		this.avoidLerp++; 
                
		setTimeout(() => {
			this.avoidLerp -= 1;
			console.log("Avoid Lerp of Lerping Ball: ", this.avoidLerp);  
		}, this.avoidLerpTime * 1000);
	}
	setupCollisionHandlers() {
		this.scene.matter.world.on('beforeupdate', () => {
		});
	
		// this.scene.matter.world.on('collisionstart', (event) => {
		// 	event.pairs.forEach((pair) => {
		// 		const ball = pair.bodyA.label === 'ball3' ? pair.bodyA : 
		// 					(pair.bodyB.label === 'ball3' ? pair.bodyB : null);
		// 		const wall = pair.bodyA.label === 'wall' ? pair.bodyA : 
		// 					(pair.bodyB.label === 'wall' ? pair.bodyB : null);
				
		// 		if (ball && wall) {
		// 			console.log("Current stick value:", this.stick);
		// 			console.log("Last Collision Delta Time: ", Date.now() - this.lastTimeCollide);
		// 			console.log("Current ball velocity:", this.body.velocity);
		// 			console.log("Stored old velocities:", this.oldVelocities);
		// 			const { totalWidth, totalHeight, offset_horizontal, offset_vertical, pitch, nets } = CONFIG;
		// 			const y1 = offset_vertical + pitch.borderWidth;
		// 			const y2 = y1 + pitch.height;
		// 			const x1 = offset_horizontal + nets.borderWidth + pitch.borderWidth + nets.width;
		// 			const x2 = x1 + pitch.width;
		// 			this.lastTimeCollide = Date.now(); 
		// 			// Calculate collision point based on ball position and wall type
		// 			let collidePos;
		// 			switch (wall.customType) {
		// 				case 'U':
		// 					collidePos = {
		// 						x: ball.position.x,
		// 						y: y2, 
		// 					};
		// 					break;
		// 				case 'D':
		// 					collidePos = {
		// 						x: ball.position.x,
		// 						y: y1, 
		// 					};
		// 					break;
		// 				case 'L':
		// 					collidePos = {
		// 						x: x2, 
		// 						y: ball.position.y
		// 					};
		// 					break;
		// 				case 'R':
		// 					collidePos = {
		// 						x: x1,
		// 						y: ball.position.y
		// 					};
		// 					break;
		// 			}
		// 			console.log("Collision Position: ", collidePos);
		// 			this.stick++;
					
		// 			if (this.ignoreCollidePosition(collidePos)) {
		// 				this.lastCollidePosition = collidePos;
		// 				console.log("Ignoring collision lerp Ball - too close to last one");
		// 				return;
		// 			}
		// 			this.lastCollidePosition = collidePos;
		// 			this.collideWall = true;
		// 			this.opsAvoidLerp();
		// 			this.authorityBall.combo--; 
		// 			console.log("AuthorityBall Combo: ", this.authorityBall.combo); 
		// 			const oldVel = this.oldVelocities.get(this.body.id);
		// 			if (!oldVel) return;
		
		// 			const dampingDirection = 0.38;
		// 			let newVelX = oldVel.x;
		// 			let newVelY = oldVel.y;
					
		// 			switch (wall.customType) {
		// 				case 'U':
		// 				case 'D':
		// 					newVelY = -newVelY * dampingDirection;
		// 					break;
		// 				case 'L':
		// 				case 'R':
		// 					newVelX = -newVelX * dampingDirection;
		// 					break;
		// 			}
		
		// 			console.log("Lerp Ball Collide with Wall: "); 
		// 			console.log("Old velocity:", oldVel.x, oldVel.y);
		// 			console.log("New velocity:", newVelX, newVelY);
		// 			this.setVelocity(newVelX, newVelY);
		// 		}
		// 	});
		// });
	
		// this.scene.matter.world.on('collisionend', (event) => {
		// 	event.pairs.forEach((pair) => {
		// 		const ball3 = pair.bodyA.label === 'ball3' ? pair.bodyA : 
		// 					  (pair.bodyB.label === 'ball3' ? pair.bodyB : null);
		// 		const wall = pair.bodyA.label === 'wall' ? pair.bodyA : 
		// 					 (pair.bodyB.label === 'wall' ? pair.bodyB : null);
	
		// 		if (ball3 && wall) {
		// 			this.stick--; 
		// 		}
		// 	});
		// });
	
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
            outer: 0x0001,
            inner: 0x0002,
            player: 0x0004,
            ball: 0x0008,
            net: 0x0010,
            nonGraphicBall: 0x0020,
            predictBall: 0x0040, 
            lerpPlayer: 0x0080,
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
					mask: ~(categories.ball | categories.nonGraphicBall | categories.predictBall | categories.player)
				}
			}
		);
    }
	dampingBall () {
		var xx = this.body.velocity.x * this.damping; 
        var yy = this.body.velocity.y * this.damping; 
        this.setVelocity(xx, yy); 
	}
    update() {
		if (this.stick === 0 && Math.min(Math.abs(this.body.velocity.x), Math.abs(this.body.velocity.y)) > 0) {
			this.oldVelocities.set(this.body.id, {
				x: this.body.velocity.x,
				y: this.body.velocity.y
			});
		}
		// If there's no authority ball data to sync with, do nothing
		if (!this.authorityBall) return;
	
		const authorityPos = this.authorityBall.getPosition();
		const authorityVel = this.authorityBall.getVelocity();
		const currentPos = this.getPosition();
		const distance = Phaser.Math.Distance.Between(
			currentPos.x, currentPos.y,
			authorityPos.x, authorityPos.y
		);
	
		// Teleport if extremely far away (safety net)
		const teleportThreshold = 300;
		if (distance > teleportThreshold) {
			this.setPosition(authorityPos.x, authorityPos.y);
			this.setVelocity(authorityVel.x, authorityVel.y);
			return;
		}
		// if (this.avoidLerp > 0 || this.authorityBall.avoidLerp > 0) return; 
		// if (this.authorityBall.combo > 0) {
		// 	return; 
		// }
		// if (this.isWallChangeVelocity()) return; 
		// if (authorityVel.x != this.getVelocity().x || authorityVel.y != this.getVelocity().y) console.log("Last Set Velocity: ", authorityVel); 
		// 1) Always match velocity if not 'sticking' (i.e. no wall collisions)
		this.setVelocity(authorityVel.x, authorityVel.y);
	
		// 2) Compute a dynamic lerp factor based on distance
		//    If distance is small, use smaller lerp (for smoothness).
		//    If distance is large, use larger lerp (for quicker correction).
		const minLerp = 0.01;   // minimum lerp (when near)
		const maxLerp = 0.2;    // maximum lerp (when far)
		const maxDistForLerp = 100; // scale factor for how quickly we ramp up to maxLerp
		// Calculate a ratio from 0..1 based on how far we are (capped at 1)
		const distRatio = Phaser.Math.Clamp(distance / maxDistForLerp, 0, 1);
		// Interpolate our “variable” lerpFactor
		const lerpFactor = minLerp + distRatio * (maxLerp - minLerp);
	
		// 3) Lerp to new position
		//    This retains smoothness up close and aggressively corrects when far
		const newX = currentPos.x + (authorityPos.x - currentPos.x) * lerpFactor;
		const newY = currentPos.y + (authorityPos.y - currentPos.y) * lerpFactor;
		this.setPosition(newX, newY);
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