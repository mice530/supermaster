var cluster = require('cluster'),
    merge = require('utils-merge'),
    fs = require('fs'),
    EventEmitter = require('events').EventEmitter,
    defaults = require('./defaults'),
    helpers = require('./helpers'),
    consts = require('./consts');



// extends event emitter
merge(exports, EventEmitter.prototype);

/**
 * Cluster settings
 * @property settings
 */
var settings = exports.settings = merge( merge({}, cluster.settings), defaults );

/**
 * Cluster stauts
 * @property stauts
 * @private
 */
var status = {
    state: consts.MASTER_STATE_INIT,
    workerNum: 0,
    workers: {}
};

/**
 * Logger, default to console
 * @property logger
 */
var logger = console;

/**
 * Exit cluster
 * @method exit
 */
exports.exit = function(){
    logger.info('[supermaster][exit] exit master');

    status.state = consts.MASTER_STATE_CLOSE;

    // TODO
    // close all workers

    // TODO
    // exit master on all workers exit
    process.exit.apply(process, arguments);
};


/**
 *
 * Command Part
 *
 */

/**
 * Run supermaster
 * Usage: node app.js start | stop | reload | restart | status | help.
 * @method run
 */
exports.run = function(){    
    var argv = process.argv,
        action = argv[2],
        stdout = process.stdout;

    logger.info('[supermaster][run] run cmd ' + action);

    // take first arg after node & script path
    switch( action ){
        case 'start':
            this.cmdStart(argv);
            break;
        case 'stop':
            this.cmdStop(argv);
            break;
        case 'reload':
            this.cmdReload(argv);
            break;
        case 'restart':
            this.cmdRestart(argv);
            break;
        case 'status':
            this.cmdStatus(argv);
            break;
        default:
            this.cmdHelp(argv);
            break;
    }
};

/**
 * Start server
 * @method start
 */
exports.cmdStart = function(argv){
    logger.info('[supermaster][cmdStart] cmd start');

    if(this.isRunning()){
        logger.warn('[supermaster][cmdStart] master already running');
        return false;
    }

    this.start(argv);

    logger.info('[supermaster][cmdStart] master started');

    return this;
};

exports.cmdStop = function(argv){ 
    logger.info('[supermaster][cmdStart] cmd stop');

    if( !this.isRunning() ){
        logger.warn('[supermaster][stop] master not running');
        return;
    }

    var pid = this.getPid();

    // TODO
    // Dig into LINUX SIGNAL
    if( helpers.killProcess(pid, 'SIGTERM') ){
        logger.warn('[supermaster][cmdStop] error occurs when kill master process ' + pid + ', ' + err.message);
        return false;
    }

    logger.warn('[supermaster][cmdStop] master stopped');
};

exports.cmdRestart = function(argv){
    logger.info('[supermaster][cmdStart] cmd restart');

    if( !this.isRunning() ){
        logger.warn('[supermaster][cmdRestart] master not running');
        
        this.start(argv);

        return;
    }

    this.cmdStop(argv);
    
    var cluster = this,
        count = 0;

    var timer = setInterval(function(){
        if( cluster.isRunning() ){
            // limited retry
            if( ++ count > 10 ) {
                clearInterval(timer);

                logger.error('[supermaster][cmdRestart] last master process not reponding to kill signal, restart failed');
            }

            return;
        }

        clearInterval(timer);

        cluster.start(argv);

        logger.warn('[supermaster][cmdRestart] master restarted');
    }, 20)
};

exports.cmdReload = function(argv){
    logger.info('[supermaster][cmdReload] cmd reload');

    if( !this.isRunning() ){
        logger.error('[supermaster][cmdReload] master not running');
        return false;
    }

    // use SIGUSR2 as reload signal
    // SIGUSR1 has been occupied for node debugging
    // @see http://nodejs.org/api/process.html#process_signal_events
    var err;
    if( err = helpers.killProcess(this.getPid(), 'SIGUSR2') ){
        logger.error('[supermaster][cmdReload] occurs when sending reload signal to master, ' + err.message);

        // TODO
        // expose error to shell
    } else {        
        // TODO
        // how to check real reload state
        // not all workers reloaded here
        // only reload signal sent
        logger.warn('[supermaster][cmdReload] master reloaded');
    }
};

exports.cmdStatus = function(argv){
    // TODO
    // what to show?
    var tmpl = settings.statusOutputTemplate;

    helpers.writeStdout(settings.statusOutputTemplate, {
        runningStatus: this.isRunning() ? 'running' : 'not running'
    });
};

exports.cmdHelp = function(argv){
    helpers.writeStdout(settings.helpOutputTemplate, {
        runningStatus: this.isRunning() ? 'running' : 'not running',
        appPath: process.argv[1]
    });
};

exports.isRunning = function(){
    var pid = this.getPid();

    if(!/^\d+$/.test(pid)){
        return false;
    }

    // test existence of master process
    return !helpers.killProcess(pid, 0);    
};

exports.getPid = function(){
    try {
        return fs.readFileSync(settings.pidFile).toString();
    } catch(err){
        return null;
    }    
};

/**
 *
 * Master Process
 *
 */

/**
 * Do settings
 * @method setupMaster
 */
exports.setupMaster = function(conf){
    cluster.setupMaster.apply(cluster, arguments);

    // update settings to supermaster
    settings = this.settings = merge(settings, conf, cluster.settings);

    // update logger
    logger = settings.logger || console;

    // init stateus
    stateus = {
        state: consts.MASTER_STATE_RUNNING        
    };

    /**
     * Fires when setup master configs
     * @event setup
     */
    this.emit('setup', settings);

    return this;
};

exports.start = function(){
    logger.info('[supermaster][start] start cluster');

    this.status = status;

    // record pid
    this.writePidFile();

    // add event listeners
    this.addListeners();

    // create workers
    this.resize();    

    // TODO
    // worker monitor & garbage recollection
    // TODO
    // refresh long run worker

    this.emit('start', status, settings);

    logger.info('[supermaster][start] cluster started');
};

exports.addListeners = function(){
    logger.info('[supermaster][addListeners] add listeners to process & cluster events & signals');

    var supermaster = this;    

    // bindings for master events       
    masterEvents.forEach(function(sigArg){
        process.on(sigArg[0], function(){
            // assign context
            supermaster[sigArg[1]].apply(supermaster, arguments);
        });
    });

    // bindings for cluster events
    clusterEvents.forEach(function(sigArg){
        cluster.on(sigArg[0], function(){
            // assign context
            supermaster[sigArg[1]].apply(supermaster, arguments);
        });
    });

    logger.info('[supermaster][addListeners] listeners bound');
};

/**
 * Resize cluster size ( worker process number )
 * @method resize
 */
exports.resize = function(scale){
    scale = scale || settings.workerNum;

    var oScale = status.workerNum,
        gap = scale - oScale;

    logger.info('[supermaster][resize] resize worker num from ' + status.workerNum + ' to ' + scale);

    // if the same, do nothing
    if( gap === 0 ){
        return this;
    }

    gap > 0 ? this.fork(gap) : this.kill(-gap);

    logger.info('[supermaster][resize] workers resized');
};

exports.kill = function(num){
    logger.info('[supermaster][kill] kill ' + num + ' workers');

    var workers = status.workers,
        err;
    
    Object.keys(workers).forEach(function(id){        
        if( workers[id] && num > 0){
            logger.info('[supermaster][kill] kill worker ' + id);

            var worker = workers[id].ref;

            worker.send({
                CAACT: consts.MSG_SHUTDOWN
            });

            workers[id].state = consts.WORKER_STATE_CLOSE;

            num--;
        }
    });
};

exports.killall = function(){
    logger.info('[supermaster][killall] kill all workers, worker num ' + status.workerNum + ' for now');

    return this.kill(status.workerNum);
};

exports.fork = function(num){
    logger.info('[supermaster][fork] fork ' + num + ' workers');

    var workers = status.workers = status.workers || {},
        worker;

    // if num undefined, fork 1 worker
    for(num = num || 1; num > 0; num--){
        worker = cluster.fork();

        workers[worker.id] = {
            state: consts.WORKER_STATE_INIT,
            ref: worker
        }

        status.workerNum++;
    }
};

exports.reload = function(){
    logger.info('[supermaster][reload] reload workers');

    this.killall();

    this.fork(settings.workerNum);

    logger.info('[supermaster][reload] workers reloaded');
};

exports.writePidFile = function(){
    try {
        fs.writeFileSync(settings.pidFile, process.pid);

        logger.info('[supermaster][writePidFile] update pid file, pid: ' + process.pid);
    } catch(err){
        // log pid file error
        // but it's ok for cluster to run
        logger.warn('[supermaster][start] error occurs when writting master pid file, pid ' + process.pid + ', pid file path' + settings.pidFile);
    }
};

exports.removePidFile = function(){
    if(fs.existsSync(settings.pidFile)){
        fs.unlinkSync(settings.pidFile);
    }    
};


/**
 *
 * Process Signal & Events Listeners
 *
 */

/**
 * Master events & signals to be concerned and the names of their listeners
 * @property masterEvents
 */
var masterEvents = [
    ['exit', 'onMasterExit'],
    ['uncaughtException', 'onUncaughtException'],    
    ['SIGINT', 'onSIGINT'],    
    ['SIGHUP', 'onSIGHUP'],
    ['SIGTERM', 'onSIGTERM'],
    ['SIGUSR2', 'onSIGUSR2']
];

/**
 * Invoke when 'exit' event is emitted
 * @method onExit
 */
exports.onMasterExit = function(code){
    logger.warn('[supermaster][onExit] master process exited with code ' + code);

    this.removePidFile();

    this.emit('exit', code);
};

/**
 * Invoke when 'uncaughtException' event is emitted
 * @method onUncaughtException
 */
exports.onUncaughtException = function(err){
    logger.warn('[supermaster][onUncaughtException] uncaught exception occurs, ' + err.message);

    logger.log(err.stack);

    this.emit('uncaughtException', err);
};

/**
 * Invoke when 'SIGINT' signal received
 * @method onSIGINT
 */
exports.onSIGINT = function(){
    logger.warn('[supermaster][onSIGINT] SIGINT received');

    this.emit('SIGINT');

    // TODO
    // how to stop on false?
    this.exit(0);
};

/**
 * Invoke when 'SIGHUP' signal received
 * @method onSIGHUP
 */
exports.onSIGHUP = function(code){
    logger.warn('[supermaster][onSIGHUP] SIGINT received');

    this.emit('SIGHUP');
};

/**
 * Invoke when 'SIGTERM' signal received
 * @method onSIGINT
 */
exports.onSIGTERM = function(code){
    logger.warn('[supermaster][onSIGTERM] SIGINT received');

    this.emit('SIGTERM');

    // TODO
    // how to stop on false?
    this.exit(0);
};

/**
 * Invoke when 'SIGUSR2' signal received
 * @method onSIGUSR2
 */
exports.onSIGUSR2 = function(code){
    logger.warn('[supermaster][onSIGUSR2] SIGUSR2 received');

    this.emit('SIGUSR2');

    // TODO
    // how to stop on false?
    this.reload();
};

/**
 * Cluster events to be concerned and the names of their listeners
 * @property clusterEvents
 */

/**
 * Original cluster events & signals to be concerned and the names of their listeners
 * @property masterEvents
 */
var clusterEvents = [    
    ['fork', 'onFork'],
    ['online', 'onOnline'],
    ['listening', 'onListening'],
    ['disconnect', 'onDisconnect'],    
    ['exit', 'onWorkerExit']
];

/**
 * Invoke when a new worker forked
 * @method onFork
 */
 exports.onFork = function(worker){
    logger.warn('[supermaster][onFork] worker ' + worker.id + ' forked');

    status.workers[worker.id].state = consts.WORKER_STATE_CREATED;

    this.emit('fork', worker);
};

/**
 * Invoke when a new worker online
 * @method onOnline
 */
 exports.onOnline = function(worker){
    logger.warn('[supermaster][onOnline] worker ' + worker.id + ' online');

    status.workers[worker.id].state = consts.WORKER_STATE_ONLINE;

    this.emit('online', worker);
};

/**
 * Invoke when a worker listening ( to TCP/UDP/Socket )
 * @method onListening
 */
 exports.onListening = function(worker, address){
    logger.warn('[supermaster][onOnline] worker ' + worker.id + ' listening');

    status.workers[worker.id].state = consts.WORKER_STATE_LISTENING;

    this.emit('listening', worker, address);
};

/**
 * Invoke when a worker disconnected
 * @method onDisconnect
 */
 exports.onDisconnect = function(worker){
    logger.warn('[supermaster][onOnline] worker ' + worker.id + ' disconnected');

    // worker may exit before disconnection
    status.workers[worker.id] && (status.workers[worker.id].state = consts.WORKER_STATE_DISCONNECT);

    // restore worker
    settings.autoRestore && status.state === consts.MASTER_STATE_CLOSE && this.resize();

    this.emit('disconnect', worker);
};

/**
 * Invoke when a worker exit
 * @method onWorkerExit
 */
exports.onWorkerExit = function(worker, code, signal){
    if( signal ){
        logger.warn('[supermaster][onWorkerExit] worker ' + worker.id + ' exited with signal ' + signal);
    } else if( code !== 0 ){
        logger.warn('[supermaster][onWorkerExit] worker ' + worker.id + ' exited with code ' + code);

        this.emit('workerExitWithError', worker, code, signal);
    } else {
        logger.warn('[supermaster][onWorkerExit] worker ' + worker.id + ' suicided');

        this.emit('workerSuicide', worker, code, signal);
    }

    delete status.workers[worker.id];
    
    this.emit('workerExit', worker, code, signal);
};