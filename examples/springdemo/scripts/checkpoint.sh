#! /bin/bash

# start the application
echo Starting the application...
( echo 128 > /proc/sys/kernel/ns_last_pid ) 2>/dev/null || while [ $(cat /proc/sys/kernel/ns_last_pid) -lt 128 ]; do :; done;
TABLE_NAME=springdemo-staging-customer
nohup java -Dspring.profiles.active=prod -Dtable.name=${TABLE_NAME} -Dmode=${MODE} -Damazon.dynamodb.endpoint=${AMAZON_DYNAMO_DB_ENDPOINT} -XX:CRaCEngine=warp -XX:CRaCCheckpointTo=/opt/crac-files -jar /${SRVC_JAR_FILE_NAME} &

# ensure the application started successfully
echo Confirming the application started successfully...
sleep 30
echo nohup.out

# warm up the application
echo Warming up the application...
curl http://localhost:8080/api/customers

# request a checkpoint
echo Taking a snapshot of the application using CRaC...
mkdir /opt/logs/
jcmd ${SRVC_JAR_FILE_NAME} JDK.checkpoint >> /opt/logs/snapshot.log
sleep 10

# Waiting till the checkpoint is captured correctly
i=0
while [[ $i -lt 10 ]]
do
  echo Waiting till the checkpoint is captured correctly...
  if ([ -f /opt/crac-files/core.img ])
  then
    echo Checkpoint captured!
    exit 0
    break
  fi
  sleep 10
  ((i++))
done

exit 1;