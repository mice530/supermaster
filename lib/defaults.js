/**
 * Default settings
 */
var os = require('os'),
    path = require('path');

exports.helpOutputTemplate = 'Usage: node {{appPath}} start | stop | reload | restart | status | help \n';
exports.statusOutputTemplate = '{{appPath}} is {{runningStatus}}';


exports.workerNum = Math.max(os.cpus().length - 1, 1);

exports.autoRestore = true;

exports.pidFile = path.dirname(process.argv[1]) + '/master.pid'