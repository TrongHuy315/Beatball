export class NetworkManager {
	constructor() {
	}
    initialize(scene) {
        this.scene = scene;
        this.socket = scene.SOCKET;
        this.serverTimeOffset = 0;
        this.roundTripTime = 0;
        this.syncSamples = [];
        this.syncInProgress = false;
        this.lastSyncTime = 0;
        this.syncInterval = 5000; // Sync every 5 seconds
        
        // Start time sync process
        this.startTimeSync();
    }
	
    startTimeSync() {
        // Set up sync packet handler
        this.socket.on('timeSyncResponse', (serverTimestamp) => {
            const clientReceiveTime = Date.now();
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

        // Periodically send sync packets
        setInterval(() => {
            this.sendSyncPacket();
        }, this.syncInterval);

        // Initial sync
        this.sendSyncPacket();
    }

    sendSyncPacket() {
        if (this.syncInProgress) return;
        
        this.syncInProgress = true;
        const clientSendTime = Date.now();
        
        this.socket.emit('timeSync', {
            clientSendTime: clientSendTime
        });
    }

    processSyncResponse(serverTimestamp, clientReceiveTime) {
        this.syncInProgress = false;
        
        // Calculate round trip time and offset
        const rtt = clientReceiveTime - serverTimestamp.clientSendTime;
        const offset = serverTimestamp.serverTime - (clientReceiveTime - rtt/2);
        
        return {
            roundTripTime: rtt,
            offset: offset
        };
    }

    calculateTimeOffset() {
        // Sort samples by round trip time
        const sortedSamples = [...this.syncSamples].sort((a, b) => 
            a.roundTripTime - b.roundTripTime
        );
        
        // Use median sample for more stability
        const medianSample = sortedSamples[Math.floor(sortedSamples.length / 2)];
        
        this.serverTimeOffset = medianSample.offset;
        this.roundTripTime = medianSample.roundTripTime;

        console.log('Time sync updated:', {
            offset: this.serverTimeOffset,
            rtt: this.roundTripTime
        });
    }

    getServerTime() {
        return Date.now() + this.serverTimeOffset;
    }

    getNetworkLatency() {
        return this.roundTripTime / 2;
    }
}