/**
 * Default settings
 */
 var os = require('os');

exports.helpOutputTemplate = 'Usage: node {{appPath}} start | stop | reload | restart | status | help \n';
exports.statusOutputTemplate = '{{appPath}} is {{runningStatus}}';


exports.workerNum = Math.max(os.cpus().length - 1, 1);

exports.autoRestore = true;