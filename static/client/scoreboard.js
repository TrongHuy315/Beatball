
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
        this.draw(); 
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