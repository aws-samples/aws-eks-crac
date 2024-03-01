#!/bin/bash
SPRINGDEMO_INTEGRATION_BUILD_ARN=$(aws cloudformation describe-stacks --stack-name SpringDemoInfra --query "Stacks[0].Outputs[?OutputKey=='SpringDemoIntegrationBuildRole'].OutputValue" --output text)
sed -i '' "s|INSERT_INTEGRATION_ROLE_ARN|$SPRINGDEMO_INTEGRATION_BUILD_ARN|" buildspec.yml
sed -i '' "s|INSERT_SRVC_JAR_FILENAME|${SRVC_JAR_FILENAME}|" buildspec.yml