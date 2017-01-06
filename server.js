var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var ExpressPeerServer = require('peer').ExpressPeerServer;
var server = require('http').createServer(app);
// =========================
// PeerServer
// =========================
var peerConnectedCount = 0;
var peerServer  = ExpressPeerServer(server, {
    debug: true,
    key: 'qhxin',
    ip_limit: 10000, // 当前 key 允许的单个 IP 最大用户数
    concurrent_limit: 10000 // 当前 key 允许的同时在线数
});
peerServer.on('connection', function(id) {
    peerConnectedCount++;
    console.log('[ACC]C:'+ id+ '. T:'+ peerConnectedCount);
});
peerServer.on('disconnect', function(id) {
    peerConnectedCount--;
    console.log('[ACC]D:'+ id+ '. T:'+ peerConnectedCount);
});

// =========================
// SourcePool
// =========================
var SourcePool = {
    'map': {
        
    },  // source_url : [ id1, id2, ...] 
    'own': function(id, urls){
        console.log(id, urls)
    }
};

// =========================
// APP
// =========================
var urlencodedParser = bodyParser.urlencoded({ extended: false });

// Index
app.get('/', function(req, res, next) { res.send('Hello world!'); });

// ClientCount
app.get('/peer_connected_count', function(req, res, next) { res.send('Count: '+ peerConnectedCount); });

// ClientOwnSource
app.post('/own',urlencodedParser, function(req, res, next) {
    if(req.body && req.body.data){
        var data = JSON.parse(req.body.data),
            flag = false;
        if(data.id && data.urls && Array.isArray(data.urls)){
            SourcePool.own(data.id, data.urls);
            flag = true;
        }
        res.setHeader('Content-Type', 'text/json');  
        res.send(JSON.stringify({'flag': flag}));
    }else{
        res.sendStatus(404);
    }
});

// PeerJs
app.use('/peerjs', peerServer);

// =========================
// End Start
// =========================
server.listen(9000);
console.log('server started');