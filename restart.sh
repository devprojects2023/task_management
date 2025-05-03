#!/bin/bash


echo "Stopping existing containers..."
docker rm -f task-NodeJS

echo "remove all images"
docker system prune --all -a -f

echo "Building new image..."
docker build -t gc .

docker network create devops-network

echo "Starting containers with new configuration..."
docker compose -f docker-compose-local.yml up -d 

echo "Waiting for services to start..."
sleep 1

echo "Checking container status:"
docker ps -a

echo "Viewing recent logs:"
docker logs tasks-NodeJS --tail 20 

echo "Services restarted. You can view more logs with: docker logs tasks-NodeJS -f" 
