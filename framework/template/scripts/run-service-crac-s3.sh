#! /bin/bash
echo 'Start time (before checkpoint files download from S3: '$(date +"%T.%3N")
mkdir ${CRAC_CHECKPOINT_PATH}
aws s3 sync s3://${CRAC_CHECKPOINT_S3} ${CRAC_CHECKPOINT_PATH}

source /opt/scripts/run-service-crac.sh