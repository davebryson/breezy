#!/bin/bash

#export TM_LOG='true'
export TM_BINARY=`which tendermint`
export DEBUG=breezy

node example/app.js