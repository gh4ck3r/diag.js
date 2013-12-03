#!/bin/bash

DIR_ROOT=$(dirname $BASH_SOURCE)

NODE_BIN=$DIR_ROOT/node.js/bin/node

SERVER_SCRIPT=DiagZillaServer.js

export NODE_ENV=production
$NODE_BIN $SERVER_SCRIPT
