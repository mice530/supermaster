var http = require('http'),
    supermaster = require('../index').worker;

// init supermaster for worker
supermaster.setup({}).run();

var server = http.createServer(function(req, res){
    res.end('6');
});

server.listen(8000);