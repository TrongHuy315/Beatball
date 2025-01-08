from app import redis_client

# game_manager/server_monitor.py
class GameServerMonitor:
    def __init__(self, k8s_manager):
        self.k8s_manager = k8s_manager
        
    def monitor_game(self, room_id):
        """Monitor game server status"""
        status = self.k8s_manager.monitor_game(room_id)
        if status.get('phase') == 'Completed':
            self.cleanup_game(room_id)
            
    def cleanup_game(self, room_id):
        """Cleanup game resources"""
        try:
            # Delete K8s resources
            self.k8s_manager.delete_game_instance(room_id)
            
            # Cleanup Redis
            redis_client.delete(f"game:{room_id}")
            
            print(f"Cleaned up game {room_id}")
        except Exception as e:
            print(f"Error cleaning up game {room_id}: {e}")