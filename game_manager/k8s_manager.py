# game_manager/k8s_manager.py
from kubernetes import client, config
from google.oauth2 import service_account
from google.cloud import container_v1
import os
import json

class K8sGameManager:
    def __init__(self):
        self.namespace = "beatball-game"
        self.cluster_name = os.getenv('GKE_CLUSTER_NAME')
        self.cluster_zone = os.getenv('GKE_CLUSTER_ZONE')
        self.credentials_json = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
        self.configure_k8s()

    def configure_k8s(self):
        try:
            # Parse credentials JSON string
            credentials_dict = json.loads(self.credentials_json)
            
            # Create credentials object
            credentials = service_account.Credentials.from_service_account_info(
                credentials_dict,
                scopes=['https://www.googleapis.com/auth/cloud-platform']
            )

            # Create request object
            request = transport.requests.Request()
            
            # Refresh credentials
            credentials.refresh(request)
            
            # Get GKE cluster info
            container_client = container_v1.ClusterManagerClient(credentials=credentials)
            cluster_path = f"projects/{credentials_dict['project_id']}/locations/{self.cluster_zone}/clusters/{self.cluster_name}"
            cluster = container_client.get_cluster(name=cluster_path)

            # Configure kubernetes client
            configuration = client.Configuration()
            configuration.host = f"https://{cluster.endpoint}"
            configuration.verify_ssl = False
            
            # Use refreshed token
            if not credentials.valid:
                credentials.refresh(request)
            configuration.api_key = {"authorization": f"Bearer {credentials.token}"}

            client.Configuration.set_default(configuration)

            # Initialize clients
            self.apps_v1 = client.AppsV1Api()
            self.core_v1 = client.CoreV1Api()
            
            print("Successfully configured K8s client")

        except Exception as e:
            print(f"Error configuring K8s client: {e}")
            raise

    def create_game_instance(self, room_id, player_data):
        try:
            server_name = f"game-{room_id}"
            
            print(f"Creating game server deployment: {server_name}")
            
            # Create deployment
            deployment = self.apps_v1.create_namespaced_deployment(
                namespace=self.namespace,
                body=self._create_deployment_spec(server_name, room_id, player_data)
            )
            print(f"Deployment created: {deployment.metadata.name}")

            # Create service
            service = self.core_v1.create_namespaced_service(
                namespace=self.namespace,
                body=self._create_service_spec(server_name)
            )
            print(f"Service created: {service.metadata.name}")

            # Wait for external IP
            external_ip = self._wait_for_external_ip(f"{server_name}-service")
            print(f"Got external IP: {external_ip}")

            return {
                'server_url': external_ip,
                'port': 8000,
                'deployment_name': server_name,
                'service_name': f"{server_name}-service"
            }

        except Exception as e:
            print(f"Error creating game server: {e}")
            self.cleanup_game_resources(server_name)
            raise

    def _create_deployment_spec(self, name, room_id, player_data):
        return {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {
                "name": name,
                "namespace": self.namespace
            },
            "spec": {
                "replicas": 1,
                "selector": {
                    "matchLabels": {
                        "app": name
                    }
                },
                "template": {
                    "metadata": {
                        "labels": {
                            "app": name
                        }
                    },
                    "spec": {
                        "containers": [{
                            "name": "game-server",
                            "image": "gcr.io/[PROJECT_ID]/beatball-game:latest", # Thay PROJECT_ID
                            "imagePullPolicy": "Always",
                            "ports": [{
                                "containerPort": 8000
                            }],
                            "env": [{
                                "name": "ROOM_ID",
                                "value": str(room_id)
                            }, {
                                "name": "PLAYER_DATA",
                                "value": json.dumps(player_data)
                            }, {
                                "name": "REDIS_URL",
                                "value": os.getenv('REDIS_URL')
                            }]
                        }]
                    }
                }
            }
        }

    def _create_service_spec(self, name):
        return {
            "apiVersion": "v1",
            "kind": "Service", 
            "metadata": {
                "name": f"{name}-service",
                "namespace": self.namespace
            },
            "spec": {
                "selector": {
                    "app": name
                },
                "ports": [{
                    "protocol": "TCP",
                    "port": 8000,
                    "targetPort": 8000
                }],
                "type": "LoadBalancer"
            }
        }

    def _wait_for_external_ip(self, service_name, timeout=60):
        import time
        start_time = time.time()
        
        while True:
            service = self.core_v1.read_namespaced_service(
                name=service_name,
                namespace=self.namespace
            )
            
            if service.status.load_balancer.ingress:
                return service.status.load_balancer.ingress[0].ip
                
            if time.time() - start_time > timeout:
                raise Exception("Timeout waiting for external IP")
                
            time.sleep(2)

    def cleanup_game_resources(self, server_name):
        try:
            print(f"Cleaning up resources for {server_name}")
            
            # Delete deployment
            self.apps_v1.delete_namespaced_deployment(
                name=server_name,
                namespace=self.namespace
            )
            print("Deployment deleted")
            
            # Delete service 
            self.core_v1.delete_namespaced_service(
                name=f"{server_name}-service",
                namespace=self.namespace
            )
            print("Service deleted")
            
        except Exception as e:
            print(f"Error cleaning up resources: {e}")

    def monitor_game(self, room_id):
        try:
            server_name = f"game-{room_id}"
            deployment = self.apps_v1.read_namespaced_deployment_status(
                name=server_name,
                namespace=self.namespace
            )
            return deployment.status.to_dict()
        except Exception as e:
            print(f"Error monitoring game: {e}")
            return None
        