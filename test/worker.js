var http = require('http'),
    clusterA = require('../index').worker;

// init clusterA for worker
clusterA.setup({}).run();

var server = http.createServer(function(req, res){
    res.end('6');
});

server.listen(8000);