class PlayerController {
    constructor(scene) {
        this.scene = scene;
        this.config = CONFIG.player; 
        // Offset cố định
        this.horizontalOffset = this.config.moveOutRange.horizontal;
        this.verticalOffset = this.config.moveOutRange.vertical;

        // Tạo canvas mới cho player
        this.canvas = document.createElement('canvas');
        this.canvas.width = CONFIG.totalWidth + (this.horizontalOffset * 2);
        this.canvas.height = CONFIG.totalHeight + (this.verticalOffset * 2);

        // Style cho canvas
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = `${-this.horizontalOffset}px`; // Dịch sang trái để lộ phần offset
        this.canvas.style.top = `${-this.verticalOffset}px`; // Dịch lên trên để lộ phần offset
        this.canvas.style.pointerEvents = 'none';

        // Thêm canvas vào player_container
        const playerContainer = document.getElementById('player_container');
        playerContainer.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');
        
        // Các thuộc tính khác
        this.position = { x: 0, y: 0 };
        this.config = CONFIG.player;
        this.keys = {
            W: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            S: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            A: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            D: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            L: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L)
        };
    }

    create(x = 200, y = 200) {
        this.spawnX = x;
        this.spawnY = y;
        this.position.x = x + this.horizontalOffset; // Điều chỉnh vị trí để tính cả offset
        this.position.y = y + this.verticalOffset;
        this.draw(); // Vẽ player lần đầu
        return this;
    }

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

    update() {
        let input = {
            up: this.keys.W.isDown,
            down: this.keys.S.isDown,   
            left: this.keys.A.isDown,   
            right: this.keys.D.isDown,
            kick: this.keys.L.isDown 
        };

        if (input.up || input.down || input.left || input.right || input.kick) {
            this.scene.SOCKET.emit('sendInput', {
                movement: input
            });
        }

        this.draw(); // Vẽ lại player mỗi frame
    }

    setPosition(x, y) {
        this.position.x = x + this.horizontalOffset;
        this.position.y = y + this.verticalOffset;
        this.draw(); 
    }

    getPosition() {
        return {
            x: this.position.x - this.horizontalOffset,
            y: this.position.y - this.verticalOffset
        };
    }

    destroy() {
        // Cleanup canvas
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }

        // Cleanup keyboard events
        if (this.keys) {
            for (let key in this.keys) {
                if (this.keys[key]) {
                    this.keys[key].removeAllListeners();
                    this.keys[key] = null;
                }
            }
        }

        // Clear context
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx = null;
        }

        // Clear other references
        this.scene = null;
        this.config = null;
        this.position = null;
    }
}