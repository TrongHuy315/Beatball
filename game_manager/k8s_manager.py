# game_manager/k8s_manager.py
from kubernetes import client, config
from google.oauth2 import service_account
from google.cloud import container_v1
from google.auth import transport
from kubernetes.client import CustomObjectsApi
import os
import json
import eventlet

class K8sGameManager:
    def __init__(self):
        self.namespace = "beatball-game"
        self.cluster_name = os.getenv('GKE_CLUSTER_NAME')
        self.cluster_zone = os.getenv('GKE_CLUSTER_ZONE')
        self.credentials_json = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
        self.project_id = "beatball-physics"
        self.main_ingress_name = "game-ingress"
        self.update_ingress = True

        # Khởi tạo K8s client
        self.configure_k8s()

        if self.update_ingress:
            # Create the ingress with fixed path -11111
            self.create_main_ingress_with_fixed_path()
        
        # Tạo namespace
        self.create_namespace()
    def create_main_ingress_with_fixed_path(self):
        try:
            fixed_path = "game-test--11111"  # Fixed path with -11111
            ingress_spec = {
                "apiVersion": "networking.k8s.io/v1",
                "kind": "Ingress",
                "metadata": {
                    "name": self.main_ingress_name,
                    "namespace": self.namespace,
                    "annotations": {
                        "kubernetes.io/ingress.class": "gce",
                        "kubernetes.io/ingress.global-static-ip-name": "beatball-ip",
                        "networking.gke.io/v1beta1.FrontendConfig": "beatball-frontend-config",
                        "cert-manager.io/cluster-issuer": "letsencrypt-prod"
                    }
                },
                "spec": {
                    "tls": [
                        {
                            "hosts": ["beatball.xyz"],
                            "secretName": "beatball-tls-cert"
                        }
                    ],
                    "rules": [
                        {
                            "host": "beatball.xyz",
                            "http": {
                                "paths": [
                                    {
                                        "path": f"/game/{fixed_path}",
                                        "pathType": "Prefix",
                                        "backend": {
                                            "service": {
                                                "name": f"{fixed_path}-service",
                                                "port": {"number": 8000}
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                }
            }

            try:
                self.networking_v1.create_namespaced_ingress(
                    namespace=self.namespace,
                    body=ingress_spec
                )
                print(f"Created main ingress with fixed path /game/{fixed_path}")
            except client.exceptions.ApiException as e:
                if e.status == 409:  # Already exists
                    self.networking_v1.patch_namespaced_ingress(
                        name=self.main_ingress_name,
                        namespace=self.namespace,
                        body=ingress_spec
                    )
                    print(f"Updated main ingress with fixed path /game/{fixed_path}")
                else:
                    raise

        except Exception as e:
            print(f"Error creating/updating main ingress: {e}")
            raise
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

    def _create_frontend_config(self):
        return {
            "apiVersion": "networking.gke.io/v1beta1",
            "kind": "FrontendConfig",
            "metadata": {
                "name": "beatball-frontend-config",
                "namespace": self.namespace
            },
            "spec": {
                "redirectToHttps": {
                    "enabled": True
                },
                "sslPolicy": "beatball-ssl-policy"
            }
        }
        
    def _create_backend_config(self, name, labels):
        return {
            "apiVersion": "cloud.google.com/v1",
            "kind": "BackendConfig",
            "metadata": {
                "name": f"{name}-backend-config",
                "namespace": self.namespace,
                "labels": labels,
            },
            "spec": {
                "timeoutSec": 3600,
                "connectionDraining": {
                    "drainingTimeoutSec": 60
                },
                "healthCheck": {
                    "checkIntervalSec": 15,
                    "timeoutSec": 5,
                    "healthyThreshold": 1,
                    "unhealthyThreshold": 2,
                    "type": "HTTP",
                    "requestPath": "/health",
                    "port": 8000
                },
                "sessionAffinity": {
                    "affinityType": "GENERATED_COOKIE",
                    "affinityCookieTtlSec": 3600
                },
                "customRequestHeaders": {
                    "headers": [
                        "Upgrade: $http_upgrade",
                        "Connection: $connection_upgrade",
                        "X-Forwarded-For: $remote_addr",
                        "X-Real-IP: $remote_addr",
                        "X-Forwarded-Proto: https"
                    ]
                },
                "logging": {
                    "enable": True
                },
                "securityPolicy": {
                    "name": "websocket-security-policy"
                },
                "iap": {
                    "enabled": False
                }
            }
        }
    def create_game_instance(self, room_id, player_data, updateIngress=False):
        """
        Creates a Deployment and Service for a new game instance.
        Instead of creating a separate Ingress object, it adds a path to the
        shared Ingress (self.main_ingress_name) if updateIngress = True with
        a random negative suffix on the path. Otherwise, it uses the standard path.
        """
        try:
            server_name = f"game-{room_id}"
            labels = {
                'app': server_name,
                'managed-by': 'beatball'
            }
            print(f"Creating game server deployment: {server_name}")

            # Check if FrontendConfig exists first
            try:
                self.custom_objects_api.get_namespaced_custom_object(
                    group="networking.gke.io",
                    version="v1beta1",
                    namespace=self.namespace,
                    plural="frontendconfigs",
                    name="beatball-frontend-config"
                )
                print("Frontend config already exists, reusing it")
            except client.exceptions.ApiException as e:
                if e.status == 404:
                    # Only create if it doesn't exist
                    self.custom_objects_api.create_namespaced_custom_object(
                        group="networking.gke.io",
                        version="v1beta1",
                        namespace=self.namespace,
                        plural="frontendconfigs",
                        body=self._create_frontend_config()
                    )
                    print("Frontend config created")
                else:
                    raise

            # Create a BackendConfig for this server
            self.custom_objects_api.create_namespaced_custom_object(
                group="cloud.google.com",
                version="v1",
                namespace=self.namespace,
                plural="backendconfigs",
                body=self._create_backend_config(server_name, labels)
            )

            # Create Deployment
            deployment = self.apps_v1.create_namespaced_deployment(
                namespace=self.namespace,
                body=self._create_deployment_spec(server_name, room_id, player_data, labels)
            )
            print(f"Deployment created: {deployment.metadata.name}")

            # Create Service
            service = self.core_v1.create_namespaced_service(
                namespace=self.namespace,
                body=self._create_service_spec(server_name, labels)
            )
            print(f"Service created: {service.metadata.name}")

            # Wait until the pod is ready
            self._wait_for_pod_ready(server_name)

            ingress_path = f"/game/{server_name}"

            # Add path to the shared Ingress
            self._add_game_path_to_ingress(ingress_path, service_name=f"{server_name}-service")

            # Wait for the shared Ingress IP
            ip = self._wait_for_ingress_ip(self.main_ingress_name)
            print(f"Shared Ingress {self.main_ingress_name} has IP: {ip}")

            return {
                'server_url': f"https://beatball.xyz{ingress_path}",
                'deployment_name': server_name,
                'service_name': f"{server_name}-service",
                # The shared Ingress is used here
                'ingress_name': self.main_ingress_name,
                # Return the exact path we created so we can remove it later
                'ingress_path': ingress_path
            }

        except Exception as e:
            print(f"Error creating game server: {e}")
            raise
    
    def _add_game_path_to_ingress(self, ingress_path, service_name):
        """
        Dynamically adds a path for the given service to the shared Ingress (self.main_ingress_name).
        E.g. ingress_path="/game/game-12345", service_name="game-12345-service"
        """
        import time
        try:
            current_ingress = self.networking_v1.read_namespaced_ingress(
                name=self.main_ingress_name,
                namespace=self.namespace
            )

            new_path = {
                'path': ingress_path,
                'pathType': 'Prefix',
                'backend': {
                    'service': {
                        'name': service_name,
                        'port': {
                            'number': 8000
                        }
                    }
                }
            }

            rule = None
            if current_ingress.spec and current_ingress.spec.rules:
                # We assume the first rule is the primary
                rule = current_ingress.spec.rules[0]
            else:
                raise Exception("Shared Ingress has no rules defined.")

            if not rule.http:
                raise Exception("Shared Ingress rule has no HTTP paths defined.")

            if not rule.http.paths:
                rule.http.paths = []

            # Add our new path
            rule.http.paths.append(new_path)

            # Add WebSocket-friendly annotations if not already present
            if not current_ingress.metadata.annotations:
                current_ingress.metadata.annotations = {}
            current_ingress.metadata.annotations["ingress.kubernetes.io/backend-protocol"] = "HTTP"
            current_ingress.metadata.annotations["ingress.kubernetes.io/proxy-read-timeout"] = "3600"
            current_ingress.metadata.annotations["ingress.kubernetes.io/proxy-send-timeout"] = "3600"

            self.networking_v1.patch_namespaced_ingress(
                name=self.main_ingress_name,
                namespace=self.namespace,
                body=current_ingress
            )

            print(f"Added path '{ingress_path}' to the shared Ingress {self.main_ingress_name}")

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
            eventlet.sleep(2)

    def _wait_for_ingress_ip(self, ingress_name, timeout=600):
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
            eventlet.sleep(5)

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
                    eventlet.sleep(2)
                except client.exceptions.ApiException as e:
                    if e.status == 404:
                        break
        except client.exceptions.ApiException as e:
            if e.status != 404:  # Ignore if namespace doesn't exist
                raise

    def _create_deployment_spec(self, name, room_id, player_data, labels):
        socket_path = f"/game/{name}/socket.io"
        return {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {
                "name": name,
                "namespace": self.namespace,
                "labels": labels, 
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
                                {"name": "PORT", "value": "8000"},
                                {"name": "SOCKET_PATH", "value": socket_path}
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

    def _create_service_spec(self, name, labels):
        return {
            "apiVersion": "v1",
            "kind": "Service",
            "metadata": {
                "name": f"{name}-service",
                "namespace": self.namespace,
                "annotations": {
                    "cloud.google.com/neg": '{"ingress": true}',
                    # Remove the HTTPS protocol since backend is HTTP
                    "cloud.google.com/backend-config": f'{{"default": "{name}-backend-config"}}'
                }, 
                "labels": labels
            },
            "spec": {
                "ports": [
                    {
                        "name": "http",
                        "port": 8000,
                        "targetPort": 8000,
                        "protocol": "TCP"
                    }
                ],
                "selector": {
                    "app": name
                },
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

            eventlet.sleep(2)

    def cleanup_all_resources(self):
        """Dọn dẹp tất cả resources trong namespace"""
        try:
            print("Cleaning up all resources in namespace...")

            # 1. Xóa tất cả deployments
            try:
                deployments = self.apps_v1.list_namespaced_deployment(namespace=self.namespace)
                for dep in deployments.items:
                    print(f"Deleting deployment: {dep.metadata.name}")
                    self.apps_v1.delete_namespaced_deployment(
                        name=dep.metadata.name,
                        namespace=self.namespace
                    )
            except Exception as e:
                print(f"Error deleting deployments: {e}")

            # 2. Xóa tất cả services
            try:
                services = self.core_v1.list_namespaced_service(namespace=self.namespace)
                for svc in services.items:
                    if svc.metadata.name != 'kubernetes':  # Không xóa service mặc định
                        print(f"Deleting service: {svc.metadata.name}")
                        self.core_v1.delete_namespaced_service(
                            name=svc.metadata.name,
                            namespace=self.namespace
                        )
            except Exception as e:
                print(f"Error deleting services: {e}")

            # 3. Xóa tất cả backend configs
            try:
                backend_configs = self.custom_objects_api.list_namespaced_custom_object(
                    group="cloud.google.com",
                    version="v1",
                    namespace=self.namespace,
                    plural="backendconfigs"
                )
                for bc in backend_configs['items']:
                    print(f"Deleting backend config: {bc['metadata']['name']}")
                    self.custom_objects_api.delete_namespaced_custom_object(
                        group="cloud.google.com",
                        version="v1",
                        namespace=self.namespace,
                        plural="backendconfigs",
                        name=bc['metadata']['name']
                    )
            except Exception as e:
                print(f"Error deleting backend configs: {e}")

            try:
                ingresses = self.networking_v1.list_namespaced_ingress(namespace=self.namespace)
                for ing in ingresses.items:
                    print(f"Deleting ingress: {ing.metadata.name}")
                    self.networking_v1.delete_namespaced_ingress(
                        name=ing.metadata.name,
                        namespace=self.namespace
                    )
            except Exception as e:
                print(f"Error deleting ingresses: {e}")

            # 5. Xóa FrontendConfig
            try:
                frontend_configs = self.custom_objects_api.list_namespaced_custom_object(
                    group="networking.gke.io",
                    version="v1beta1",
                    namespace=self.namespace,
                    plural="frontendconfigs"
                )
                for fc in frontend_configs['items']:
                    print(f"Deleting frontend config: {fc['metadata']['name']}")
                    self.custom_objects_api.delete_namespaced_custom_object(
                        group="networking.gke.io",
                        version="v1beta1",
                        namespace=self.namespace,
                        plural="frontendconfigs",
                        name=fc['metadata']['name']
                    )
            except Exception as e:
                print(f"Error deleting frontend configs: {e}")

            # 6. Đợi xóa xong
            import time
            timeout = 60  # 60 seconds timeout
            start_time = time.time()

            while True:
                if time.time() - start_time > timeout:
                    print("Timeout waiting for resources cleanup")
                    break

                deployments = self.apps_v1.list_namespaced_deployment(namespace=self.namespace)
                services = self.core_v1.list_namespaced_service(namespace=self.namespace)
                resources_exist = len(deployments.items) > 0 or len(services.items) > 1
                
                ingresses = self.networking_v1.list_namespaced_ingress(namespace=self.namespace)
                resources_exist = resources_exist or len(ingresses.items) > 0

                if not resources_exist:
                    print("All resources cleaned up successfully")
                    break

                eventlet.sleep(2)

        except Exception as e:
            print(f"Error in cleanup_all_resources: {e}")
            raise


    def _remove_game_path_from_ingress(self, ingress_path):
        """
        Dynamically removes a path from the shared Ingress (self.main_ingress_name).
        Ingress_path is the exact path string, e.g. "/game/game-12345"
        or "/game/game-12345--99999".
        """
        try:
            current_ingress = self.networking_v1.read_namespaced_ingress(
                name=self.main_ingress_name,
                namespace=self.namespace
            )

            if not current_ingress.spec or not current_ingress.spec.rules:
                print("Shared Ingress has no rules, nothing to remove.")
                return

            rule = current_ingress.spec.rules[0]
            if not rule.http or not rule.http.paths:
                print("Shared Ingress has no HTTP paths, nothing to remove.")
                return

            new_paths = []
            for p in rule.http.paths:
                if p.path == ingress_path:
                    print(f"Removing path '{p.path}' from the shared Ingress.")
                else:
                    new_paths.append(p)

            rule.http.paths = new_paths

            # Patch the updated Ingress
            self.networking_v1.patch_namespaced_ingress(
                name=self.main_ingress_name,
                namespace=self.namespace,
                body=current_ingress
            )

        except client.exceptions.ApiException as e:
            if e.status == 404:
                print("Shared Ingress does not exist, so no path to remove.")
            else:
                print(f"Error removing path from ingress: {e}")
        except Exception as ex:
            print(f"Unexpected error in _remove_game_path_from_ingress: {ex}")

    def cleanup_game_resources(self, server_name, ingress_path=None):
        """
        Cleans up resources associated with a given game server.
        Note: server_name is typically "game-<room_id>" or it might include
        a negative path suffix if you constructed it that way. The optional
        ingress_path is the URL path that was added to the shared Ingress.
        """
        print(f"Cleaning up resources for {server_name}")

        # Remove path from the shared Ingress (if provided)
        if ingress_path:
            try:
                self._remove_game_path_from_ingress(ingress_path)
            except Exception as e:
                print(f"Error removing Ingress path {ingress_path}: {e}")

        # Delete service
        try:
            self.core_v1.delete_namespaced_service(
                name=f"{server_name}-service",
                namespace=self.namespace
            )
            print("Service deleted")
        except client.exceptions.ApiException as e:
            if e.status != 404:
                print(f"Error deleting service: {e}")

        # Delete deployment
        try:
            self.apps_v1.delete_namespaced_deployment(
                name=server_name,
                namespace=self.namespace
            )
            print("Deployment deleted")
        except client.exceptions.ApiException as e:
            if e.status != 404:
                print(f"Error deleting deployment: {e}")

        # Delete backend config
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
                print(f"Error deleting backend config: {e}")

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
        