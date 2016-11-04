#!/usr/bin/env node

'use strict';

var proxy = require('anyproxy'),
    parser = require('./parser');


var options = {};

if (parser.args.mock === null && parser.args.inject === null && parser.args.delete === null) {
    options.port = parser.args.port
    console.log('没有指定规则，返回原始response...')
}else {
    options.port = parser.args.port
    var rule = require('./rule')
    options.rule = rule
}

new proxy.proxyServer(options)