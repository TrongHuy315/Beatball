class LerpPlayer {
    constructor(scene, authorityPlayer, info = null) {
        this.scene = scene;
        this.config = CONFIG.player;
        this.authorityPlayer = authorityPlayer;
        
        // Player data
        this.data = {
            goals: 0,
            assists: 0,
            name: info ? info.data.name : "Player",
            shirt: info ? info.data.shirtNumber || info.data.shirt || "0" : "0",
            side: info ? info.data.side : "left"
        };

        this.initialize();
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
        this.graphics.visible = true; 
    }

    updatePlayerVisibility() {
    }

    createGraphics() {
        // Use the same texture name as main player
        const textureName = `player_${this.data.side}_${this.data.shirt}`;
        
        // Create a sprite using the same texture
        const sprite = this.scene.add.image(0, 0, textureName);
        // sprite.setAlpha(0.6); // Make it semi-transparent
        
        return sprite;
    }

    createPhysicsBody() {
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

        return this.scene.matter.add.circle(0, 0, radius, {
            label: 'lerpPlayer',
            mass: physics.mass,
            restitution: physics.restitution,
            friction: physics.friction,
            frictionAir: physics.frictionAir,
            frictionStatic: physics.frictionStatic,
            inertia: physics.inertia,
            isStatic: false,
            collisionFilter: {
                category: categories.lerpPlayer,
                mask: ~(categories.player | categories.ball | categories.inner)
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
            0,
            nameConfig.offsetY,
            this.data.name,
            style
        );
        this.nameText.setOrigin(0.5);
        this.nameText.setDepth(1);
        this.nameText.setAlpha(0.6); // Make the name semi-transparent too
        this.container.add(this.nameText);
    }

    update() {
        if (!this.authorityPlayer) return;

        const authorityPos = this.authorityPlayer.getPosition();
        const currentPos = this.getPosition();
        
        const distance = Phaser.Math.Distance.Between(
            currentPos.x, currentPos.y,
            authorityPos.x, authorityPos.y
        );

        // Teleport if too far
        const teleportThreshold = 300;
        if (distance > teleportThreshold) {
            this.setPosition(authorityPos.x, authorityPos.y);
            this.setVelocity(
                this.authorityPlayer.body.velocity.x,
                this.authorityPlayer.body.velocity.y
            );
        } else {
            // Lerp position and velocity
            const lerpFactor = 0.05;
            const newX = currentPos.x + (authorityPos.x - currentPos.x) * lerpFactor;
            const newY = currentPos.y + (authorityPos.y - currentPos.y) * lerpFactor;
            
            this.setPosition(newX, newY);
            this.setVelocity(
                this.authorityPlayer.body.velocity.x,
                this.authorityPlayer.body.velocity.y
            );
        }
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
        if (this.container) {
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

            this.container.destroy();
            this.container = null;
        }

        if (this.body && this.scene && this.scene.matter) {
            this.scene.matter.world.remove(this.body);
            this.body = null;
        }

        this.authorityPlayer = null;
        this.scene = null;
        this.config = null;
    }
}