#! /bin/bash

# pre-requisites
apt-get --assume-yes install siege -y
# start the application
echo Starting the application...
( echo 128 > /proc/sys/kernel/ns_last_pid ) 2>/dev/null || while [ $(cat /proc/sys/kernel/ns_last_pid) -lt 128 ]; do :; done;
nohup java -Dspring.profiles.active=prod -Dmode=ci -XX:CRaCCheckpointTo=/opt/crac-files -jar /${SRVC_JAR_FILE_NAME} &

# ensure the application started successfully
echo Confirming the application started successfully...
sleep 30
echo nohup.out

# warm up the application
echo Warming up the application...
siege -c 1 -r 10 -b http://localhost:8080/api/customers
sleep 10

# request a checkpoint
echo Taking a snapshot of the application using CRaC...
mkdir /opt/logs/
jcmd ${SRVC_JAR_FILE_NAME} JDK.checkpoint >> /opt/logs/snapshot.log

# the code below is to keep the container running indefinitely
echo Executing an infinite loop to keep the container running...
while true; do sleep 1; done