'use strict';

var ArgumentParser = require('argparse').ArgumentParser,
    jp = require('jsonpath'),
    fs = require('fs'),
    path = require('path'),
    proxy = require('anyproxy'),
    url = require('url'),
    lo = require('lodash'),
    beautify = require('js-beautify').js_beautify,
    mockjs = require('mockjs');

var parser = new ArgumentParser({
    version: '0.0.1',
    addHelp: true,
    description: 'fuzzy server usage'
});

parser.addArgument(
    ['-s', '--save'], {
        type: 'string',
        defaultValue: '.',
        help: 'file save path'
    }
);
parser.addArgument(
    ['-p', '--port'], {
        type: 'int',
        defaultValue: 8001,
        help: 'proxy port'
    }
);
parser.addArgument(
    ['-m', '--mock'], {
        action: 'append',
        type: 'string',
        help: 'mock value'
    }
);
parser.addArgument(
    ['-a', '--api'], {
        action: 'append',
        type: 'string',
        help: 'specify url'
    }
);
parser.addArgument(
    ['-i', '--inject'], {
        action: 'append',
        type: 'string',
        help: 'inject field'
    }
);
parser.addArgument(
    ['-d', '--delete'], {
        action: 'append',
        type: 'string',
        help: 'delete field'
    }
);


var args = parser.parseArgs(),
    api_index = 0;
console.log(args)


var record_data = function(req, serverResData) {
    api_index += 1
    var fileSavePath = path.resolve(args.save),
        reqFile = path.join(fileSavePath, api_index + 'requestData.txt'),
        respFile = path.join(fileSavePath, api_index + 'responseData.txt'),
        reqData
    if (/http/.test(req.url)) {
        reqData = url.parse(req.url)
    } else {
        reqData = url.parse('https://' + req.headers.host + req.url)
    }

    fs.appendFile(reqFile, beautify(JSON.stringify(reqData), {
        indent_size: 4
    }), function(err, data) {
        if (err) {
            return console.error(err);
        }
    });

    fs.appendFile(respFile, beautify(unescape(serverResData.toString().replace(/\\u/g, '%u')), {
        indent_size: 4
    }), function(err, data) {
        if (err) {
            return console.error(err);
        }
    });
};

var gen_mock = function(mockResData, mock_fields, inject_fields, delete_fields) {
    mockResData = JSON.parse(mockResData.toString('utf-8'))
    console.log(mock_fields)
    console.log(inject_fields)
    console.log(delete_fields)
    console.log('--------------原始值-----------------')
    console.log(mockResData)
    for (var mock_field of mock_fields) {
        var seperate_index = mock_field.indexOf('='),
            key = mock_field.substring(0, seperate_index),
            mock_value = mock_field.substring(seperate_index + 1);
        jp.apply(mockResData, key, function(value) {
            return mock_value;
        });
    }
    for (var inject_field of inject_fields) {
        var seperate_index = inject_field.indexOf('='),
            key = inject_field.substring(0, seperate_index),
            mock_value = inject_field.substring(seperate_index + 1);
        jp.value(mockResData, key, mock_value)
    }

    for (var delete_field of delete_fields) {
        var paths = jp.paths(mockResData, delete_field)
        for (var path of paths) {
            path.shift()
            lo.unset(mockResData, path)
        }
    }
    console.log('--------------mock值-----------------')
    console.log(mockResData)
    return mockResData
}


var fuzzy_rule = {
    summary: function() {
        return 'mock server working...'
    },

    shouldInterceptHttpsReq: function(req) {
        // switch https on 
        return true
    },

    replaceServerResDataAsync: function(req, res, serverResData, callback) {
        if (/json/i.test(res.headers['content-type'])) {
            var mockResData = serverResData,
                mock_fields = args.mock ? args.mock : [],
                inject_fields = args.inject ? args.inject : [],
                delete_fields = args.delete ? args.delete : [];

            if (args.api === null) {
                // callback(serverResData)
                console.log('指定了规则，但是没有指定api，暴力mock')
                if (serverResData.toString() != '') {
                    try {
                        record_data(req, serverResData)
                        mockResData = gen_mock(mockResData, mock_fields, inject_fields, delete_fields)
                        callback(JSON.stringify(mockResData))
                    } catch (e) {
                        console.log('mock出现错误，返回原始数据')
                        callback(serverResData)
                    }
                }
            } else {
                console.log('指定了规则，也指定了api')
                var find_flag = false
                for (var api of args.api) {
                    console.log(req.url);
                    if (req.url.indexOf(api) != -1) {
                        find_flag = true
                        break
                    }
                }
                if (find_flag && serverResData.toString() != '') {
                    try {
                        record_data(req, serverResData)
                        console.log('指定的api命中！！！ 返回mock数据')
                        mockResData = gen_mock(mockResData, mock_fields, inject_fields, delete_fields)
                        callback(JSON.stringify(mockResData))
                    } catch (e) {
                        console.log('mock出现错误，返回原始数据')
                        callback(serverResData)
                    }
                } else {
                    console.log('指定的api没有命中，返回原始数据')
                    callback(serverResData)
                }
            }
        } else {
            callback(serverResData);
        }
    }
}

var options = {
    rule: fuzzy_rule,
    // disableWebInterface: true,
    port: args.port
        // silent: true
}
if (args.mock === null && args.inject === null && args.delete === null) {
    delete options.rule
    console.log('没有指定规则，返回原始response...')
}

new proxy.proxyServer(options)