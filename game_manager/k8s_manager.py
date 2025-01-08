# game_manager/k8s_manager.py
from kubernetes import client, config
import os

class K8sGameManager:
    def __init__(self):
        self.k8s_config = {
            'api_token': os.getenv('K8S_API_TOKEN'),
            'cluster_url': os.getenv('K8S_CLUSTER_URL')
        }
        self.configure_k8s()

    def configure_k8s(self):
        configuration = client.Configuration()
        configuration.host = self.k8s_config['cluster_url']
        configuration.api_key['authorization'] = self.k8s_config['api_token']
        configuration.api_key_prefix['authorization'] = 'Bearer'
        client.Configuration.set_default(configuration)
        self.api = client.CustomObjectsApi()

    def create_game_instance(self, room_id, player_data):
        """Tạo game server instance trên K8s"""
        try:
            game_spec = {
                "apiVersion": "games.beatball/v1",
                "kind": "GameServer",
                "metadata": {
                    "name": f"game-{room_id}",
                    "namespace": "beatball-game"
                },
                "spec": {
                    "roomId": room_id,
                    "players": player_data,
                    "config": {
                        "maxPlayers": 4,
                        "gameDuration": 300,
                        "tickRate": 60
                    }
                }
            }
            
            response = self.api.create_namespaced_custom_object(
                group="games.beatball",
                version="v1",
                namespace="beatball-game",
                plural="gameservers",
                body=game_spec
            )
            
            return {
                'server_url': response['status']['address'],
                'port': response['status']['port']
            }
        except Exception as e:
            print(f"Error creating game server: {e}")
            raise

    def monitor_game(self, room_id):
        """Monitor trạng thái game"""
        try:
            status = self.api.get_namespaced_custom_object_status(
                group="games.beatball",
                version="v1",
                namespace="beatball-game",
                plural="gameservers",
                name=f"game-{room_id}"
            )
            return status
        except Exception as e:
            print(f"Error monitoring game: {e}")
            return None
        