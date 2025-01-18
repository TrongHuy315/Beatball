export class GameStartDisplay {
    constructor(scene) {
        this.scene = scene;
        this.countdownContainer = null;
        this.waitingContainer = null;
        this.waitingTween = null;
        
        // Tạo unique ID cho mỗi instance
        this.instanceId = `gamestart_${this.scene.networkManager.getServerTime()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Cleanup khi tab/window đóng
        window.addEventListener('beforeunload', () => this.cleanup());
    }
    showWaitingScreen() {
        this.cleanupWaitingScreen();

        this.waitingContainer = this.scene.add.container(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2);

        // Text "Waiting for players"
        const waitingText = this.scene.add.text(0, -40, 'Waiting for players', {
            fontSize: '32px',
            fontFamily: 'Arial Black',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);

        // Create dots container
        const dotsContainer = this.scene.add.container(0, 60);
        
        // Create dots using Graphics objects
        const dotCount = 8;
        const radius = 20;
        const dotRadius = 4;

        for (let i = 0; i < dotCount; i++) {
            const angle = (i / dotCount) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            // Create a Graphics object for each dot
            const dot = this.scene.add.graphics();
            dot.fillStyle(0xFFFFFF, 1 - (i / dotCount));
            dot.fillCircle(0, 0, dotRadius);
            dot.setPosition(x, y);
            
            dotsContainer.add(dot);
        }

        this.waitingContainer.add([waitingText, dotsContainer]);
        this.waitingContainer.setDepth(9999);

        // Rotation animation
        this.waitingTween = this.scene.tweens.add({
            targets: dotsContainer,
            angle: 360,
            duration: 1500,
            repeat: -1,
            ease: 'Linear'
        });

        // Floating animation
        this.scene.tweens.add({
            targets: this.waitingContainer,
            y: CONFIG.totalHeight / 2 - 10,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    hideWaitingScreen() {
        if (!this.waitingContainer) return;

        if (this.waitingTween) {
            this.waitingTween.stop();
            this.waitingTween = null;
        }

        this.scene.tweens.add({
            targets: this.waitingContainer,
            alpha: 0,
            duration: 500,
            onComplete: () => {
                this.cleanupWaitingScreen();
            }
        });
    }

    cleanupWaitingScreen() {
        if (this.waitingTween) {
            this.waitingTween.stop();
            this.waitingTween = null;
        }

        if (this.waitingContainer) {
            // Destroy all children first
            while(this.waitingContainer.list.length > 0) {
                const child = this.waitingContainer.list[0];
                this.waitingContainer.remove(child);
                child.destroy();
            }
            this.waitingContainer.destroy();
            this.waitingContainer = null;
        }
    }

    

    showStartCountdown(duration, callback) {
        this.hideWaitingScreen();
        if (this.countdownContainer) {
            this.countdownContainer.destroy();
        }
        
        this.countdownContainer = this.scene.add.container(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2);
        
        const countdownText = this.scene.add.text(0, 0, '3', {
            fontSize: '144px',
            fontFamily: 'Arial Black',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center',
            resolution: 1
        }).setOrigin(0.5);
        
        countdownText.setBlendMode(Phaser.BlendModes.NORMAL);
        this.countdownContainer.add(countdownText);
        this.countdownContainer.setDepth(9999);
        
        let currentNumber = 3;
        let isDestroyed = false;
        
        const updateNumber = () => {
            if (isDestroyed || !countdownText || !countdownText.scene) {
                return;
            }
    
            if (currentNumber > 0) {
                this.scene.tweens.add({
                    targets: countdownText,
                    alpha: 0,
                    scale: 0.8,
                    duration: 150,
                    ease: 'Power1',
                    onComplete: () => {
                        if (!isDestroyed) {
                            currentNumber--;
                            if (currentNumber > 0) {
                                countdownText.setText(currentNumber.toString());
                                countdownText.setScale(1.2);
                                
                                this.scene.tweens.add({
                                    targets: countdownText,
                                    alpha: 1,
                                    scale: 1,
                                    duration: 150,
                                    ease: 'Back.easeOut',
                                    onComplete: () => {
                                        if (!isDestroyed) {
                                            this.scene.time.delayedCall(700, () => {
                                                if (!isDestroyed) {
                                                    updateNumber();
                                                }
                                            });
                                        }
                                    }
                                });
                            } else {
                                this.showGo(countdownText, isDestroyed, callback);
                            }
                        }
                    }
                });
            }
        };
        
        this.scene.events.once('shutdown', () => {
            isDestroyed = true;
            if (this.countdownContainer) {
                this.countdownContainer.destroy();
            }
        });
        
        // Start with 3
        countdownText.setAlpha(0);
        countdownText.setScale(1.2);
        
        this.scene.tweens.add({
            targets: countdownText,
            alpha: 1,
            scale: 1,
            duration: 150,
            ease: 'Back.easeOut',
            onComplete: () => {
                if (!isDestroyed) {
                    this.scene.time.delayedCall(700, () => {
                        if (!isDestroyed) {
                            updateNumber();
                        }
                    });
                }
            }
        });
    }

    showGo(countdownText, isDestroyed, callback) {
        if (isDestroyed || !countdownText || !countdownText.scene) {
            return;
        }

        countdownText.setText('GO!');
        countdownText.setStyle({
            color: '#00FF00',
            fontSize: '144px',
            stroke: '#000000',
            strokeThickness: 4
        });
        countdownText.setScale(1.5);
        countdownText.setAlpha(0);
        
        this.scene.tweens.add({
            targets: countdownText,
            scale: 1,
            alpha: 1,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
                if (!isDestroyed) {
                    this.scene.time.delayedCall(500, () => {
                        if (!isDestroyed) {
                            this.scene.tweens.add({
                                targets: this.countdownContainer,
                                alpha: 0,
                                duration: 200,
                                onComplete: () => {
                                    this.countdownContainer.destroy();
                                    if (callback) callback();
                                }
                            });
                        }
                    });
                }
            }
        });
    }

    cleanup() {
        this.cleanupWaitingScreen();
        
        if (this.countdownContainer) {
            while(this.countdownContainer.list.length > 0) {
                const child = this.countdownContainer.list[0];
                this.countdownContainer.remove(child);
                child.destroy();
            }
            this.countdownContainer.destroy();
            this.countdownContainer = null;
        }
    }
}