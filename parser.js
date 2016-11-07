'use strict';

var ArgumentParser = require('argparse').ArgumentParser;

var parser = new ArgumentParser({
    version: '0.0.1',
    addHelp: true,
    description: 'anymocker usage'
});

parser.addArgument(
    ['-s', '--save'], {
        type: 'string',
        defaultValue: './save/',
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
        nargs: '*',
        help: 'mock value'
    }
);
parser.addArgument(
    ['-a', '--api'], {
        action: 'append',
        type: 'string',
        nargs: '*',
        help: 'specify url'
    }
);
parser.addArgument(
    ['-i', '--inject'], {
        action: 'append',
        type: 'string',
        nargs: '*',
        help: 'inject field'
    }
);
parser.addArgument(
    ['-d', '--delete'], {
        action: 'append',
        type: 'string',
        nargs: '*',
        help: 'delete field'
    }
);


var args = parser.parseArgs(),
    fields = ['mock', 'inject', 'delete'],
    mock_rules = {
        global: {},
        api: {}
    };

// 如果输入参数为 -a x -m x -a y -m y -i y
// 这时后面的-i y 会被挤到前面，所以在定义参数时要注意，把所有能写的规则，先写到前面
var parse = function() {
    if (args.api === null) {
        for (var field of fields) {
            if (args[field]) {
                mock_rules.global = mock_rules.global ? mock_rules.global : {}
                if (args[field].length > 1) {
                    console.log('规则指定错误: ' + field)
                    process.exit(-1);
                } else {
                    mock_rules.global[field] = args[field][0]
                }
            }
        }
    } else {
        for (var field of fields) {
            if (args[field]) {
                if (args[field].length - args.api.length > 1) {
                    console.log('规则指定错误: ' + field)
                    process.exit(-1);
                }
                for (var i in args.api) {
                    i = parseInt(i)
                    if (i === args[field].length) {
                        break;
                    }
                    for (var j of args.api[i]) {
                        mock_rules.api[j] = mock_rules.api[j] ? mock_rules.api[j] : {}
                        mock_rules.api[j][field] = args[field][i]
                    }
                    if (i === args.api.length - 1) {
                        // 到达api长度上限，如果args[field]还有多余的数据，全部置为global
                        if (args[field].length > i + 1) {
                            mock_rules.global[field] = args[field][i + 1]
                        }
                    }
                }
            }
        }
    }
    console.log(JSON.stringify(args, null, '  '))
    console.log('-------格式化后的规则----------')
    console.log(JSON.stringify(mock_rules, null, '  '))
    return mock_rules
};

module.exports = {
    parse : parse,
    args : args
}

