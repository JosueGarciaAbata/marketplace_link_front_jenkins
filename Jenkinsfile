pipeline {
    agent any

    environment {
        // Imagen Docker del frontend
        DOCKER_IMAGE_TAG = "marketplace-front"
        DOCKER_IMAGE_FILE = "Dockerfile-marketplace"

        // Contenedor donde correrá el frontend
        CONTAINER_NAME = "marketplace_front"

        // Red Docker donde está backend y BD
        DOCKER_NETWORK = "mplink_net"

        // URL hacia el backend
        VITE_API_URL = "http://localhost:8090"
    }

    stages {

        stage('Build Docker Image') {
            steps {
                echo "Construyendo imagen del frontend..."

                sh "docker build --build-arg VITE_API_URL=${VITE_API_URL} -t ${DOCKER_IMAGE_TAG} -f ${DOCKER_IMAGE_FILE} ."
            }
        }

        stage('Deploy Frontend Container') {
            steps {
                echo "Eliminando contenedor anterior si existe..."
                sh "docker rm -f ${CONTAINER_NAME} || true"

                echo "Iniciando nuevo contenedor del frontend..."

                sh """
                docker run -d \
                  --name ${CONTAINER_NAME} \
                  --network ${DOCKER_NETWORK} \
                  -p 80:80 \
                  ${DOCKER_IMAGE_TAG}
                """
            }
        }
    }
}
