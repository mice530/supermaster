var http = require('http');

var server = http.createServer(function(req, res){
    res.end('ok');
});

server.listen(8000);