#!/bin/bash
## sleep in bash for loop ##
for i in {1..1000}
do
  pm2 restart all
  echo 'Restart After 1 Hour of activity'
  sleep 1h
done

# sleep 5m  --- sleep 10m --- sleep 1h --- sleep 1d --- sleep 1y
# Unix Command https://en.wikipedia.org/wiki/Sleep_(command)
#
# m = minutes
# h = hours
# d = days
# y = years

