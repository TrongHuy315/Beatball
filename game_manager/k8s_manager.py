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
        
        self.update_ingress = False
        self.update_frontend = False
        self.update_backend = False
        self.update_namespace = False

        self.configure_k8s()

    def update_configurations(self):
        """
        Creates or updates all Kubernetes configurations and verifies them
        """
        try:
            # Create namespace first if enabled
            if self.update_namespace:
                try:
                    existing_ns = self.core_v1.read_namespace(name=self.namespace)
                    print(f"Namespace {self.namespace} already exists")
                except client.exceptions.ApiException as e:
                    if e.status == 404:
                        # Create namespace if it doesn't exist
                        self.create_namespace()
                    else:
                        raise
                    
            # Create default backend first
            try:
                self.create_default_backend()
                print("Default backend created/verified")
            except Exception as e:
                print(f"Error creating default backend: {e}")
                raise
            
            # Create backend config if enabled
            if self.update_backend:
                try:
                    self.create_backend_config("service-backend")
                    print("Backend config created/verified")
                except Exception as e:
                    print(f"Error creating backend config: {e}")
                    raise

            # Create frontend config if enabled
            if self.update_frontend:
                try:
                    self.create_frontend_config()
                    print("Frontend config created/verified")
                except Exception as e:
                    print(f"Error creating frontend config: {e}")
                    raise

            # Create ingress if enabled
            if self.update_ingress:
                try:
                    self.create_main_ingress()
                    print("Ingress created/verified")
                except Exception as e:
                    print(f"Error creating ingress: {e}")
                    raise

            # Verify all configurations
            self.verify_all_configurations()

        except Exception as e:
            print(f"Error in update_configurations: {e}")
            raise

    def verify_all_configurations(self):
        """Verifies all created resources"""
        try:
            # Check namespace
            if self.update_namespace:
                ns = self.core_v1.read_namespace(self.namespace)
                print(f"Verified namespace: {self.namespace}")

            # Check backend config
            if self.update_backend:
                bc = self.custom_objects_api.get_namespaced_custom_object(
                    group="cloud.google.com",
                    version="v1",
                    namespace=self.namespace,
                    plural="backendconfigs",
                    name="service-backend"
                )
                print("Verified backend config")

            # Check frontend config
            if self.update_frontend:
                fc = self.custom_objects_api.get_namespaced_custom_object(
                    group="networking.gke.io",
                    version="v1beta1",
                    namespace=self.namespace,
                    plural="frontendconfigs",
                    name="ingress-frontend-config"
                )
                print("Verified frontend config")

            # Check ingress
            if self.update_ingress:
                ingress = self.networking_v1.read_namespaced_ingress(
                    name=self.main_ingress_name,
                    namespace=self.namespace
                )
                print(f"Verified ingress: {self.main_ingress_name}")

            print("All configurations verified successfully")
            return True

        except Exception as e:
            print(f"Configuration verification failed: {e}")
            raise
            
    def create_frontend_config(self):
        try:
            frontend_config = self._create_frontend_config()
            self.custom_objects_api.create_namespaced_custom_object(
                group="networking.gke.io",
                version="v1beta1",
                namespace=self.namespace,
                plural="frontendconfigs",
                body=frontend_config
            )
            print("Frontend config created")
        except client.exceptions.ApiException as e:
            if e.status == 409:  # Already exists
                print("Frontend config already exists")
            else:
                raise
        
    def create_backend_config(self, name):
        try:
            backend_config = self._create_backend_config(name)
            self.custom_objects_api.create_namespaced_custom_object(
                group="cloud.google.com",
                version="v1",
                namespace=self.namespace,
                plural="backendconfigs",
                body=backend_config
            )
            print(f"Backend config {name} created")
        except client.exceptions.ApiException as e:
            if e.status == 409:  # Already exists
                print(f"Backend config {name} already exists")
            else:
                raise
            
    def create_main_ingress(self):
        """Creates the main ingress with specific path rule only"""
        try:
            ingress_spec = {
                "apiVersion": "networking.k8s.io/v1",
                "kind": "Ingress",
                "metadata": {
                    "name": self.main_ingress_name,
                    "namespace": self.namespace,
                    "annotations": {
                        "kubernetes.io/ingress.class": "gce",
                        "kubernetes.io/ingress.global-static-ip-name": "beatball-ip",
                        "networking.gke.io/v1beta1.FrontendConfig": "ingress-frontend-config",
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
                                        "path": "/game/game-test--11111",
                                        "pathType": "Prefix",
                                        "backend": {
                                            "service": {
                                                "name": "default-backend",
                                                "port": {"number": 80}
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
                # Validate required attributes
                if not self.main_ingress_name or not self.namespace:
                    raise ValueError("main_ingress_name and namespace must be set")

                response = self.networking_v1.create_namespaced_ingress(
                    namespace=self.namespace,
                    body=ingress_spec
                )
                print(f"Created main ingress")
                return response

            except client.exceptions.ApiException as e:
                if e.status == 409:  # Already exists
                    try:
                        response = self.networking_v1.patch_namespaced_ingress(
                            name=self.main_ingress_name,
                            namespace=self.namespace,
                            body=ingress_spec
                        )
                        print(f"Updated main ingress")
                        return response
                    except client.exceptions.ApiException as patch_e:
                        print(f"Error patching ingress: {patch_e}")
                        raise
                else:
                    print(f"API Exception: {e.status} - {e.reason}")
                    raise

        except Exception as e:
            print(f"Error creating/updating main ingress: {str(e)}")
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
                "name": "ingress-frontend-config",
                "namespace": self.namespace
            },
            "spec": {
                "redirectToHttps": {
                    "enabled": True
                },
                "sslPolicy": "beatball-ssl-policy"
            }
        }
        
    def _create_backend_config(self, name):
        return {
            "apiVersion": "cloud.google.com/v1",
            "kind": "BackendConfig",
            "metadata": {
                "name": name,
                "namespace": self.namespace
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
    def create_game_instance(self, room_id, player_data):
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
        """Adds game-specific paths to the shared Ingress"""
        try:
            current_ingress = self.networking_v1.read_namespaced_ingress(
                name=self.main_ingress_name,
                namespace=self.namespace
            )

            # Create required paths for this game service - removed standalone /socket.io
            new_paths = [
                {
                    'path': ingress_path,
                    'pathType': 'Prefix',
                    'backend': {
                        'service': {
                            'name': service_name,
                            'port': {'number': 8000}
                        }
                    }
                },
                {
                    'path': f"{ingress_path}/socket.io",
                    'pathType': 'Prefix',
                    'backend': {
                        'service': {
                            'name': service_name,
                            'port': {'number': 8000}
                        }
                    }
                }
            ]

            rule = None
            if current_ingress.spec and current_ingress.spec.rules:
                rule = current_ingress.spec.rules[0]
            else:
                raise Exception("Shared Ingress has no rules defined.")

            if not rule.http:
                rule.http = client.V1HTTPIngressRuleValue(paths=[])

            # Add new paths
            for new_path in new_paths:
                rule.http.paths.append(new_path)

            # Ensure required annotations are present
            if not current_ingress.metadata.annotations:
                current_ingress.metadata.annotations = {}
                
            current_ingress.metadata.annotations.update({
                "kubernetes.io/ingress.class": "gce",
                "kubernetes.io/ingress.global-static-ip-name": "beatball-ip",
                "networking.gke.io/v1beta1.FrontendConfig": "ingress-frontend-config",
                "cert-manager.io/cluster-issuer": "letsencrypt-prod",
                "ingress.kubernetes.io/backend-protocol": "HTTP",
                "ingress.kubernetes.io/proxy-read-timeout": "3600",
                "ingress.kubernetes.io/proxy-send-timeout": "3600"
            })

            self.networking_v1.patch_namespaced_ingress(
                name=self.main_ingress_name,
                namespace=self.namespace,
                body=current_ingress
            )

            print(f"Added paths for '{ingress_path}' to the shared Ingress {self.main_ingress_name}")

        except Exception as e:
            print(f"Error adding paths to ingress: {e}")
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

    def create_default_backend(self):
        """Creates a minimal default backend deployment and service"""
        try:
            # Service definition for default backend only
            service = {
                "apiVersion": "v1",
                "kind": "Service",
                "metadata": {
                    "name": "default-backend",
                    "namespace": self.namespace
                },
                "spec": {
                    "ports": [{
                        "name": "http",
                        "port": 80,
                        "targetPort": 8080,
                        "protocol": "TCP"
                    }],
                    "selector": {
                        "app": "default-backend"
                    },
                    "type": "ClusterIP"
                }
            }

            # Deployment definition for default backend
            deployment = {
                "apiVersion": "apps/v1",
                "kind": "Deployment",
                "metadata": {
                    "name": "default-backend",
                    "namespace": self.namespace,
                    "labels": {
                        "app": "default-backend"
                    }
                },
                "spec": {
                    "replicas": 1,
                    "selector": {
                        "matchLabels": {
                            "app": "default-backend"
                        }
                    },
                    "template": {
                        "metadata": {
                            "labels": {
                                "app": "default-backend"
                            }
                        },
                        "spec": {
                            "containers": [{
                                "name": "default-backend",
                                "image": "k8s.gcr.io/defaultbackend:1.4",
                                "ports": [{
                                    "name": "http",
                                    "containerPort": 8080,
                                    "protocol": "TCP"
                                }],
                                "readinessProbe": {
                                    "httpGet": {
                                        "path": "/healthz",
                                        "port": 8080,
                                        "scheme": "HTTP"
                                    },
                                    "initialDelaySeconds": 10,
                                    "periodSeconds": 5,
                                    "timeoutSeconds": 5
                                },
                                "livenessProbe": {
                                    "httpGet": {
                                        "path": "/healthz",
                                        "port": 8080,
                                        "scheme": "HTTP"
                                    },
                                    "initialDelaySeconds": 15,
                                    "periodSeconds": 10,
                                    "timeoutSeconds": 5
                                },
                                "resources": {
                                    "requests": {
                                        "cpu": "10m",
                                        "memory": "20Mi"
                                    },
                                    "limits": {
                                        "cpu": "10m",
                                        "memory": "20Mi"
                                    }
                                }
                            }]
                        }
                    }
                }
            }

            try:
                # Delete old resources if they exist
                try:
                    self.apps_v1.delete_namespaced_deployment(
                        name="default-backend",
                        namespace=self.namespace
                    )
                    print("Deleted existing default backend deployment")
                except client.exceptions.ApiException as e:
                    if e.status != 404:  # Ignore if not found
                        raise

                try:
                    self.core_v1.delete_namespaced_service(
                        name="default-backend",
                        namespace=self.namespace
                    )
                    print("Deleted existing default backend service")
                except client.exceptions.ApiException as e:
                    if e.status != 404:  # Ignore if not found
                        raise

                # Wait for resources to be deleted
                import time
                time.sleep(5)

                # Create new resources
                self.apps_v1.create_namespaced_deployment(
                    namespace=self.namespace,
                    body=deployment
                )
                print("Created default backend deployment")

                self.core_v1.create_namespaced_service(
                    namespace=self.namespace,
                    body=service
                )
                print("Created default backend service")

                # Wait for deployment to be ready
                self._wait_for_pod_ready("default-backend")
                print("Default backend is ready")

            except Exception as e:
                print(f"Error creating default backend resources: {str(e)}")
                raise

        except Exception as e:
            print(f"Error in create_default_backend: {str(e)}")
            raise
    def _create_service_spec(self, name, labels):
        return {
            "apiVersion": "v1",
            "kind": "Service",
            "metadata": {
                "name": f"{name}-service",
                "namespace": self.namespace,
                "annotations": {
                    "cloud.google.com/neg": '{"ingress": true}',
                    # Reference the service-backend config
                    "cloud.google.com/backend-config": '{"default": "service-backend"}'
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

            # 1. Always clean deployments
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

            # 2. Always clean services
            try:
                services = self.core_v1.list_namespaced_service(namespace=self.namespace)
                for svc in services.items:
                    if svc.metadata.name != 'kubernetes':
                        print(f"Deleting service: {svc.metadata.name}")
                        self.core_v1.delete_namespaced_service(
                            name=svc.metadata.name,
                            namespace=self.namespace
                        )
            except Exception as e:
                print(f"Error deleting services: {e}")

            # 3. Backend configs only if update_backend is True
            if self.update_backend:
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

            # 4. Ingress only if update_ingress is True
            if self.update_ingress:
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

            # 5. Frontend config only if update_frontend is True
            if self.update_frontend:
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

            # 6. Wait for cleanup
            import time
            timeout = 60
            start_time = time.time()

            while True:
                if time.time() - start_time > timeout:
                    print("Timeout waiting for resources cleanup")
                    break

                resources_exist = False
                
                # Always check deployments and services
                deployments = self.apps_v1.list_namespaced_deployment(namespace=self.namespace)
                services = self.core_v1.list_namespaced_service(namespace=self.namespace)
                resources_exist = len(deployments.items) > 0 or len(services.items) > 1

                # Check other resources based on flags
                if self.update_ingress:
                    ingresses = self.networking_v1.list_namespaced_ingress(namespace=self.namespace)
                    resources_exist = resources_exist or len(ingresses.items) > 0

                if not resources_exist:
                    print("All resources cleaned up successfully")
                    break

                eventlet.sleep(2)
            
            eventlet.sleep(15)
            # 7. Update configurations after cleanup
            print("Recreating configurations...")
            try:
                self.update_configurations()
                print("Configurations updated successfully after cleanup")
            except Exception as e:
                print(f"Error updating configurations after cleanup: {e}")
                raise
        except Exception as e:
            print(f"Error in cleanup_all_resources: {e}")
            raise


    def _remove_game_path_from_ingress(self, ingress_path):
        """Removes game-specific paths from the shared Ingress"""
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

            # Define paths that need to be removed - removed standalone /socket.io
            paths_to_remove = {
                ingress_path,
                f"{ingress_path}/socket.io"
            }

            # Filter out the paths we want to remove
            new_paths = []
            for path in rule.http.paths:
                if path.path not in paths_to_remove:
                    new_paths.append(path)
                else:
                    print(f"Removing path '{path.path}' from the shared Ingress")

            rule.http.paths = new_paths

            # Patch the updated Ingress
            self.networking_v1.patch_namespaced_ingress(
                name=self.main_ingress_name,
                namespace=self.namespace,
                body=current_ingress
            )

            print(f"Successfully removed paths for '{ingress_path}' from the shared Ingress")

        except client.exceptions.ApiException as e:
            if e.status == 404:
                print("Shared Ingress does not exist, so no paths to remove.")
            else:
                print(f"Error removing paths from ingress: {e}")
                raise
        except Exception as e:
            print(f"Unexpected error in _remove_game_path_from_ingress: {e}")
            raise

    def cleanup_game_resources(self, server_name, ingress_path=None):
        """
        Cleans up resources associated with a given game server.
        """
        print(f"Cleaning up resources for {server_name}")

        # Always clean deployment and service
        try:
            self.core_v1.delete_namespaced_deployment(
                name=server_name,
                namespace=self.namespace
            )
            print("Deployment deleted")
        except client.exceptions.ApiException as e:
            if e.status != 404:
                print(f"Error deleting deployment: {e}")

        try:
            self.core_v1.delete_namespaced_service(
                name=f"{server_name}-service",
                namespace=self.namespace
            )
            print("Service deleted")
        except client.exceptions.ApiException as e:
            if e.status != 404:
                print(f"Error deleting service: {e}")

        # Remove ingress path if update_ingress is True
        if self.update_ingress and ingress_path:
            try:
                self._remove_game_path_from_ingress(ingress_path)
            except Exception as e:
                print(f"Error removing Ingress path {ingress_path}: {e}")

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
        