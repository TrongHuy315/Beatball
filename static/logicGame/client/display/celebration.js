
export class CelebrationManager {
    constructor(scene) {
        this.scene = scene;
    }

    showGoalCelebration(scoringTeam) {
        const celebrationContainer = this.scene.add.container(0, 0);

        const goalText = this.scene.add.text(
            this.scene.scale.width / 2,
            this.scene.scale.height / 3,
            'GOAL!',
            {
                fontSize: '128px',
                fontFamily: 'Arial',
                fontWeight: 'bold',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 8
            }
        ).setOrigin(0.5).setAlpha(0);

        const teamText = this.scene.add.text(
            this.scene.scale.width / 2,
            this.scene.scale.height / 2,
            `${scoringTeam.toUpperCase()} TEAM SCORES!`,
            {
                fontSize: '64px',
                fontFamily: 'Arial',
                color: scoringTeam === 'left' ? '#ff0000' : '#0000ff',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5).setAlpha(0);

        celebrationContainer.add([goalText, teamText]);

        this.scene.tweens.add({
            targets: [goalText, teamText],
            alpha: { from: 0, to: 1 },
            scale: { from: 0.5, to: 1 },
            duration: 1000,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.scene.time.delayedCall(2000, () => {
                    this.scene.tweens.add({
                        targets: [goalText, teamText],
                        alpha: 0,
                        duration: 500,
                        onComplete: () => {
                            celebrationContainer.destroy();
                        }
                    });
                });
            }
        });
    }

    letCelebrate(data) {
        const {gameConfig} = CONFIG;
        const timeElapsed = this.scene.networkManager.getServerTime() - data.timeStamp;
        const remainingCelebrationTime = Math.max(0, gameConfig.celebrationTime * 1000 - timeElapsed);    
        const goalDuration = gameConfig.goalPercent * remainingCelebrationTime;
        const cheerDuration = gameConfig.cheerPercent * remainingCelebrationTime;

        this.scene.scoreboard.updateScore(data.side, data.scores[data.side]);

        const remainingTime = Math.max(0, remainingCelebrationTime - (goalDuration + cheerDuration));
        console.log("Remaining time until countdown: ", remainingTime);

        this.showGoalText(goalDuration, () => {
            this.showCheerText(data, cheerDuration, () => {
                const remainingTime = Math.max(0, remainingCelebrationTime - (goalDuration + cheerDuration));
                console.log('Starting countdown after:', remainingTime);
                this.scene.time.delayedCall(remainingTime, () => {
                    this.showCountdown();
                });
            });
        });
    }
    showGoalText(duration, callback) {
        const container = this.scene.add.container(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2);
        
        const goalText = this.scene.add.text(0, 0, 'GOAL!', {
            fontSize: '120px',
            fontFamily: 'Arial Black',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);
        
        goalText.setBlendMode(Phaser.BlendModes.ADD);
        goalText.setPipeline('rexGlowPostFx');
        goalText.postFX.add({
            distance: 15,
            outerStrength: 4,
            innerStrength: 2,
            color: 0xffffff
        });
        
        container.add(goalText);
        
        // Sử dụng duration được truyền vào
        this.scene.tweens.add({
            targets: goalText,
            scaleX: { from: 0.1, to: 1.2 },
            scaleY: { from: 0.1, to: 1.2 },
            alpha: { from: 0, to: 1 },
            duration: duration * 0.3, // Dành 30% thời gian cho animation vào
            ease: 'Back.easeOut',
            onComplete: () => {
                // Giữ text trong 40% thời gian
                this.scene.time.delayedCall(duration * 0.4, () => {
                    // Fade out trong 30% thời gian còn lại
                    this.scene.tweens.add({
                        targets: container,
                        alpha: 0,
                        duration: duration * 0.3,
                        onComplete: () => {
                            container.destroy();
                            if (callback) callback();
                        }
                    });
                });
            }
        });
    }

    showCheerText(data, duration, callback) {
        const container = this.scene.add.container(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2);
        
        const scorerText = this.scene.add.text(0, -30, `${data.scorer} scores!`, {
            fontSize: '48px',
            fontFamily: 'Arial',
            color: '#FFFFFF',
            align: 'center'
        }).setOrigin(0.5);
        
        if (data.assister) {
            const assistText = this.scene.add.text(0, 30, `Assist: ${data.assister}`, {
                fontSize: '32px',
                fontFamily: 'Arial',
                color: '#CCCCCC',
                align: 'center'
            }).setOrigin(0.5);
            container.add(assistText);
        }
        
        container.add(scorerText);
        
        // Svử dụng duration được truyền vào
        this.scene.tweens.add({
            targets: container,
            alpha: { from: 0, to: 1 },
            duration: duration * 0.3, // Fade in trong 30% thời gian
            ease: 'Power2',
            onComplete: () => {
                // Hiển thị trong 40% thời gian
                this.scene.time.delayedCall(duration * 0.4, () => {
                    // Fade out trong 30% thời gian còn lại
                    this.scene.tweens.add({
                        targets: container,
                        alpha: 0,
                        duration: duration * 0.3,
                        onComplete: () => {
                            container.destroy();
                            if (callback) callback();
                        }
                    });
                });
            }
        });
    }

    showCountdown() {
        console.log('Showing countdown');
        const countdownDuration = CONFIG.gameConfig.resetGameCountDown;
        let timeLeft = countdownDuration;
    
        const countdownText = this.scene.add.text(CONFIG.totalWidth / 2, CONFIG.totalHeight / 2, '', {
            fontSize: '64px',
            fontFamily: 'Arial',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5).setDepth(1000);
    
        const updateCountdown = () => {
            if (timeLeft > 0) {
                countdownText.setText(timeLeft.toString());
                
                this.scene.tweens.add({
                    targets: countdownText,
                    scaleX: { from: 1.5, to: 1 },
                    scaleY: { from: 1.5, to: 1 },
                    duration: Math.min(500, 800), // Giảm duration để đảm bảo animation kết thúc trước số tiếp theo
                    ease: 'Power2'
                });
    
                timeLeft--;
                if (timeLeft > 0) {
                    setTimeout(updateCountdown, 1000);
                } else {
                    // Khi countdown kết thúc, giữ số 1 trong 500ms rồi mới fade out
                    setTimeout(() => {
                        this.scene.tweens.add({
                            targets: countdownText,
                            alpha: 0,
                            duration: 500,
                            onComplete: () => {
                                countdownText.destroy();
                            }
                        });
                    }, 500);
                }
            }
        };
    
        updateCountdown();
    }
}
