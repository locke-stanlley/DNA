#!/usr/bin/env bash
set -euo pipefail

echo "Stopping all running dnaNode instances..."
killall dnaNode || true
sleep 2

echo "Cleaning up Chain DB directories..."
rm -rf node1/Chain node2/Chain node3/Chain node4/Chain
rm -f node1/node.log node2/node.log node3/node.log node4/node.log bootstrap.log

echo "Copying updated dnaNode binary to node directories..."
cp dnaNode node1/
cp dnaNode node2/
cp dnaNode node3/
cp dnaNode node4/

echo "Starting bootstrap server..."
nohup ./dnaNode bootstrap server --listen 0.0.0.0:8090 --seeds 127.0.0.1:20338,127.0.0.1:20438,127.0.0.1:20538,127.0.0.1:20638 > bootstrap.log 2>&1 &
sleep 2

echo "Starting Node 1..."
cd node1
nohup ./dnaNode --config config.json --data-dir Chain --wallet wallet.dat --nodeport 20338 --rpcport 20336 --restport 20334 --wsport 20335 --rest --ws --password 123456 --enable-consensus > node.log 2>&1 &
cd ..
sleep 1

echo "Starting Node 2..."
cd node2
nohup ./dnaNode --config config.json --data-dir Chain --wallet wallet.dat --nodeport 20438 --rpcport 20436 --restport 20434 --wsport 20435 --password 123456 --enable-consensus > node.log 2>&1 &
cd ..
sleep 1

echo "Starting Node 3..."
cd node3
nohup ./dnaNode --config config.json --data-dir Chain --wallet wallet.dat --nodeport 20538 --rpcport 20536 --restport 20534 --wsport 20535 --password 123456 --enable-consensus > node.log 2>&1 &
cd ..
sleep 1

echo "Starting Node 4..."
cd node4
nohup ./dnaNode --config config.json --data-dir Chain --wallet wallet.dat --nodeport 20638 --rpcport 20636 --restport 20634 --wsport 20635 --password 123456 --enable-consensus > node.log 2>&1 &
cd ..
sleep 2

echo "All nodes started. Tailing node 1 log to keep process alive..."
exec tail -f node1/node.log
