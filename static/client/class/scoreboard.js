
class Scoreboard {
    constructor() {
        this.config = CONFIG.scoreboard;
        this.scores = {
            left: 0,
            right: 0
        };

        this.canvas = document.createElement('canvas');
        this.scoreWidth = this.config.width || 50;
        this.scoreHeight = this.config.height || 45;
        this.gapBetweenScores = this.config.distance || 10; 
        this.canvas.width = (this.scoreWidth * 2 + this.gapBetweenScores) + 15 * 2; 
        this.canvas.height = CONFIG.offset_horizontal;
        this.canvas.style.position = 'absolute';
        
        const stadiumCanvas = document.getElementById("stadium_canvas");
        const stadiumRect = stadiumCanvas.getBoundingClientRect();
        
        const leftPosition = stadiumRect.left + (CONFIG.totalWidth / 2) - (this.canvas.width / 2);
        this.canvas.style.left = `${leftPosition}px`;
        this.canvas.style.top = `${stadiumRect.top}px`;
        this.canvas.style.zIndex = '100';

        document.body.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d'); 

        this.gameTime = 30000; // 5 minutes in miliseconds
        this.startTime = null; // Thời điểm bắt đầu tuyệt đối
        this.currentTime = this.gameTime;
        this.isCountingDown = false;

        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        document.addEventListener('visibilitychange', this.handleVisibilityChange);

        this.warningTime = 9000; // 9 seconds in milliseconds
        this.isWarning = false;
        this.warningAlpha = 1;
        this.warningDirection = -1; // -1: fade out, 1: fade in

        window.addEventListener('storage', this.handleStorageChange.bind(this));
        
        // Kiểm tra xem có startTime trong localStorage không
        const savedStartTime = localStorage.getItem('gameStartTime');
        // if (savedStartTime) {
        //     this.startTime = parseInt(savedStartTime);
        //     this.startCountDown(Date.now() - this.startTime);
        // }
        this.onWarningTime = null;  // Thêm dòng này
        this.onTimeUp = null;  
        this.draw();
    }
    setWarningTimeCallback(callback) {
        this.onWarningTime = callback;
    }   
    setTimeUpCallback(callback) {
        this.onTimeUp = callback;
    }
    startCountDown(elapsedTime = 0) {
        this.stopCountDown();
        
        this.startTime = Date.now() - elapsedTime;
        // Lưu startTime vào localStorage
        localStorage.setItem('gameStartTime', this.startTime.toString());
        
        this.isRunning = true;
        
        const updateClock = () => {
            if (!this.isRunning) return;

            const now = Date.now();
            const elapsed = now - this.startTime;
            this.currentTime = Math.max(0, this.gameTime - elapsed);

            if (this.currentTime <= this.warningTime && this.currentTime > this.warningTime - 100) {
                if (typeof this.onWarningTime === 'function') {
                    this.onWarningTime();
                }
            }

            this.draw();

            if (this.currentTime <= 0) {
                this.stopCountDown();
                if (typeof this.onTimeUp === 'function') {
                    this.onTimeUp();
                }
                // Khi hết giờ, reset về thời gian mới
                this.resetToNewGame();
                return;
            }

            this.animationFrameId = requestAnimationFrame(updateClock);
        };

        updateClock();
    }

    handleStorageChange(e) {
        if (e.key === 'gameStartTime' && e.newValue) {
            const newStartTime = parseInt(e.newValue);
            if (newStartTime !== this.startTime) {
                this.startTime = newStartTime;
                this.startCountDown(Date.now() - this.startTime);
            }
        }
    }
    resetToNewGame() {
        this.startTime = Date.now();
        localStorage.setItem('gameStartTime', this.startTime.toString());
        this.currentTime = this.gameTime;
        this.startCountDown();
    }


    handleVisibilityChange() {
        if (document.hidden) {
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
        } else {
            if (this.isRunning) {
                // Khi quay lại tab, kiểm tra startTime từ localStorage
                const savedStartTime = localStorage.getItem('gameStartTime');
                if (savedStartTime) {
                    const startTime = parseInt(savedStartTime);
                    const elapsed = Date.now() - startTime;
                    const remainingMs = Math.max(0, this.gameTime - elapsed);

                    if (remainingMs > 0) {
                        this.startTime = startTime;
                        this.startCountDown(elapsed);
                    } else {
                        this.resetToNewGame();
                    }
                }
            }
        }
    }

    getRemainingTime() {
        return this.remainingTime;
    }
    stopCountDown() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    formatTime(seconds) {
        // Đổi từ milliseconds sang seconds nếu cần
        if (seconds > 1000) {
            seconds = Math.floor(seconds / 1000);
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }

    drawClock() {
        const cfg = this.config.clock;
        const x = this.canvas.width / 2 - cfg.width / 2;
        const y = cfg.yOffset - 15;

        this.ctx.save();
        
        // Hiệu ứng warning khi còn 9 giây
        if (this.currentTime <= this.warningTime) {
            // Tính toán alpha cho hiệu ứng fade
            this.warningAlpha += this.warningDirection * 0.05;
            if (this.warningAlpha <= 0.3) {
                this.warningDirection = 1;
                this.warningAlpha = 0.3;
            } else if (this.warningAlpha >= 1) {
                this.warningDirection = -1;
                this.warningAlpha = 1;
            }

            // Vẽ glow effect
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = 'rgba(255, 0, 0, ' + this.warningAlpha + ')';
            
            // Thay đổi màu background thành đỏ nhạt
            this.ctx.fillStyle = `rgba(255, 0, 0, ${this.warningAlpha * 0.3})`;
        } else {
            this.ctx.fillStyle = cfg.backgroundColor;
        }

        this.ctx.strokeStyle = cfg.borderColor;
        this.ctx.lineWidth = cfg.borderWidth;
        
        this.roundRect(
            x, y,
            cfg.width, cfg.height,
            cfg.borderRadius
        );

        // Draw time text với hiệu ứng
        if (this.currentTime <= this.warningTime) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.warningAlpha})`;
            // Thêm hiệu ứng rung nhẹ
            const shakeAmount = 1;
            const offsetX = Math.random() * shakeAmount - shakeAmount/2;
            const offsetY = Math.random() * shakeAmount - shakeAmount/2;
            this.ctx.font = `bold ${cfg.fontSize}px Arial`; // Làm đậm text
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(
                this.formatTime(this.currentTime),
                x + cfg.width / 2 + offsetX,
                y + cfg.height / 2 + offsetY
            );
        } else {
            this.ctx.fillStyle = cfg.textColor;
            this.ctx.font = `${cfg.fontWeight} ${cfg.fontSize}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(
                this.formatTime(this.currentTime),
                x + cfg.width / 2,
                y + cfg.height / 2
            );
        }
        
        this.ctx.restore();
    }
    resetClock() {
        this.currentTime = this.gameTime;
        this.draw();
    }

    setTime(seconds) {
        this.currentTime = seconds;
        this.draw();
    }

    getCurrentTime() {
        return this.currentTime;
    }

    setScoreBoxSize(width, height) {
        this.scoreWidth = width;
        this.scoreHeight = height;
        this.draw(); // Vẽ lại sau khi thay đổi kích thước
    }

    setGapBetweenScores(gap) {
        this.gapBetweenScores = gap;
        this.draw(); // Vẽ lại sau khi thay đổi khoảng cách
    }
    getLeftScoreX() {
        return this.canvas.width / 2 - this.scoreWidth - 
               this.gapBetweenScores / 2;
    }

    getRightScoreX() {
        return this.canvas.width / 2 + this.gapBetweenScores / 2;
    }
    drawScore(score, x, y, isAnimating = false) {
        const cfg = this.config;
        
        this.ctx.save();
        if (isAnimating) {
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = cfg.animation.flashColor;
        }
        
        this.ctx.fillStyle = cfg.backgroundColor;
        this.ctx.strokeStyle = cfg.borderColor;
        this.ctx.lineWidth = cfg.borderWidth;
        
        this.roundRect(
            x, y, 
            cfg.width, cfg.height, 
            cfg.borderRadius
        );
        
        this.ctx.fillStyle = cfg.textColor;
        this.ctx.font = `${cfg.fontWeight} ${cfg.fontSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            score.toString(),
            x + cfg.width / 2,
            y + cfg.height / 2 
        );
        
        this.ctx.restore();
    }

    drawSeparator(x, y) {
        const cfg = this.config.separator;
        this.ctx.fillStyle = cfg.color;
        
        for (let i = 0; i < 2; i++) {
            this.ctx.beginPath();
            this.ctx.arc(
                x,
                y + i * (cfg.height + cfg.spacing),
                cfg.width / 2,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        }
    }

    roundRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.arcTo(x + width, y, x + width, y + height, radius);
        this.ctx.arcTo(x + width, y + height, x, y + height, radius);
        this.ctx.arcTo(x, y + height, x, y, radius);
        this.ctx.arcTo(x, y, x + width, y, radius);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
    }


    async animateScore(side) {
        if (this.isAnimating) return;
        this.isAnimating = true;
        
        const startTime = Date.now();
        const cfg = this.config.animation;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / cfg.duration, 1);
            
            this.draw(side === 'left' ? true : false, side === 'right' ? true : false);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isAnimating = false;
            }
        };
        
        animate();
    }

    updateScore(side, value) {
        this.scores[side] = value;
        this.animateScore(side);
        this.draw(); 
    }
    draw(animateLeft = false, animateRight = false) {
        // Clear canvas trước khi vẽ
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const y = this.config.yOffset;
        
        this.drawScore(
            this.scores.left,
            this.getLeftScoreX(),
            y,
            animateLeft
        );
        
        // this.drawSeparator(
        //     this.canvas.width / 2,
        //     y + this.config.height / 2 - this.config.separator.height / 2
        // );
        
        this.drawScore(
            this.scores.right,
            this.getRightScoreX(),
            y,
            animateRight
        );
        this.drawClock(); 
    }

    destroy() {
        this.stopCountDown();
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('storage', this.handleStorageChange);
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
    setOnTimeUp(callback) {
        this.onTimeUp = callback;
    }
}