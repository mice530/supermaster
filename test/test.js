var cluster = require('../index'),
    conf = require('./conf');


cluster
    .setupMaster(conf)
    .on('start', function(status, settings){
        console.log('======= test start =========');
        console.log(status);
        console.log(settings);
        console.log('======= test end =========');
    })
    .run();