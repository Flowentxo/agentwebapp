#!/bin/bash

# ============================================
# Brain AI - Deployment Script
# ============================================
# Usage: ./scripts/deploy.sh [staging|production]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
NAMESPACE="brain-ai"
DOCKER_REGISTRY="yourdockerusername"
APP_NAME="brain-ai"

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Brain AI Deployment Script${NC}"
echo -e "${GREEN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}============================================${NC}"

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo -e "${RED}Error: Environment must be 'staging' or 'production'${NC}"
    exit 1
fi

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"
command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker is required but not installed${NC}"; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo -e "${RED}kubectl is required but not installed${NC}"; exit 1; }
echo -e "${GREEN}✓ Prerequisites satisfied${NC}"

# Get current git commit hash
GIT_COMMIT=$(git rev-parse --short HEAD)
IMAGE_TAG="${ENVIRONMENT}-${GIT_COMMIT}"

echo -e "${YELLOW}Building Docker image...${NC}"
docker build \
    -t ${DOCKER_REGISTRY}/${APP_NAME}:${IMAGE_TAG} \
    -t ${DOCKER_REGISTRY}/${APP_NAME}:${ENVIRONMENT}-latest \
    -f docker/Dockerfile \
    .

echo -e "${GREEN}✓ Docker image built${NC}"

# Push to registry
echo -e "${YELLOW}Pushing to Docker registry...${NC}"
docker push ${DOCKER_REGISTRY}/${APP_NAME}:${IMAGE_TAG}
docker push ${DOCKER_REGISTRY}/${APP_NAME}:${ENVIRONMENT}-latest
echo -e "${GREEN}✓ Image pushed to registry${NC}"

# Apply Kubernetes configurations
echo -e "${YELLOW}Applying Kubernetes configurations...${NC}"

# Create namespace if it doesn't exist
kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

# Apply ConfigMap and Secrets
kubectl apply -f k8s/configmap.yaml
echo -e "${YELLOW}⚠ Make sure secrets are created manually or via CI/CD${NC}"

# Apply database and Redis
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/redis-deployment.yaml

# Wait for database and Redis to be ready
echo -e "${YELLOW}Waiting for database and Redis to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=postgres -n ${NAMESPACE} --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n ${NAMESPACE} --timeout=300s
echo -e "${GREEN}✓ Database and Redis ready${NC}"

# Deploy application
if [[ "$ENVIRONMENT" == "production" ]]; then
    # Blue-Green deployment for production
    echo -e "${YELLOW}Deploying with Blue-Green strategy...${NC}"

    # Update green deployment
    kubectl set image deployment/brain-ai-green \
        brain-ai=${DOCKER_REGISTRY}/${APP_NAME}:${IMAGE_TAG} \
        -n ${NAMESPACE}

    # Wait for green deployment to be ready
    kubectl rollout status deployment/brain-ai-green -n ${NAMESPACE}

    # Run smoke tests
    echo -e "${YELLOW}Running smoke tests on green deployment...${NC}"
    # Add your smoke tests here

    # Switch service to green
    kubectl patch service brain-ai -n ${NAMESPACE} \
        -p '{"spec":{"selector":{"version":"green"}}}'

    echo -e "${GREEN}✓ Traffic switched to green deployment${NC}"

    # Wait and update blue
    sleep 10
    kubectl set image deployment/brain-ai-blue \
        brain-ai=${DOCKER_REGISTRY}/${APP_NAME}:${IMAGE_TAG} \
        -n ${NAMESPACE}

else
    # Rolling update for staging
    echo -e "${YELLOW}Deploying with rolling update...${NC}"
    kubectl apply -f k8s/app-deployment.yaml
    kubectl rollout status deployment/brain-ai-blue -n ${NAMESPACE}
fi

echo -e "${GREEN}✓ Application deployed successfully${NC}"

# Display deployment info
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Deployment Summary${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e "Environment: ${ENVIRONMENT}"
echo -e "Image: ${DOCKER_REGISTRY}/${APP_NAME}:${IMAGE_TAG}"
echo -e "Git Commit: ${GIT_COMMIT}"
echo ""
echo -e "${YELLOW}Check deployment status:${NC}"
echo "kubectl get pods -n ${NAMESPACE}"
echo "kubectl get svc -n ${NAMESPACE}"
echo ""
echo -e "${YELLOW}View logs:${NC}"
echo "kubectl logs -f deployment/brain-ai-blue -n ${NAMESPACE}"
echo ""
echo -e "${YELLOW}Access application:${NC}"
echo "kubectl port-forward svc/brain-ai 3000:80 -n ${NAMESPACE}"
echo -e "${GREEN}============================================${NC}"
