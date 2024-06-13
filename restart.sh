#!/bin/bash
## sleep in bash for loop ##
for i in {1..1000}
do
  pm2 restart all --update-env
  pm2 save
  echo 'Restart after 1500 minutes'
  sleep 1500m
done

# sleep 5m  --- sleep 10m --- sleep 1h --- sleep 1d --- sleep 1y
# Unix Command https://en.wikipedia.org/wiki/Sleep_(command)
#
# m = minutes
# h = hours
# d = days
# y = years
