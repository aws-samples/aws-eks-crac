#! /bin/bash
# Waiting till the checkpoint is captured correctly
while true
do 
    echo Waiting till the checkpoint is captured correctly...
    if ([ -f /opt/crac-files/dump4.log ]) && (grep -Fq "Dumping finished successfully" "/opt/crac-files/dump4.log")
    then
	    echo Checkpoint captured!
	    break
    fi
    sleep 5
done