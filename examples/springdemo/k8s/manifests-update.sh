#!/bin/bash

export SRVC_IMAGE_NOCRAC="$(aws ecr describe-repositories --repository-name ${SRVC_NAME} --query 'repositories[0].repositoryUri' --output text)":"$(aws ecr describe-images --output text --repository-name $SRVC_NAME --query 'sort_by(imageDetails,& imagePushedAt)[-2].imageTags[0]')" # the order of build commands means the second last image is always the base
export SRVC_IMAGE="$(aws ecr describe-repositories --repository-name ${SRVC_NAME} --query 'repositories[0].repositoryUri' --output text)":"$(aws ecr describe-images --output text --repository-name $SRVC_NAME --query 'sort_by(imageDetails,& imagePushedAt)[-1].imageTags[0]')" # the order of build commands means the latest image is always the checkpoint
export SRVC_VERSION="$(aws ecr describe-images --output text --repository-name $SRVC_NAME --query 'sort_by(imageDetails,& imagePushedAt)[-2].imageTags[0]')"

sed -i '' "s|\$SRVC_IMAGE_NOCRAC|$SRVC_IMAGE_NOCRAC|" *.yaml
sed -i '' "s|\$SRVC_IMAGE|$SRVC_IMAGE|" *.yaml
sed -i '' "s|\$REGION|$AWS_REGION|" *.yaml
sed -i '' "s|\$EFS_ID|$EFS_ID|" *.yaml
sed -i '' "s|\$SRVC_JAR_FILENAME|$SRVC_JAR_FILENAME|" *.yaml
sed -i '' "s|\$SRVC_NAME|$SRVC_NAME|" *.yaml
sed -i '' "s|\$SRVC_VERSION|$SRVC_VERSION|" *.yaml
sed -i '' "s|\$CRAC_CHECKPOINTS_S3|$CRAC_CHECKPOINTS_S3|" *.yaml