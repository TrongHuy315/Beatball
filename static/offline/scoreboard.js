class Scoreboard {
    constructor() {
        this.config = CONFIG.scoreboard;
        this.scores = {
            left: 0,
            right: 0
        };

        // Tạo canvas cho scoreboard
        this.canvas = document.createElement('canvas');
        this.canvas.width = 400;  // Chiều rộng vừa đủ cho scoreboard
        this.canvas.height = 400;  // Chiều cao vừa đủ cho scoreboard

        // Style cho canvas
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = '50%';
        this.canvas.style.transform = 'translateX(-50%)';
        this.canvas.style.top = '10px';
        this.canvas.style.zIndex = '100';

        // Thêm canvas vào game container
        const container = document.getElementById('game-container');
        container.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');
        this.draw(); 
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
        this.updateScore('left', 1);
        this.updateScore('right', 2);
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

    getLeftScoreX() {
        return this.canvas.width / 2 - this.config.width - 
               this.config.gapBetweenScores / 2;
    }

    getRightScoreX() {
        return this.canvas.width / 2 + this.config.gapBetweenScores / 2;
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
        
        this.drawSeparator(
            this.canvas.width / 2,
            y + this.config.height / 2 - this.config.separator.height / 2
        );
        
        this.drawScore(
            this.scores.right,
            this.getRightScoreX(),
            y,
            animateRight
        );
    }

    destroy() {
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}