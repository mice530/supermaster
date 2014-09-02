/**
 * Default settings
 */
var os = require('os'),
    path = require('path');

// usage template
exports.helpOutputTemplate = 'Usage: node {{appPath}} start | stop | reload | restart | status | help \n';

// cmd status template
exports.statusOutputTemplate = '{{appPath}} is {{runningStatus}}';

// usually fork cpuNum - 1 workers to make the best use of cpu resoureces
// leave 1 cpu core for master process
// and make sure at least 1 worker
exports.workerNum = Math.max(os.cpus().length - 1, 1);

// auto restore worker when some work died
exports.autoRestore = true;

// pid file for master process detection
exports.pidFile = path.dirname(process.argv[1]) + '/master.pid'

// default conf for worker
exports.worker = {};