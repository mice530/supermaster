var EventEmitter = require('events').EventEmitter,
    merge = require('utils-merge'),
    cluster = require('cluster'),
    defaults = require('./defaults'),
    consts = require('./consts');

// extends event emitter
merge(exports, EventEmitter.prototype);

/**
 * Logger, default to console
 * @property logger
 */
var logger = console;

var worker;

/**
 * Worker settings
 * @property settings
 */
var settings = exports.settings = merge( {}, defaults.worker || {} );

exports.suicide = function(){
    logger.info('[supermaster][worker][suicide] worker ' + worker.id + ' suicide');

    // response to master 
    // to create new worker for replacement
    process.send({
        CAACT: consts.MSG_SUICIDE
    });

    // close connections
    worker.disconnect(function(){
        logger.info('[supermaster][worker][suicide] worker ' + worker.id + ' all connections closed');
        // exit process after all connections closed
        // process.exit(0);
    });

    this.emit('suicide');
};

exports.setup = function(conf){
    merge( settings, conf );

    logger = settings.logger || logger;

    return this;  
};

exports.run = function(){
    if( !cluster.isWorker ){
        return;
    }

    var caWorker = this;

    worker = cluster.worker    

    // bind shutdown message
    process.on('message', function (msg) {
        if( msg.CAACT === consts.MSG_SHUTDOWN ){
            caWorker.suicide();
        }
    });
}