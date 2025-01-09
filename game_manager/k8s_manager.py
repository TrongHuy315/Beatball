# game_manager/k8s_manager.py
from kubernetes import client, config
from google.oauth2 import service_account
from google.cloud import container_v1
from google.auth import transport
import os
import json
from kubernetes.client.rest import ApiException
import time 
class K8sGameManager:
    def __init__(self):
        self.namespace = "beatball-game"
        self.cluster_name = os.getenv('GKE_CLUSTER_NAME')
        self.cluster_zone = os.getenv('GKE_CLUSTER_ZONE')
        self.credentials_json = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
        self.configure_k8s()
        self.create_namespace()
        self.custom_objects_api = client.CustomObjectsApi()  # Thêm dòng này
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
        self.cleanup_unused_services()
        try:
            server_name = f"game-{room_id}"
            
            print(f"Creating game server deployment: {server_name}")
            print(f"In namespace: {self.namespace}")

            # Create BackendConfig first
            backend_config = self._create_backend_config(server_name)
            try:
                self.custom_objects_api.create_namespaced_custom_object(
                    group="cloud.google.com",
                    version="v1",
                    namespace=self.namespace,
                    plural="backendconfigs",
                    body=backend_config
                )
            except client.exceptions.ApiException as e:
                if e.status != 409:  # Ignore if already exists
                    raise

            # Cleanup existing resources
            self.cleanup_game_resources(server_name)
            time.sleep(5)  # Wait for cleanup

            # Create deployment
            deployment_spec = self._create_deployment_spec(server_name, room_id, player_data)
            deployment = self.apps_v1.create_namespaced_deployment(
                namespace=self.namespace,
                body=deployment_spec
            )

            # Create service
            service_spec = self._create_service_spec(server_name)
            service = self.core_v1.create_namespaced_service(
                namespace=self.namespace,
                body=service_spec
            )

            # Wait for external IP
            external_ip = self._wait_for_external_ip(f"{server_name}-service")
            print(f"Got external IP: {external_ip}")

            return {
                'server_url': external_ip,  # Return just the IP, no port
                'deployment_name': server_name,
                'service_name': f"{server_name}-service"
            }

        except Exception as e:
            print(f"Error in create_game_instance: {e}")
            raise

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
                "labels": {
                    "app": name,
                    "environment": "production",
                    "managed-by": "beatball"
                }
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
                            }],
                            # Thêm resource requirements cho Autopilot
                            "resources": {
                                "requests": {
                                    "cpu": "250m",
                                    "memory": "512Mi"
                                },
                                "limits": {
                                    "cpu": "500m",
                                    "memory": "1Gi"
                                }
                            },
                            # Thêm security settings
                            "securityContext": {
                                "allowPrivilegeEscalation": False,
                                "capabilities": {
                                    "drop": ["ALL"]
                                },
                                "runAsNonRoot": True,
                                "runAsUser": 1000,
                                "seccompProfile": {
                                    "type": "RuntimeDefault"
                                }
                            }
                        }],
                        # Pod security context
                        "securityContext": {
                            "runAsNonRoot": True,
                            "runAsUser": 1000,
                            "seccompProfile": {
                                "type": "RuntimeDefault"
                            }
                        },
                        # Thêm scheduling requirements
                        "automountServiceAccountToken": False,
                        "restartPolicy": "Always"
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
                    "cloud.google.com/app-protocols": '{"ws":"HTTP"}',
                    "cloud.google.com/backend-config": '{"ports": {"80":"physics-server-backendconfig"}}'
                }
            },
            "spec": {
                "selector": {
                    "app": name
                },
                "ports": [{
                    "name": "ws",
                    "protocol": "TCP",
                    "port": 80,        # Đổi từ 8000 thành 80
                    "targetPort": 8000  # Giữ nguyên targetPort 8000
                }],
                "type": "LoadBalancer"
            }
        }

    def _create_backend_config(self, name):
        return {
            "apiVersion": "cloud.google.com/v1",
            "kind": "BackendConfig",
            "metadata": {
                "name": "physics-server-backendconfig",
                "namespace": self.namespace
            },
            "spec": {
                "timeoutSec": 3600,
                "connectionDraining": {
                    "drainingTimeoutSec": 300
                },
                "healthCheck": {
                    "checkIntervalSec": 15,
                    "port": 8000,
                    "type": "HTTP",
                    "requestPath": "/health"
                }
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
            
            # Delete deployment if exists
            try:
                self.apps_v1.delete_namespaced_deployment(
                    name=server_name,
                    namespace=self.namespace,
                    body=client.V1DeleteOptions(
                        propagation_policy='Foreground',
                        grace_period_seconds=5
                    )
                )
                print("Deployment deleted")
            except client.exceptions.ApiException as e:
                if e.status != 404:  # Ignore if not found
                    print(f"Error deleting deployment: {e}")
                    raise
            
            # Delete service if exists
            try:
                self.core_v1.delete_namespaced_service(
                    name=f"{server_name}-service",
                    namespace=self.namespace
                )
                print("Service deleted")
            except client.exceptions.ApiException as e:
                if e.status != 404:  # Ignore if not found
                    print(f"Error deleting service: {e}")
                    raise

            # Wait for resources to be fully deleted
            max_retries = 10
            retry_count = 0
            while retry_count < max_retries:
                try:
                    self.apps_v1.read_namespaced_deployment(
                        name=server_name,
                        namespace=self.namespace
                    )
                    print("Waiting for deployment to be deleted...")
                    import time
                    time.sleep(2)
                    retry_count += 1
                except client.exceptions.ApiException as e:
                    if e.status == 404:
                        print("Deployment fully deleted")
                        break
                    else:
                        raise

            if retry_count >= max_retries:
                print("Warning: Timeout waiting for deployment deletion")
                
        except Exception as e:
            print(f"Error during cleanup: {e}")
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
        
    def cleanup_unused_services(self):
        try:
            print("Starting cleanup of unused services...")
            
            # Lấy danh sách tất cả services
            services = self.core_v1.list_namespaced_service(namespace=self.namespace)
            
            for svc in services.items:
                if svc.metadata.name == "kubernetes":  # Bỏ qua service mặc định
                    continue
                    
                # Xóa service và deployment tương ứng
                service_name = svc.metadata.name
                deployment_name = service_name.replace('-service', '')
                
                print(f"\nCleaning up resources for {service_name}")
                
                try:
                    # Xóa service
                    self.core_v1.delete_namespaced_service(
                        name=service_name,
                        namespace=self.namespace
                    )
                    print(f"Deleted service: {service_name}")
                    
                    # Xóa deployment
                    self.apps_v1.delete_namespaced_deployment(
                        name=deployment_name,
                        namespace=self.namespace
                    )
                    print(f"Deleted deployment: {deployment_name}")
                    
                    # Đợi để đảm bảo resources được xóa
                    time.sleep(2)
                    
                except ApiException as e:
                    print(f"Error deleting {service_name}: {e}")
                    continue
                    
            print("\nCleanup completed!")
            
            # Kiểm tra lại sau khi dọn dẹp
            remaining_services = self.core_v1.list_namespaced_service(namespace=self.namespace)
            print("\nRemaining services:")
            for svc in remaining_services.items:
                if svc.metadata.name != "kubernetes":
                    print(f"- {svc.metadata.name}")
                    
        except ApiException as e:
            print(f"Error during cleanup: {e}")
    
        