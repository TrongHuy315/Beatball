class PerfMonitor {
    constructor(scene) {
        this.scene = scene;
        this.initializeVariables();
        // Đợi một chút để đảm bảo scene đã load xong
        setTimeout(() => {
            this.initializeSocketListeners();
        }, 100);
    }
    initializeSocketListeners() {
        if (!this.scene || !this.scene.SOCKET) {
            console.log("Waiting for socket initialization...");
            // setTimeout(() => {
            //     this.initializeSocketListeners();
            // }, 100);
            return;
        }

        // Set up ping monitoring only when socket is available
        this.setupSocketListeners();
        this.startMonitoring(); // Sửa từ startPingMonitoring thành startMonitoring
    }

    initializeVariables() {
        // Ping tracking
        this.lastPingTime = 0;
        this.currentPing = 0;
        this.pingHistory = new Array(10).fill(0);
        this.maxPingHistory = 10;
        
        // Network state
        this.networkState = {
            latency: 0,
            jitter: 0
        };
        
        // FPS tracking
        this.fpsHistory = new Array(60).fill(60);
        this.maxFpsHistory = 60;
        this.lastFpsUpdate = 0;
        this.fpsUpdateInterval = 500;
    }

    // createDisplayElements() {
    //     // Main container
    //     this.container = document.createElement('div');
    //     this.container.style.cssText = `
    //         position: absolute;
    //         top: 10px;
    //         left: 4px;
    //         background-color: rgba(0, 0, 0, 0.7);
    //         padding: 8px 12px;
    //         border-radius: 5px;
    //         font-family: 'Consolas', monospace;
    //         font-size: 14px;
    //         z-index: 1000;
    //         display: flex;
    //         flex-direction: column;
    //         gap: 5px;
    //         color: white;
    //         min-width: 120px;
    //     `;

    //     this.pingElement = this.createMetricElement();
    //     this.fpsElement = this.createMetricElement();
    //     this.jitterElement = this.createMetricElement();

    //     this.container.appendChild(this.jitterElement);
    //     this.container.appendChild(this.pingElement);
    //     this.container.appendChild(this.fpsElement);

    //     document.body.appendChild(this.container);
    // }

    // createMetricElement() {
    //     const element = document.createElement('div');
    //     element.style.cssText = `
    //         color: #ffffff;
    //         font-weight: 400;
    //         text-align: right;
    //         font-family: 'Consolas', monospace;
    //     `;
    //     return element;
    // }

    setupSocketListeners() {
        this.scene.SOCKET.on('pong', () => {
            const ping = Date.now() - this.lastPingTime;
            this.updatePing(ping);
        });
    }

    startMonitoring() {
        // Start ping monitoring
        this.pingInterval = setInterval(() => {
            if (this.scene.SOCKET) {
                this.lastPingTime = Date.now();
                this.scene.SOCKET.emit('ping');
            }
        }, 2000);

        // Start FPS monitoring
        this.fpsInterval = setInterval(() => {
            this.updateFPS();
        }, this.fpsUpdateInterval);

        // Initial FPS update
        this.updateFPS();
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
        this.networkState.jitter = jitter;
    }

    updateJitter() {
        if (this.pingHistory.length < 2) return 0;
        
        let jitterSum = 0;
        for (let i = 1; i < this.pingHistory.length; i++) {
            jitterSum += Math.abs(this.pingHistory[i] - this.pingHistory[i-1]);
        }
        const avgJitter = Math.round(jitterSum / (this.pingHistory.length - 1));
        this.networkState.jitter = avgJitter;
        return avgJitter;
    }
    updateFPS() {
        if (!this.scene || !this.scene.game) return;

        const currentFps = Math.round(this.scene.game.loop.actualFps);
        this.fpsHistory.push(currentFps);
        if (this.fpsHistory.length > this.maxFpsHistory) {
            this.fpsHistory.shift();
        }
    }
    getInterpolationDelay() {
        const baseDelay = this.networkState.latency * 1.2;
        const serverTickRate = 1000/60;
        return Math.min(Math.max(baseDelay + serverTickRate, 30), 200);
    }
    getCurrentNetworkState() {
        return {
            latency: this.networkState.latency,
            jitter: this.networkState.jitter
        };
    }

    destroy() {
        clearInterval(this.pingInterval);
        clearInterval(this.fpsInterval);
        
        if (this.scene.SOCKET) {
            this.scene.SOCKET.off('pong');
        }
    }
}