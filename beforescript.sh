#!/bin/bash
CURRENT=`pwd`
PROJECT_NAME=${PWD##*/}
PROJECT_DIR="$PROJECT_NAME"
CONTAINER=$PROJECT_NAME-NodeJS
SSHREPOURL=git@gitlab.com:nodejs2483017/$PROJECT_NAME.git

if [ -d "$PROJECT_DIR" ]; then
   echo "'$DIR' found and updating repository " && cd $PROJECT_DIR && git stash &&  git pull origin main
else
   echo "creating new project" && git clone $SSHREPOURL
fi
