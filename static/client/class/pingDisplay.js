class PerfMonitor {
    constructor(scene) {
        this.scene = scene;
        this.lastPingTime = 0;
        this.currentPing = 0;
        this.pingHistory = [];
        this.maxPingHistory = 10;
        this.networkState = {
            latency: 0,
            jitter: 0
        };
        // FPS tracking
        this.fpsHistory = [];
        this.maxFpsHistory = 60;
        this.lastFpsUpdate = 0;
        this.fpsUpdateInterval = 500;

        // Tạo div container cho performance stats
        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: absolute;
            top: 10px;
            left: 4px;
            background-color: rgba(0, 0, 0, 0.7);
            padding: 8px 12px;
            border-radius: 5px;
            font-family: Arial;
            font-size: 14px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 5px;
            color: white;
        `;

        // Tạo các elements cho ping và fps với style riêng
        this.pingElement = document.createElement('div');
        this.pingElement.style.cssText = `
            color: #333;
            font-weight: '100'
        `;

        this.fpsElement = document.createElement('div');
        this.fpsElement.style.cssText = `
            color: #333;
            font-weight: '100'
        `;
        this.jitterElement = document.createElement('div');
        this.jitterElement.style.cssText = `
            color: #333;
            font-weight: '100'
        `;
        this.container.appendChild(this.jitterElement);
        this.container.appendChild(this.pingElement);
        this.container.appendChild(this.fpsElement);

        // Thêm vào document
        document.body.appendChild(this.container);
        
        // Set up socket listener for ping
        this.scene.SOCKET.on('pong', () => {
            const ping = Date.now() - this.lastPingTime;
            this.updatePing(ping);
        });
        
        // Start ping monitoring
        this.startPingMonitoring();
        
        // Start FPS monitoring
        this.fpsInterval = setInterval(() => {
            this.updateFPS();
        }, this.fpsUpdateInterval);

        // Initial FPS update
        this.updateFPS();
    }

    startPingMonitoring() {
        this.pingInterval = setInterval(() => {
            this.lastPingTime = Date.now();
            this.scene.SOCKET.emit('ping');
        }, 2000);
    }
    getInterpolationDelay() {
        const baseDelay = this.networkState.latency * 1.2;
        const serverTickRate = 1000/60; 
        return Math.min(Math.max(baseDelay + serverTickRate, 30), 200);
    }
    updatePing(ping) {
        this.currentPing = ping;
        this.pingHistory.push(ping);
        if (this.pingHistory.length > this.maxPingHistory) {
            this.pingHistory.shift();
        }
        
        const avgPing = Math.round(
            this.pingHistory.reduce((a, b) => a + b, 0) / this.pingHistory.length
        );
        const jitter = this.updateJitter();
        this.networkState.latency = avgPing; 
        this.pingElement.textContent = `${avgPing} ms`;
        this.jitterElement.textContent = `Jitter: ${jitter}ms`;
        this.updatePingColor(avgPing);
    }
    updateJitter() {
        if (this.pingHistory.length < 2) return;
        
        let jitterSum = 0;
        for (let i = 1; i < this.pingHistory.length; i++) {
            jitterSum += Math.abs(this.pingHistory[i] - this.pingHistory[i-1]);
        }
        const avgJitter = Math.round(jitterSum / (this.pingHistory.length - 1));
        this.networkState.jitter = avgJitter;
        return avgJitter;
    }
    updatePingColor(ping) {
        let color = '#00ff00';
        if (ping > 150) color = '#ff0000';
        else if (ping > 80) color = '#ffff00';
        this.pingElement.style.color = color;
    }

    updateFPS() {
        const currentFps = Math.round(this.scene.game.loop.actualFps);
        this.fpsHistory.push(currentFps);
        if (this.fpsHistory.length > this.maxFpsHistory) {
            this.fpsHistory.shift();
        }

        const avgFps = Math.round(
            this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
        );

        this.fpsElement.textContent = `FPS: ${avgFps}`;
    }
    getCurrentNetworkState() {
        return {
            latency: this.networkState.latency,
            jitter: this.networkState.jitter
        };
    }
    destroy() {
        // Clear all intervals
        clearInterval(this.pingInterval);
        clearInterval(this.fpsInterval);
        
        // Remove socket listener
        this.scene.SOCKET.off('pong');
        
        // Remove container
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}