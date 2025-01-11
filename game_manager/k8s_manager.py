# game_manager/k8s_manager.py
from kubernetes import client, config
from google.oauth2 import service_account
from google.cloud import container_v1
from google.auth import transport
from kubernetes.client import CustomObjectsApi
import os
import json

class K8sGameManager:
    def __init__(self):
        self.namespace = "beatball-game"
        self.cluster_name = os.getenv('GKE_CLUSTER_NAME')
        self.cluster_zone = os.getenv('GKE_CLUSTER_ZONE')
        self.credentials_json = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
        self.project_id = "beatball-physics"
        self.main_ingress_name = "game-ingress"
        self.configure_k8s()
        self.create_namespace()

    def create_namespace(self):
        try:
            # Kiểm tra namespace đã tồn tại chưa
            try:
                existing_ns = self.core_v1.read_namespace(name=self.namespace)
                print(f"Namespace {self.namespace} already exists")
                return
            except client.exceptions.ApiException as e:
                if e.status != 404:  # Nếu lỗi khác 404 (Not Found)
                    raise

            # Tạo namespace config với labels và annotations phù hợp với GKE Autopilot
            namespace_manifest = {
                'apiVersion': 'v1',
                'kind': 'Namespace',
                'metadata': {
                    'name': self.namespace,
                    'labels': {
                        'name': self.namespace,
                        'environment': 'production',
                        'managed-by': 'beatball'
                    },
                    'annotations': {
                        'container.googleapis.com/autopilot': 'true'
                    }
                }
            }

            try:
                self.core_v1.create_namespace(body=namespace_manifest)
                print(f"Created namespace: {self.namespace}")
            except client.exceptions.ApiException as e:
                if e.status == 409:  # Conflict
                    print(f"Namespace {self.namespace} was created by another process")
                else:
                    raise

        except Exception as e:
            print(f"Error in create_namespace: {str(e)}")
            if hasattr(e, 'body'):
                print(f"Error body: {e.body}")
            if hasattr(e, 'status'):
                print(f"Error status: {e.status}")
            raise

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
            credentials.refresh(request)
            project_id = credentials_dict["project_id"] 
            
            # Lấy cluster info
            container_client = container_v1.ClusterManagerClient(credentials=credentials)
            cluster_path = f"projects/{self.project_id}/locations/{self.cluster_zone}/clusters/{self.cluster_name}"
            cluster = container_client.get_cluster(name=cluster_path)

            # Cấu hình kubernetes client
            configuration = client.Configuration()
            configuration.host = f"https://{cluster.endpoint}"
            configuration.verify_ssl = False
            configuration.api_key = {"authorization": f"Bearer {credentials.token}"}
            client.Configuration.set_default(configuration)
            
            # Use refreshed token
            if not credentials.valid:
                credentials.refresh(request)
            configuration.api_key = {"authorization": f"Bearer {credentials.token}"}

            client.Configuration.set_default(configuration)

            # Khởi tạo các API clients
            self.apps_v1 = client.AppsV1Api()
            self.core_v1 = client.CoreV1Api()
            self.networking_v1 = client.NetworkingV1Api()
            self.custom_objects_api = client.CustomObjectsApi()
            
            print("Successfully configured K8s client")

        except Exception as e:
            print(f"Error configuring K8s client: {e}")
            raise
    def _create_ingress_spec(self, name):
        return {
            "apiVersion": "networking.k8s.io/v1",
            "kind": "Ingress",
            "metadata": {
                "name": f"{name}-ingress",
                "namespace": self.namespace,
                "annotations": {
                    "kubernetes.io/ingress.class": "gce",
                    "kubernetes.io/ingress.allow-http": "false",
                    "networking.gke.io/v1beta1.FrontendConfig": "beatball-frontend-config"
                }
            },
            "spec": {
                "tls": [{
                    "hosts": ["beatball.xyz"]
                }],
                "rules": [{
                    "host": "beatball.xyz",
                    "http": {
                        "paths": [{
                            "path": f"/game/{name}",
                            "pathType": "Prefix",
                            "backend": {
                                "service": {
                                    "name": f"{name}-service",
                                    "port": {
                                        "number": 8000
                                    }
                                }
                            }
                        }]
                    }
                }]
            }
        }
        
    def _create_backend_config(self, name):
        return {
            "apiVersion": "cloud.google.com/v1",
            "kind": "BackendConfig",
            "metadata": {
                "name": f"{name}-backend-config",
                "namespace": self.namespace
            },
            "spec": {
                "timeoutSec": 900,
                "connectionDraining": {
                    "drainingTimeoutSec": 60
                }
            }
        }

    def create_game_instance(self, room_id, player_data):
        try:
            server_name = f"game-{room_id}"
            
            print(f"Creating game server deployment: {server_name}")
            
            # Tạo backend config
            backend_config = self.custom_objects_api.create_namespaced_custom_object(
                group="cloud.google.com",
                version="v1",
                namespace=self.namespace,
                plural="backendconfigs",
                body=self._create_backend_config(server_name)
            )
            print("Backend config created")

            # Tạo deployment
            deployment = self.apps_v1.create_namespaced_deployment(
                namespace=self.namespace,
                body=self._create_deployment_spec(server_name, room_id, player_data)
            )
            print(f"Deployment created: {deployment.metadata.name}")

            # Tạo service
            service = self.core_v1.create_namespaced_service(
                namespace=self.namespace,
                body=self._create_service_spec(server_name)
            )
            print(f"Service created: {service.metadata.name}")

            # Thêm path mới vào Ingress hiện có
            self._add_game_path_to_ingress(server_name)
            print(f"Added path to main ingress for {server_name}")

            # Đợi pod ready
            self._wait_for_pod_ready(server_name)

            return {
                'server_url': f"https://beatball.xyz/game/{server_name}",
                'deployment_name': server_name,
                'service_name': f"{server_name}-service"
            }

        except Exception as e:
            print(f"Error creating game server: {e}")
            self.cleanup_game_resources(server_name)
            raise
    
    def _add_game_path_to_ingress(self, server_name):
        try:
            # Lấy current ingress
            current_ingress = self.networking_v1.read_namespaced_ingress(
                name=self.main_ingress_name,
                namespace=self.namespace
            )

            # Tạo path mới
            new_path = {
                'path': f'/game/{server_name}',
                'pathType': 'Prefix',
                'backend': {
                    'service': {
                        'name': f'{server_name}-service',
                        'port': {
                            'number': 8000
                        }
                    }
                }
            }

            # Thêm path mới vào rules hiện có
            if not current_ingress.spec.rules[0].http.paths:
                current_ingress.spec.rules[0].http.paths = []
            current_ingress.spec.rules[0].http.paths.append(new_path)

            # Update ingress
            self.networking_v1.patch_namespaced_ingress(
                name=self.main_ingress_name,
                namespace=self.namespace,
                body=current_ingress
            )

        except Exception as e:
            print(f"Error adding path to ingress: {e}")
            raise
    
    def _wait_for_pod_ready(self, deployment_name, timeout=120):
        """Đợi cho đến khi pod trong deployment sẵn sàng"""
        import time
        start_time = time.time()
        while True:
            deployment = self.apps_v1.read_namespaced_deployment_status(
                name=deployment_name,
                namespace=self.namespace
            )
            if deployment.status.ready_replicas == deployment.status.replicas:
                return True
            if time.time() - start_time > timeout:
                raise Exception("Timeout waiting for pod to be ready")
            time.sleep(2)

    def _wait_for_ingress_ip(self, ingress_name, timeout=300):
        """Đợi cho đến khi ingress có IP"""
        import time
        start_time = time.time()
        while True:
            ingress = self.networking_v1.read_namespaced_ingress_status(
                name=ingress_name,
                namespace=self.namespace
            )
            if ingress.status.load_balancer.ingress:
                return ingress.status.load_balancer.ingress[0].ip
            if time.time() - start_time > timeout:
                raise Exception("Timeout waiting for ingress IP")
            time.sleep(5)

    def cleanup_namespace(self):
        try:
            self.core_v1.delete_namespace(name=self.namespace)
            print(f"Deleted namespace: {self.namespace}")
            # Đợi namespace được xóa hoàn toàn
            import time
            timeout = 30
            start_time = time.time()
            while True:
                try:
                    self.core_v1.read_namespace(name=self.namespace)
                    if time.time() - start_time > timeout:
                        raise Exception("Timeout waiting for namespace deletion")
                    time.sleep(2)
                except client.exceptions.ApiException as e:
                    if e.status == 404:
                        break
        except client.exceptions.ApiException as e:
            if e.status != 404:  # Ignore if namespace doesn't exist
                raise

    def _create_deployment_spec(self, name, room_id, player_data):
        return {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {
                "name": name,
                "namespace": self.namespace,
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
                            "image": "beatball/physics-server:latest",
                            "imagePullPolicy": "Always",
                            "ports": [{
                                "containerPort": 8000,
                                "name": "http"
                            }],
                            "readinessProbe": {
                                "httpGet": {
                                    "path": "/health",
                                    "port": 8000
                                },
                                "initialDelaySeconds": 5,
                                "periodSeconds": 10
                            },
                            "livenessProbe": {
                                "httpGet": {
                                    "path": "/health",
                                    "port": 8000
                                },
                                "initialDelaySeconds": 15,
                                "periodSeconds": 20
                            },
                            "env": [
                                {"name": "ROOM_ID", "value": str(room_id)},
                                {"name": "PLAYER_DATA", "value": json.dumps(player_data)},
                                {"name": "PORT", "value": "8000"}
                            ],
                            "resources": {
                                "requests": {
                                    "cpu": "250m",
                                    "memory": "512Mi"
                                },
                                "limits": {
                                    "cpu": "500m",
                                    "memory": "1Gi"
                                }
                            }
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
                "namespace": self.namespace,
                "annotations": {
                    "cloud.google.com/neg": '{"ingress": true}'
                }
            },
            "spec": {
                "selector": {
                    "app": name
                },
                "ports": [{
                    "port": 8000,
                    "targetPort": 8000,
                    "protocol": "TCP",
                    "name": "http"
                }],
                "type": "ClusterIP"
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

            # Xóa path khỏi ingress
            try:
                current_ingress = self.networking_v1.read_namespaced_ingress(
                    name=self.main_ingress_name,
                    namespace=self.namespace
                )
                
                # Lọc bỏ path của game này
                current_ingress.spec.rules[0].http.paths = [
                    path for path in current_ingress.spec.rules[0].http.paths
                    if not path.path.endswith(f'/{server_name}')
                ]

                # Update ingress
                self.networking_v1.patch_namespaced_ingress(
                    name=self.main_ingress_name,
                    namespace=self.namespace,
                    body=current_ingress
                )
                print("Removed path from ingress")
            except Exception as e:
                print(f"Error removing path from ingress: {e}")

            # Xóa service
            try:
                self.core_v1.delete_namespaced_service(
                    name=f"{server_name}-service",
                    namespace=self.namespace
                )
                print("Service deleted")
            except client.exceptions.ApiException as e:
                if e.status != 404:
                    raise

            # Xóa deployment
            try:
                self.apps_v1.delete_namespaced_deployment(
                    name=server_name,
                    namespace=self.namespace
                )
                print("Deployment deleted")
            except client.exceptions.ApiException as e:
                if e.status != 404:
                    raise

            # Xóa backend config
            try:
                self.custom_objects_api.delete_namespaced_custom_object(
                    group="cloud.google.com",
                    version="v1",
                    namespace=self.namespace,
                    plural="backendconfigs",
                    name=f"{server_name}-backend-config"
                )
                print("Backend config deleted")
            except client.exceptions.ApiException as e:
                if e.status != 404:
                    raise

        except Exception as e:
            print(f"Error cleaning up resources: {e}")
            raise

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
        