#! /bin/bash

# create directory if it doesn't exist
mkdir -p /opt/crac-files/

# delete old snapshot files
rm -rf /opt/crac-files/*
echo Starting the application...
( echo 128 > /proc/sys/kernel/ns_last_pid ) 2>/dev/null || while [ $(cat /proc/sys/kernel/ns_last_pid) -lt 128 ]; do :; done;
java -Dspring.context.checkpoint=onRefresh -Dspring.profiles.active=prod -Dmode=${MODE} -Damazon.dynamodb.endpoint=${AMAZON_DYNAMO_DB_ENDPOINT} -Djdk.crac.collect-fd-stacktraces=true -XX:CRaCCheckpointTo=/opt/crac-files/ -jar /${SRVC_JAR_FILE_NAME}

EXIT_CODE=$?

# Error code 137 is expected, because process if killed
if [ $EXIT_CODE -eq 137 ] 
then
# let's check if there are snapshot files
   if [ -z "$(ls -A /opt/crac-files/)" ]
   then
      echo "Directory is empty, exiting with -1"
      exit -1
    fi
fi

exit 0