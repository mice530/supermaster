var cluster = require('cluster'),
    merge = require('utils-merge'),
    fs = require('fs'),
    EventEmitter = require('events').EventEmitter;

var RUNNING = 1;

// extends event emitter
merge(exports, EventEmitter.prototype);

// ### worker process control ###

/**
 * Entrance to cluster 
 * @method setupMaster
 */
exports.setupMaster = function(conf){
    cluster.setupMaster.apply(cluster, arguments);

    // update settings to clusterA
    settings = exports.settings = cluster.settings;

    // setup logger
    conf.logger && ( logger = conf.logger );

    return exports;
};

/**
 * Cluster settings
 * @property settings
 */
var settings = exports.settings = cluster.settings;

/**
 * Cluster stauts
 * @property stauts
 * @private
 */
var stauts = {};

/**
 * Logger, default to console
 * @property logger
 */
logger = console;

/**
 * Resize cluster size ( worker process number )
 * @method resize
 */
exports.resize = function(n){

};


// ### master process control ###
/**
 * Run clusterA
 * Usage: node app.js start | stop | reload | restart | status | help.
 * @method run
 */
exports.run = function(){    
    
};

/**
 * Start server
 * @method start
 */
exports.start = function(){    
	if( status.STATE === RUNNING ){
        logger.warn('[clusterA][run] master already running');
        return;
    }

    // create workers
    this.resize();

    this.emit('start', status, settings);

    return exports;
};

exports.shutdown = function(){
    var pid = exports.getMasterPid();

    if(!pid){
        logger.warn('[clusterA][shutdown] master not running');
        return false;
    }

    // TODO
    // Dig into LINUX SIGNAL
    try {
        process.kill(pid, 'SIGTERM');

        fs.unlink(settings.masterPidFile, function(err){
            if(err){
                logger.warn('[clusterA][shutdown] error occurs when remove pid file (' + settings.masterPidFile + '), ' + err.message);
                return;
            }
        });
    } catch(err){
        logger.warn('[clusterA][shutdown] error occurs when kill master process ' + pid + ', ' + err.message);
    }

    logger.notice('[clusterA][shutdown] error occurs when kill master process ' + pid + ', ' + err.message);
};

exports.restart = function(){

};

exports.reload = function(){

};

exports.status = function(){

};

exports.getMasterPid = function(){
    settings.masterPidFile
};