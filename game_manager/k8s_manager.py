# game_manager/k8s_manager.py
from kubernetes import client, config
from google.oauth2 import service_account
from google.cloud import container_v1
from google.auth import transport
import os
import json
import time

class K8sGameManager:
    def __init__(self):
        self.namespace = "beatball-game"
        self.cluster_name = os.getenv('GKE_CLUSTER_NAME')
        self.cluster_zone = os.getenv('GKE_CLUSTER_ZONE')
        self.credentials_json = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')

        self.configure_k8s()
        self.create_namespace()
        self.custom_objects_api = client.CustomObjectsApi()

    def configure_k8s(self):
        """
        Cấu hình client Python để kết nối đến GKE Kubernetes Cluster,
        dựa vào thông tin môi trường (tên cluster, zone, credentials).
        """
        try:
            # Tạo credentials từ JSON string
            credentials_dict = json.loads(self.credentials_json)
            credentials = service_account.Credentials.from_service_account_info(
                credentials_dict,
                scopes=['https://www.googleapis.com/auth/cloud-platform']
            )

            # Refresh token
            request = transport.requests.Request()
            credentials.refresh(request)

            # Lấy thông tin cụm GKE
            container_client = container_v1.ClusterManagerClient(credentials=credentials)
            cluster_path = f"projects/{credentials_dict['project_id']}/locations/{self.cluster_zone}/clusters/{self.cluster_name}"
            cluster = container_client.get_cluster(name=cluster_path)

            # Tạo cấu hình cho Python Kubernetes client
            configuration = client.Configuration()
            configuration.host = f"https://{cluster.endpoint}"
            configuration.verify_ssl = False  # Tắt verify SSL (tùy chọn)
            
            # Sử dụng token đã refresh
            if not credentials.valid:
                credentials.refresh(request)
            configuration.api_key = {"authorization": f"Bearer {credentials.token}"}

            client.Configuration.set_default(configuration)

            # Khởi tạo các API cần thiết
            self.apps_v1 = client.AppsV1Api()
            self.core_v1 = client.CoreV1Api()

            print("Successfully configured K8s client")

        except Exception as e:
            print(f"Error configuring K8s client: {e}")
            raise

    def create_namespace(self):
        """
        Tạo namespace (beatball-game) nếu chưa tồn tại.
        """
        try:
            # Kiểm tra namespace
            try:
                self.core_v1.read_namespace(name=self.namespace)
                print(f"Namespace {self.namespace} already exists")
                return
            except client.exceptions.ApiException as e:
                if e.status != 404:
                    raise

            # Tạo namespace nếu chưa có
            namespace_manifest = {
                "apiVersion": "v1",
                "kind": "Namespace",
                "metadata": {
                    "name": self.namespace,
                    "labels": {
                        "name": self.namespace,
                        "environment": "production",
                        "managed-by": "beatball"
                    },
                    "annotations": {
                        "container.googleapis.com/autopilot": "true"
                    }
                }
            }

            try:
                self.core_v1.create_namespace(body=namespace_manifest)
                print(f"Created namespace: {self.namespace}")
            except client.exceptions.ApiException as e:
                if e.status == 409:
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

    def cleanup_namespace(self):
        """
        Xóa toàn bộ namespace (chỉ dùng khi cần thiết).
        """
        try:
            self.core_v1.delete_namespace(name=self.namespace)
            print(f"Deleted namespace: {self.namespace}")

            # Đợi namespace được xóa hoàn toàn (đơn giản, timeout 30s)
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
            if e.status != 404:
                raise

    def create_physics_server(self):
        """
        Tạo đầy đủ Deployment, Service, Ingress và BackendConfig 
        cho physics-server theo đúng deployment.yaml đã chỉ định.
        """
        try:
            deployment_name = "physics-server"
            service_name = "physics-server-service"
            backendconfig_name = "physics-server-backendconfig"
            ingress_name = "game-ingress"

            # Tạo (hoặc cập nhật) BackendConfig
            backend_config_spec = self._create_backend_config_spec(backendconfig_name)
            try:
                self.custom_objects_api.create_namespaced_custom_object(
                    group="cloud.google.com",
                    version="v1",
                    namespace=self.namespace,
                    plural="backendconfigs",
                    body=backend_config_spec
                )
                print(f"Created BackendConfig: {backendconfig_name}")
            except client.exceptions.ApiException as e:
                if e.status == 409:
                    print(f"BackendConfig {backendconfig_name} already exists, proceeding...")
                else:
                    raise

            # Tạo hoặc cập nhật Deployment
            # (trước tiên cleanup để xóa cũ nếu có)
            self.cleanup_physics_server()
            time.sleep(5)

            deployment_spec = self._create_deployment_spec(deployment_name)
            self.apps_v1.create_namespaced_deployment(
                namespace=self.namespace,
                body=deployment_spec
            )
            print(f"Created Deployment: {deployment_name}")

            # Tạo hoặc cập nhật Service
            service_spec = self._create_service_spec(service_name, backendconfig_name)
            self.core_v1.create_namespaced_service(
                namespace=self.namespace,
                body=service_spec
            )
            print(f"Created Service: {service_name}")

            # Tạo hoặc cập nhật Ingress
            ingress_spec = self._create_ingress_spec(ingress_name, backendconfig_name, service_name)
            networking_v1 = client.NetworkingV1Api()
            try:
                networking_v1.create_namespaced_ingress(
                    namespace=self.namespace,
                    body=ingress_spec
                )
                print(f"Created Ingress: {ingress_name}")
            except client.exceptions.ApiException as e:
                if e.status == 409:
                    print(f"Ingress {ingress_name} already exists")
                else:
                    raise

        except Exception as e:
            print(f"Error in create_physics_server: {e}")
            raise

    def cleanup_physics_server(self):
        """
        Xóa Deployment, Service, Ingress của physics-server (nếu tồn tại).
        """
        deployment_name = "physics-server"
        service_name = "physics-server-service"
        ingress_name = "game-ingress"

        try:
            # Xóa Deployment
            try:
                self.apps_v1.delete_namespaced_deployment(
                    name=deployment_name,
                    namespace=self.namespace,
                    body=client.V1DeleteOptions(
                        propagation_policy='Foreground',
                        grace_period_seconds=5
                    )
                )
                print("Deleted Deployment: physics-server")
            except client.exceptions.ApiException as e:
                if e.status != 404:
                    raise

            # Xóa Service
            try:
                self.core_v1.delete_namespaced_service(
                    name=service_name,
                    namespace=self.namespace
                )
                print("Deleted Service: physics-server-service")
            except client.exceptions.ApiException as e:
                if e.status != 404:
                    raise

            # Xóa Ingress
            networking_v1 = client.NetworkingV1Api()
            try:
                networking_v1.delete_namespaced_ingress(
                    name=ingress_name,
                    namespace=self.namespace
                )
                print("Deleted Ingress: game-ingress")
            except client.exceptions.ApiException as e:
                if e.status != 404:
                    raise

            # Xóa BackendConfig
            backendconfig_name = "physics-server-backendconfig"
            try:
                self.custom_objects_api.delete_namespaced_custom_object(
                    group="cloud.google.com",
                    version="v1",
                    namespace=self.namespace,
                    plural="backendconfigs",
                    name=backendconfig_name
                )
                print("Deleted BackendConfig: physics-server-backendconfig")
            except client.exceptions.ApiException as e:
                if e.status != 404:
                    raise

            # Đợi cho Deployment bị xóa hẳn
            max_retries = 10
            retry_count = 0
            while retry_count < max_retries:
                try:
                    self.apps_v1.read_namespaced_deployment(
                        name=deployment_name,
                        namespace=self.namespace
                    )
                    print("Waiting for deployment to be deleted...")
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
            print(f"Error in cleanup_physics_server: {e}")
            raise

    def _create_deployment_spec(self, deploy_name):
        """
        Tạo spec cho Deployment (physics-server) giống nội dung trong deployment.yaml.
        """
        return {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {
                "name": deploy_name,
                "namespace": self.namespace,
                "labels": {
                    "app": "physics-server",
                    "environment": "production"
                }
            },
            "spec": {
                "replicas": 1,
                "selector": {
                    "matchLabels": {
                        "app": "physics-server"
                    }
                },
                "template": {
                    "metadata": {
                        "labels": {
                            "app": "physics-server"
                        }
                    },
                    "spec": {
                        "containers": [
                            {
                                "name": "physics-server",
                                "image": "beatball/physics-server:latest",
                                "imagePullPolicy": "Always",
                                "ports": [
                                    {
                                        "name": "http",
                                        "containerPort": 8000
                                    }
                                ],
                                "env": [
                                    {
                                        "name": "NODE_ENV",
                                        "value": "production"
                                    },
                                    {
                                        "name": "PORT",
                                        "value": "8000"
                                    }
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
                                },
                                "livenessProbe": {
                                    "httpGet": {
                                        "path": "/health",
                                        "port": "http"
                                    },
                                    "initialDelaySeconds": 15,
                                    "periodSeconds": 30,
                                    "timeoutSeconds": 3
                                },
                                "readinessProbe": {
                                    "httpGet": {
                                        "path": "/health",
                                        "port": "http"
                                    },
                                    "initialDelaySeconds": 5,
                                    "periodSeconds": 10
                                },
                                "securityContext": {
                                    "allowPrivilegeEscalation": False,
                                    "runAsNonRoot": True,
                                    "runAsUser": 1000
                                },
                            }
                        ]
                    }
                }
            }
        }

    def _create_service_spec(self, svc_name, backendconfig_name):
        """
        Tạo spec cho Service (physics-server-service) giống nội dung trong deployment.yaml.
        """
        return {
            "apiVersion": "v1",
            "kind": "Service",
            "metadata": {
                "name": svc_name,
                "namespace": self.namespace,
                "annotations": {
                    # Sử dụng BackendConfig cho port mặc định
                    "cloud.google.com/backend-config": '{"default": "' + backendconfig_name + '"}',
                    # app-protocols
                    "cloud.google.com/app-protocols": '{"http":"HTTP2"}'
                }
            },
            "spec": {
                "type": "NodePort",  # Theo YAML, ta đổi LoadBalancer -> NodePort
                "ports": [
                    {
                        "name": "http",   # Đổi tên port thành http
                        "port": 80,       # Đổi port service từ 443 xuống 80
                        "targetPort": 8000,
                        "protocol": "TCP"
                    }
                ],
                "selector": {
                    "app": "physics-server"
                }
            }
        }

    def _create_ingress_spec(self, ingress_name, backendconfig_name, service_name):
        """
        Tạo spec cho Ingress (game-ingress) giống nội dung trong deployment.yaml.
        """
        return {
            "apiVersion": "networking.k8s.io/v1",
            "kind": "Ingress",
            "metadata": {
                "name": ingress_name,
                "namespace": self.namespace,
                "annotations": {
                    "cloud.google.com/backend-config": '{"default":"' + backendconfig_name + '"}',
                    "kubernetes.io/ingress.class": "gce",
                    "networking.gke.io/managed-certificates": "game-managed-cert",
                    "kubernetes.io/ingress.global-static-ip-name": "beatball-ip"
                }
            },
            "spec": {
                "ingressClassName": "gce",
                "rules": [
                    {
                        "host": "beatball.xyz",
                        "http": {
                            "paths": [
                                {
                                    "path": "/",
                                    "pathType": "Prefix",
                                    "backend": {
                                        "service": {
                                            "name": service_name,
                                            "port": {
                                                "number": 80
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        }

    def _create_backend_config_spec(self, backendconfig_name):
        """
        Tạo spec cho BackendConfig (physics-server-backendconfig)
        giống nội dung trong deployment.yaml.
        """
        return {
            "apiVersion": "cloud.google.com/v1",
            "kind": "BackendConfig",
            "metadata": {
                "name": backendconfig_name,
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
                    "type": "HTTPS",
                    "requestPath": "/health"
                },
                "securityPolicy": {
                    "name": "websocket-security-policy"
                }
            }
        }

    def monitor_physics_server(self):
        """
        Lấy thông tin trạng thái của Deployment physics-server.
        """
        try:
            deployment_name = "physics-server"
            deployment = self.apps_v1.read_namespaced_deployment_status(
                name=deployment_name,
                namespace=self.namespace
            )
            return deployment.status.to_dict()
        except Exception as e:
            print(f"Error monitoring physics-server: {e}")
            return None

    def cleanup_unused_services(self):
        """
        Ví dụ hàm dọn dẹp các Service dư thừa (ngoại trừ 'kubernetes').
        Nhưng cẩn thận khi dùng, vì đây sẽ xóa tất cả Service và Deployment 
        không phải physics-server.
        """
        try:
            print("Starting cleanup of unused services...")
            services = self.core_v1.list_namespaced_service(namespace=self.namespace)

            for svc in services.items:
                if svc.metadata.name == "kubernetes":
                    continue
                
                svc_name = svc.metadata.name
                # Mặc định, Deployment name thường = svc_name.replace("-service","")
                deploy_name = svc_name.replace("-service", "")
                
                # Nếu service không phải physics-server-service thì xóa
                if svc_name != "physics-server-service":
                    print(f"\nCleaning up resources for {svc_name}")
                    try:
                        self.core_v1.delete_namespaced_service(
                            name=svc_name,
                            namespace=self.namespace
                        )
                        print(f"Deleted service: {svc_name}")

                        self.apps_v1.delete_namespaced_deployment(
                            name=deploy_name,
                            namespace=self.namespace
                        )
                        print(f"Deleted deployment: {deploy_name}")
                        
                        time.sleep(2)
                    except client.ApiException as e:
                        print(f"Error deleting {svc_name}: {e}")
                        continue

            print("\nCleanup completed!")

            print("\nRemaining services:")
            remaining_services = self.core_v1.list_namespaced_service(namespace=self.namespace)
            for svc in remaining_services.items:
                if svc.metadata.name != "kubernetes":
                    print(f"- {svc.metadata.name}")

        except client.ApiException as e:
            print(f"Error during cleanup: {e}")