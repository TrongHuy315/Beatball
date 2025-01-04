class MenuDisplay {
    constructor(scene) {
        this.scene = scene; 
        this.canvas = document.getElementById('menu-display');
        this.ctx = this.canvas.getContext('2d');
        
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.canvas.style.position = "absolute";
        this.canvas.style.left = "0px";
        this.canvas.style.top = "0px";
        this.canvas.style.zIndex = "20";
        this.isVisible = false; 
        this.canvas.style.display = 'none'; 

        this.setupKeyboardEvents();
        // Kích thước và vị trí của main block (Block A)
        this.mainBlock = {
            width: 600,  // Thu nhỏ lại
            height: 190,
            x: (window.innerWidth - 600) / 2,
            y: (window.innerHeight - 300) / 2,
            padding: 20
        };

        this.perfBlock = {
            width: 150,
            height: 80,
            x: this.mainBlock.x - 160, // Giảm khoảng cách
            y: this.mainBlock.y
        };

        // Graph block (Block C) - Thu nhỏ và làm đẹp
        this.graphBlock = {
            width: 150,
            height: 100,
            x: this.perfBlock.x,
            y: this.perfBlock.y + this.perfBlock.height + 10, // Giảm khoảng cách
            padding: 5,
            lineColor: '#4287f5',
            fillColor: 'rgba(66, 135, 245, 0.1)',
            gridColor: 'rgba(255, 255, 255, 0.1)'
        };

        // Icons
        this.icons = {
            settings: {
                width: 40,
                height: 40,
                x: this.mainBlock.x + this.mainBlock.width + 20,
                y: this.mainBlock.y + 10,
            },
            leave: {
                width: 40,
                height: 40,
                x: this.mainBlock.x + this.mainBlock.width + 24,
                y: this.mainBlock.y + 70
            }
        };
        this.perfMonitor = new PerfMonitor(this.scene);

        // Performance history for graph
        this.pingHistory = new Array(50).fill(0);
        
        this.setupEventListeners();
        this.render();

        this.settingIcon = new Image();
        this.settingIcon.onload = () => {
            console.log('Setting icon loaded successfully');
        };
        this.settingIcon.onerror = (error) => {
            console.error('Setting icon load error:', error);
        };
        this.settingIcon.src = 'static/images/settingIcon/icon1.png';

        // Load leave icon
        this.leaveIcon = new Image();
        this.leaveIcon.onload = () => {
            console.log('Leave icon loaded successfully');
        };
        this.leaveIcon.onerror = (error) => {
            console.error('Leave icon load error:', error);
        };
        this.leaveIcon.src = 'static/images/leaveIcon/icon1.png';
    }
    renderIcons() {
        // Vẽ background cho khu vực icons
        const iconBlockWidth = this.icons.settings.width + 20;
        const iconBlockHeight = this.icons.leave.y + this.icons.leave.height - this.icons.settings.y + 20;
        
        const gradient = this.ctx.createLinearGradient(
            this.icons.settings.x, 0,
            this.icons.settings.x + iconBlockWidth, 0
        );
        gradient.addColorStop(0, 'rgba(40, 44, 52, 0.95)');
        gradient.addColorStop(1, 'rgba(40, 44, 52, 0.85)');
    
        // Vẽ background
        this.ctx.fillStyle = gradient;
        this.roundRect(
            this.icons.settings.x - 10,
            this.icons.settings.y - 10,
            iconBlockWidth,
            iconBlockHeight,
            8
        );
    
        // Debug logging
        console.log('Drawing icons at:', {
            settings: {x: this.icons.settings.x, y: this.icons.settings.y},
            leave: {x: this.icons.leave.x, y: this.icons.leave.y}
        });
        console.log('Leave icon status:', {
            complete: this.leaveIcon.complete,
            naturalHeight: this.leaveIcon.naturalHeight,
            src: this.leaveIcon.src
        });
    
        // Settings icon
        if (this.settingIcon && this.settingIcon.complete && this.settingIcon.naturalHeight !== 0) {
            this.ctx.drawImage(
                this.settingIcon,
                this.icons.settings.x,
                this.icons.settings.y,
                this.icons.settings.width,
                this.icons.settings.height
            );
        } else {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.fillRect(
                this.icons.settings.x,
                this.icons.settings.y,
                this.icons.settings.width,
                this.icons.settings.height
            );
        }
    
        // Leave icon
        if (this.leaveIcon && this.leaveIcon.complete && this.leaveIcon.naturalHeight !== 0) {
            this.ctx.drawImage(
                this.leaveIcon,
                this.icons.leave.x,
                this.icons.leave.y,
                this.icons.leave.width,
                this.icons.leave.height
            );
        } else {
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.9)';
            this.ctx.fillRect(
                this.icons.leave.x,
                this.icons.leave.y,
                this.icons.leave.width,
                this.icons.leave.height
            );
        }
    }
    setupKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault(); // Ngăn Tab chuyển focus
                this.toggleVisibility();
            }
            // Thêm Escape để đóng menu
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }
    toggleVisibility() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    show() {
        this.isVisible = true;
        this.canvas.style.display = 'block';
        // Tùy chọn: Thêm animation khi hiện
        this.canvas.style.opacity = '0';
        requestAnimationFrame(() => {
            this.canvas.style.transition = 'opacity 0.2s ease-in-out';
            this.canvas.style.opacity = '1';
        });
    }
    hide() {
        this.isVisible = false;
        // Tùy chọn: Thêm animation khi ẩn
        this.canvas.style.opacity = '0';
        setTimeout(() => {
            this.canvas.style.display = 'none';
        }, 200); // Đợi animation kết thúc
    }
    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            
            this.mainBlock.x = (window.innerWidth - this.mainBlock.width) / 2;
            this.mainBlock.y = (window.innerHeight - this.mainBlock.height) / 2;
            
            this.perfBlock.x = this.mainBlock.x - 220;
            this.perfBlock.y = this.mainBlock.y;
            
            this.graphBlock.x = this.perfBlock.x;
            this.graphBlock.y = this.perfBlock.y + this.perfBlock.height + 20;
            
            this.icons.settings.x = this.mainBlock.x + this.mainBlock.width + 20;
            this.icons.settings.y = this.mainBlock.y;
            
            this.icons.leave.x = this.mainBlock.x + this.mainBlock.width + 20;
            this.icons.leave.y = this.mainBlock.y + 60;
            this.render();
        });
        // Thêm hover effect
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Thay đổi style cursor khi hover trên icons
            if (this.isInside(x, y, this.icons.settings) || 
                this.isInside(x, y, this.icons.leave)) {
                this.canvas.style.cursor = 'pointer';
            } else {
                this.canvas.style.cursor = 'default';
            }
        });
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (this.isInside(x, y, this.icons.settings)) {
                console.log('Settings clicked');
            }
            if (this.isInside(x, y, this.icons.leave)) {
                if (confirm('Are you sure you want to leave?')) {
                    console.log('Leaving room...');
                }
            }
        });

        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Nếu click ngoài các block chính, ẩn menu
            if (!this.isInsideAnyBlock(x, y)) {
                this.hide();
            }
        });
    }
    isInsideAnyBlock(x, y) {
        return this.isInside(x, y, this.mainBlock) ||
               this.isInside(x, y, this.perfBlock) ||
               this.isInside(x, y, this.graphBlock) ||
               this.isInside(x, y, this.icons.settings) ||
               this.isInside(x, y, this.icons.leave);
    }
    isInside(x, y, rect) {
        return x >= rect.x && 
               x <= rect.x + rect.width && 
               y >= rect.y && 
               y <= rect.y + rect.height;
    }

    renderMainBlock() {
        const scale = this.isVisible ? 1 : 0;
        
        this.ctx.save();
        this.ctx.translate(this.mainBlock.x + this.mainBlock.width/2, 
                          this.mainBlock.y + this.mainBlock.height/2);
        this.ctx.scale(scale, scale);
        this.ctx.translate(-(this.mainBlock.x + this.mainBlock.width/2), 
                          -(this.mainBlock.y + this.mainBlock.height/2));
    
        // Main block background (tối màu)
        this.ctx.fillStyle = 'rgba(30, 30, 35, 0.95)';
        this.ctx.fillRect(
            this.mainBlock.x,
            this.mainBlock.y,
            this.mainBlock.width,
            this.mainBlock.height
        );
    
        // Line chia đôi ở giữa
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.moveTo(this.mainBlock.x + this.mainBlock.width/2, this.mainBlock.y + 20);
        this.ctx.lineTo(this.mainBlock.x + this.mainBlock.width/2, this.mainBlock.y + this.mainBlock.height - 20);
        this.ctx.stroke();
    
        // Render players
        const playerHeight = 80; // Chiều cao mỗi vùng player
        const padding = 20; // Padding giữa các vùng
    
        // Team bên trái (đỏ)
        this.renderPlayer(
            this.mainBlock.x + padding,
            this.mainBlock.y + padding,
            {
                name: "DoTrongHuy",
                elo: 1500,
                stats: { goals: 3, assists: 2 }
            },
            'left',
            'red'
        );
    
        this.renderPlayer(
            this.mainBlock.x + padding,
            this.mainBlock.y + playerHeight + padding,
            {
                name: "HuyTrongDo",
                elo: 1400,
                stats: { goals: 1, assists: 3 }
            },
            'left',
            'red'
        );
    
        // Team bên phải (xanh)
        this.renderPlayer(
            this.mainBlock.x + this.mainBlock.width - padding,
            this.mainBlock.y + padding,
            {
                name: "PhamBaoThang",
                elo: 1600,
                stats: { goals: 2, assists: 1 }
            },
            'right',
            'blue'
        );
    
        this.renderPlayer(
            this.mainBlock.x + this.mainBlock.width - padding,
            this.mainBlock.y + playerHeight + padding,
            {
                name: "ThangPhamBao",
                elo: 1550,
                stats: { goals: 0, assists: 2 }
            },
            'right',
            'blue'
        );
    
        this.ctx.restore();
    }
    renderPlayer(x, y, player, align, team) {
        const width = this.mainBlock.width/2 - 40;
        const height = 60; // Giảm height
    
        // Gradient background - sửa lại vị trí cho team phải
        const gradient = this.ctx.createRadialGradient(
            align === 'left' ? x : x,  // Thay đổi vị trí gradient cho team phải
            y,
            0,
            align === 'left' ? x : x,
            y,
            width/2
        );
    
        if (team === 'red') {
            gradient.addColorStop(0, 'rgba(180, 30, 30, 0.4)');
            gradient.addColorStop(0.3, 'rgba(180, 30, 30, 0.1)');
            gradient.addColorStop(1, 'rgba(20, 20, 20, 0.8)');
        } else {
            gradient.addColorStop(0, 'rgba(30, 30, 180, 0.4)');
            gradient.addColorStop(0.3, 'rgba(30, 30, 180, 0.1)');
            gradient.addColorStop(1, 'rgba(20, 20, 20, 0.8)');
        }
    
        // Vẽ background
        this.ctx.fillStyle = gradient;
        this.roundRect(
            align === 'left' ? x : x - width,
            y,
            width,
            height,
            8
        );
    
        if (align === 'left') {
            // Team bên trái
            // Tên người chơi
            this.ctx.font = '16px Arial'; // Giảm font size
            this.ctx.fillStyle = '#ffffff';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(player.name, x + 15, y + 25);
    
            // Elo (dưới tên)
            this.ctx.font = '18px Arial'; // Giảm font size
            this.ctx.fillStyle = this.getEloColor(player.elo);
            this.ctx.fillText(player.elo.toString(), x + 15, y + 50);
    
            // Goals (bên phải, trên)
            this.ctx.fillStyle = '#ffffff';
            let goalsText = '';
            let offset_x = 130; 
            for(let i = 0; i < player.stats.goals; i++) {
                goalsText += "⚽ ";
            }
            this.ctx.fillText(goalsText.trim(), x + offset_x, y + 25); // Giảm khoảng cách
    
            // Assists (bên phải, dưới)
            let assistsText = '';
            for(let i = 0; i < player.stats.assists; i++) {
                assistsText += "👟 ";
            }
            this.ctx.fillText(assistsText.trim(), x + offset_x, y + 50); // Giảm khoảng cách
    
        } else {
            // Team bên phải
            // Tên người chơi
            this.ctx.font = '16px Arial'; // Giảm font size
            this.ctx.fillStyle = '#ffffff';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(player.name, x - 15, y + 25);
    
            // Elo (dưới tên)
            this.ctx.font = '18px Arial'; // Giảm font size
            this.ctx.fillStyle = this.getEloColor(player.elo);
            this.ctx.fillText(player.elo.toString(), x - 15, y + 50);
    
            // Goals (bên trái, trên)
            this.ctx.fillStyle = '#ffffff';
            this.ctx.textAlign = 'right'; // Thay đổi về right align
            let goalsText = '';
            for(let i = 0; i < player.stats.goals; i++) {
                goalsText += "⚽ ";
            }
            let offset_x = 140; 
            this.ctx.fillText(goalsText.trim(), x - offset_x, y + 25); // Giảm khoảng cách
    
            // Assists (bên trái, dưới)
            let assistsText = '';
            for(let i = 0; i < player.stats.assists; i++) {
                assistsText += "👟 ";
            }
            this.ctx.fillText(assistsText.trim(), x - offset_x, y + 50); // Giảm khoảng cách
        }
    }
    
    // Helper function để vẽ rectangle với border radius
    roundRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    // Helper function để lấy màu cho ELO
    getEloColor(elo) {
        if (elo >= 2000) return '#ff5e00'; // Cam cho Masters
        if (elo >= 1800) return '#ff00ff'; // Hồng cho Diamond
        if (elo >= 1600) return '#00ffff'; // Cyan cho Platinum
        if (elo >= 1400) return '#ffff00'; // Vàng cho Gold
        if (elo >= 1200) return '#c0c0c0'; // Bạc cho Silver
        return '#cd7f32'; // Đồng cho Bronze
    }
    renderPerfBlock() {
        // Background với gradient
        const gradient = this.ctx.createLinearGradient(
            this.perfBlock.x, 0,
            this.perfBlock.x + this.perfBlock.width, 0
        );
        gradient.addColorStop(0, 'rgba(40, 44, 52, 0.95)');
        gradient.addColorStop(1, 'rgba(40, 44, 52, 0.85)');
    
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(
            this.perfBlock.x,
            this.perfBlock.y,
            this.perfBlock.width,
            this.perfBlock.height
        );
    
        // Lấy dữ liệu từ perfMonitor
        const networkState = this.perfMonitor.getCurrentNetworkState();
        const fps = Math.round(this.scene.game.loop.actualFps);
    
        // Hàm helper để xác định màu cho giá trị
        const getPingColor = (ping) => {
            if (ping > 150) return '#ff4444';
            if (ping > 80) return '#ffaa00';
            return '#44ff44';
        };
    
        const getFPSColor = (fps) => {
            if (fps < 30) return '#ff4444';
            if (fps < 50) return '#ffaa00';
            return '#44ff44';
        };
    
        const getJitterColor = (jitter) => {
            if (jitter > 50) return '#ff4444';
            if (jitter > 30) return '#ffaa00';
            return '#44ff44';
        };
    
        // Thiết lập font chung
        this.ctx.font = '14px Consolas, monospace';
        this.ctx.textAlign = 'left';
    
        // Màu cho labels
        const labelColors = {
            ping: '#4287f5',    // Xanh dương
            fps: '#f542f5',     // Tím hồng
            jitter: '#f5d442'   // Vàng
        };
    
        // Render Ping
        this.ctx.fillStyle = labelColors.ping;
        this.ctx.fillText(`Ping:`, this.perfBlock.x + 10, this.perfBlock.y + 25);
        this.ctx.fillStyle = getPingColor(networkState.latency);
        this.ctx.fillText(`${networkState.latency}ms`, this.perfBlock.x + 70, this.perfBlock.y + 25);
    
        // Render FPS
        this.ctx.fillStyle = labelColors.fps;
        this.ctx.fillText(`FPS:`, this.perfBlock.x + 10, this.perfBlock.y + 45);
        this.ctx.fillStyle = getFPSColor(fps);
        this.ctx.fillText(`${fps}`, this.perfBlock.x + 70, this.perfBlock.y + 45);
    
        // Render Jitter
        this.ctx.fillStyle = labelColors.jitter;
        this.ctx.fillText(`Jitter:`, this.perfBlock.x + 10, this.perfBlock.y + 65);
        this.ctx.fillStyle = getJitterColor(networkState.jitter);
        this.ctx.fillText(`${networkState.jitter}ms`, this.perfBlock.x + 70, this.perfBlock.y + 65);
    }


    renderGraphBlock() {
        // Background
        const gradient = this.ctx.createLinearGradient(
            this.graphBlock.x, 0,
            this.graphBlock.x + this.graphBlock.width, 0
        );
        gradient.addColorStop(0, 'rgba(40, 44, 52, 0.95)');
        gradient.addColorStop(1, 'rgba(40, 44, 52, 0.85)');

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(
            this.graphBlock.x,
            this.graphBlock.y,
            this.graphBlock.width,
            this.graphBlock.height
        );

        // Sử dụng pingHistory từ perfMonitor
        const pingHistory = this.perfMonitor.pingHistory;
        if (!pingHistory || pingHistory.length === 0) return;

        const graphHeight = this.graphBlock.height - this.graphBlock.padding * 2;
        const pointWidth = (this.graphBlock.width - this.graphBlock.padding * 2) / (pingHistory.length - 1);

        // Tạo mảng points
        const points = pingHistory.map((ping, i) => ({
            x: this.graphBlock.x + this.graphBlock.padding + (i * pointWidth),
            y: this.graphBlock.y + graphHeight - (ping / 100 * graphHeight)
        }));

        // Vẽ đường cong mượt
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.graphBlock.lineColor;
        this.ctx.lineWidth = 1.5;

        this.ctx.moveTo(points[0].x, points[0].y);

        for (let i = 0; i < points.length - 1; i++) {
            const curr = points[i];
            const next = points[i + 1];
            
            const cp1 = {
                x: curr.x + (next.x - curr.x) / 3,
                y: curr.y
            };
            
            const cp2 = {
                x: curr.x + (next.x - curr.x) * 2/3,
                y: next.y
            };

            this.ctx.bezierCurveTo(
                cp1.x, cp1.y,
                cp2.x, cp2.y,
                next.x, next.y
            );
        }

        // Fill area
        const lastPoint = points[points.length - 1];
        this.ctx.lineTo(lastPoint.x, this.graphBlock.y + graphHeight);
        this.ctx.lineTo(points[0].x, this.graphBlock.y + graphHeight);

        const fillGradient = this.ctx.createLinearGradient(
            0,
            this.graphBlock.y,
            0,
            this.graphBlock.y + this.graphBlock.height
        );
        fillGradient.addColorStop(0, 'rgba(66, 135, 245, 0.2)');
        fillGradient.addColorStop(1, 'rgba(66, 135, 245, 0)');

        this.ctx.fillStyle = fillGradient;
        this.ctx.fill();
        this.ctx.stroke();
    }


    render() {
        if (!this.isVisible) return; 
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Add semi-transparent background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.renderMainBlock();
        this.renderPerfBlock();
        this.renderGraphBlock();
        this.renderIcons();
    }

    update() {
        if (this.isVisible) {
            this.render();
        }
        if (this.perfMonitor) {
            this.perfMonitor.updateFPS();
        }
    }
    destroy() {
        if (this.perfMonitor) {
            this.perfMonitor.destroy();
        }
        super.destroy();
    }
}

// Create instance
const menuDisplay = new MenuDisplay();

// Update loop
function updateMenuDisplay() {
    menuDisplay.update();
    requestAnimationFrame(updateMenuDisplay);
}
updateMenuDisplay();