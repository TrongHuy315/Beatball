#!/bin/bash

# Build and push game server image
docker build -t beatball-game:latest .
docker push beatball-game:latest

# Apply K8s configs
kubectl apply -f kubernetes/game-namespace.yaml
kubectl apply -f kubernetes/redis-deployment.yaml
kubectl apply -f kubernetes/game-deployment.yaml
kubectl apply -f kubernetes/network-policy.yaml

# Verify deployment
kubectl get pods -n beatball-game