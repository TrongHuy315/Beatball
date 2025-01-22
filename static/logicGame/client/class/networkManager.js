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
        this.lastKnownTime = Date.now();
        this.lastRealTime = Date.now();
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
        this.lastKnownTime = Date.now();
        this.lastRealTime = Date.now();
        this.syncStartedWhileActive = false;
 
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        this.startTimeSync();
        this.startTimeTracking();
    }
 
    startTimeTracking() {
        const updateTime = () => {
            const currentRealTime = Date.now();
            const timePassed = currentRealTime - this.lastRealTime;
            this.lastKnownTime += timePassed;
            this.lastRealTime = currentRealTime;
            
            requestAnimationFrame(updateTime);
        };
        
        requestAnimationFrame(updateTime);
    }
 
    handleVisibilityChange() {
        const wasTabActive = this.isTabActive;
        this.isTabActive = !document.hidden;
        
        if (!wasTabActive && this.isTabActive) {
            // Tab became active - force immediate sync
            this.sendSyncPacket();
            this.scheduleSyncPacket();
        } else if (!this.isTabActive) {
            // Tab became inactive - clear scheduled sync
            if (this.syncTimeoutId) {
                cancelAnimationFrame(this.syncTimeoutId);
                this.syncTimeoutId = null;
            }
        }
    }
 
    startTimeSync() {
        // Set up sync packet handler
        this.socket.on('timeSyncResponse', (serverTimestamp) => {
            const clientReceiveTime = this.getPreciseTime();
            const sample = this.processSyncResponse(
                serverTimestamp,
                clientReceiveTime
            );
            
            this.syncSamples.push(sample);
            
            // Keep last 10 samples
            if (this.syncSamples.length > 10) {
                this.syncSamples.shift();
            }
            
            // Calculate new offset using median of samples
            this.calculateTimeOffset();
        });
 
        // Schedule initial sync
        this.scheduleSyncPacket();
    }
 
    scheduleSyncPacket() {
        const scheduleNext = () => {
            if (this.isTabActive) {
                const now = this.getPreciseTime();
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
        this.syncStartedWhileActive = this.isTabActive; // Record tab state when sync starts
        const clientSendTime = this.getPreciseTime();
        
        this.socket.emit('timeSync', {
            clientSendTime: clientSendTime
        });
    }
 
    processSyncResponse(serverTimestamp, clientReceiveTime) {
        this.syncInProgress = false;
        
        // Sample is valid only if tab was active during entire sync process
        const isValidSample = this.syncStartedWhileActive && this.isTabActive;
        
        // Calculate round trip time and offset
        const rtt = clientReceiveTime - serverTimestamp.clientSendTime;
        const offset = serverTimestamp.serverTime - (clientReceiveTime - rtt/2);
        
        return {
            roundTripTime: rtt,
            offset: offset,
            isValid: isValidSample
        };
    }
 
    calculateTimeOffset() {
        // Only use samples that were taken while tab was active
        const validSamples = this.syncSamples.filter(sample => sample.isValid);
        const sortedSamples = [...validSamples].sort((a, b) => 
            a.roundTripTime - b.roundTripTime
        );
        
        if (sortedSamples.length === 0) {
            console.warn('No valid time sync samples available');
            return;
        }
        
        // Use median sample for more stability
        const medianSample = sortedSamples[Math.floor(sortedSamples.length / 2)];
        
        this.serverTimeOffset = medianSample.offset;
        this.roundTripTime = medianSample.roundTripTime;
 
        console.log('Time sync updated:', {
            offset: this.serverTimeOffset,
            rtt: this.roundTripTime,
            validSamples: sortedSamples.length
        });
    }
 
    getPreciseTime() {
        return this.lastKnownTime;
    }
 
    getServerTime() {
        return this.getPreciseTime() + this.serverTimeOffset;
    }
 
    getNetworkLatency() {
        return this.roundTripTime / 2;
    }
 }