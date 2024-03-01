#!/bin/bash
SRVC_VERSION="$(aws ecr describe-images --output text --repository-name $SRVC_NAME --query 'sort_by(imageDetails,& imagePushedAt)[-2].imageTags[0]')"

sed -i '' "s|$SRVC_NAME:v[0-9]*|$SRVC_NAME:$SRVC_VERSION|" k8s/*.yaml
sed -i '' "s|$SRVC_NAME/v[0-9]*|$SRVC_NAME:$SRVC_VERSION|" k8s/*.yaml
