export class networkManager {
    constructor() {
        this.serverTimeOffset = 0;
        this.roundTripTime = 0;
        this.syncSamples = [];
        this.syncInProgress = false;
        this.lastSyncTime = 0;
        this.syncInterval = 5000;
        this.isTabActive = true;
        this.syncTimeoutId = null;
        this.syncStartedWhileActive = false;
    }

    initialize(scene) {
        this.scene = scene;
        this.socket = scene.SOCKET;
        this.serverTimeOffset = 0;
        this.roundTripTime = 0;
        this.syncSamples = [];
        this.syncInProgress = false;
        this.lastSyncTime = 0;
        this.syncInterval = 5000;
        this.isTabActive = !document.hidden;
        this.syncStartedWhileActive = false;

        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        this.startTimeSync();
    }

    handleVisibilityChange() {
        const wasTabActive = this.isTabActive;
        this.isTabActive = !document.hidden;
        
        if (!wasTabActive && this.isTabActive) {
            this.sendSyncPacket();
            this.scheduleSyncPacket();
        } else if (!this.isTabActive) {
            if (this.syncTimeoutId) {
                cancelAnimationFrame(this.syncTimeoutId);
                this.syncTimeoutId = null;
            }
        }
    }

    startTimeSync() {
        this.socket.on('timeSyncResponse', (serverTimestamp) => {
            const clientReceiveTime = Date.now();  // Use system time directly
            const sample = this.processSyncResponse(
                serverTimestamp,
                clientReceiveTime
            );
            
            this.syncSamples.push(sample);
            
            if (this.syncSamples.length > 10) {
                this.syncSamples.shift();
            }
            
            this.calculateTimeOffset();
        });

        this.scheduleSyncPacket();
    }

    scheduleSyncPacket() {
        const scheduleNext = () => {
            if (this.isTabActive) {
                const now = Date.now();  // Use system time directly
                if (now - this.lastSyncTime >= this.syncInterval) {
                    this.sendSyncPacket();
                    this.lastSyncTime = now;
                }
                this.syncTimeoutId = requestAnimationFrame(scheduleNext);
            }
        };
        
        this.syncTimeoutId = requestAnimationFrame(scheduleNext);
    }

    sendSyncPacket() {
        if (this.syncInProgress) return;
        
        this.syncInProgress = true;
        this.syncStartedWhileActive = this.isTabActive;
        const clientSendTime = Date.now();  // Use system time directly
        
        this.socket.emit('timeSync', {
            clientSendTime: clientSendTime
        });
    }

    processSyncResponse(serverTimestamp, clientReceiveTime) {
        this.syncInProgress = false;
        
        const isValidSample = this.syncStartedWhileActive && this.isTabActive;
        
        const rtt = clientReceiveTime - serverTimestamp.clientSendTime;
        const offset = serverTimestamp.serverTime - (clientReceiveTime - rtt/2);
        
        return {
            roundTripTime: rtt,
            offset: offset,
            isValid: isValidSample
        };
    }

    calculateTimeOffset() {
        const validSamples = this.syncSamples.filter(sample => sample.isValid);
        const sortedSamples = [...validSamples].sort((a, b) => 
            a.roundTripTime - b.roundTripTime
        );
        
        if (sortedSamples.length === 0) {
            console.warn('No valid time sync samples available');
            return;
        }
        
        const medianSample = sortedSamples[Math.floor(sortedSamples.length / 2)];
        
        this.serverTimeOffset = medianSample.offset;
        this.roundTripTime = medianSample.roundTripTime;

        console.log('Time sync updated:', {
            offset: this.serverTimeOffset,
            rtt: this.roundTripTime,
            validSamples: sortedSamples.length
        });
    }

    getServerTime() {
        return Date.now() + this.serverTimeOffset;  // Use system time directly
    }

    getNetworkLatency() {
        return this.roundTripTime / 2;
    }
}