'use strict';

var tools = require('./tools'),
    record_data = require('./record'),
    gen = require('./gen'),
    parser = require('./parser'),
    rule = require('./rule');

var mock_rules = parser.parse()
var rule = {
    summary: function() {
        return 'mock server working...'
    },

    shouldInterceptHttpsReq: function(req) {
        // switch https on 
        return true
    },

    replaceServerResDataAsync: function(req, res, serverResData, callback) {
        if (/json/i.test(res.headers['content-type']) && serverResData.toString() != '') {
            try {
            var mockResData = JSON.parse(serverResData.toString('utf-8')),
                global_mock_flag = false;
            }catch (e) {
                console.log('原始数据解析时错误，直接返回');
                callback(serverResData)
            }
            // 进入这里的，满足以下几个条件：
            // 1.肯定有规则，不是global的就是api的，或者两者都有
            // 2.原始response肯定是json，并且不为空

            // 只要global的规则不为空，就首先进行global的mock
            if (!tools.isEmpty(mock_rules.global)) {
                console.log('指定了规则，有全局规则，进行全局mock');
                record_data(req, serverResData)
                mockResData = gen.gen_mock(mockResData, mock_rules.global)
                global_mock_flag = true
            }

            if (!tools.isEmpty(mock_rules.api)) {
                // 指定了api
                var find_flag = false,
                    api_index;
                for (api_index in mock_rules.api) {
                    if (req.url.indexOf(api_index) != -1) {
                        console.log('命中api')
                        console.log(req.url)
                        find_flag = true
                        break
                    }
                }
                if (find_flag) {
                    console.log('指定的api命中!!返回mock数据')
                    if (!global_mock_flag) {
                        record_data(req, serverResData)
                    }
                    mockResData = gen.gen_mock(mockResData, mock_rules.api[api_index])
                } else {
                    console.log('指定的api没有命中，返回原始数据')
                }
            } else {
                console.log('api 未指定');
            }
            callback(JSON.stringify(mockResData))
        } else {
            callback(serverResData)
        }
    }
}


module.exports = rule