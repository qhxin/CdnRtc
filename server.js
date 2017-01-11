var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var ExpressPeerServer = require('peer').ExpressPeerServer;
var server = require('http').createServer(app);
var serverUtil = require('peer/lib/util');

var peerServerOption = {
    debug: true,
    key: 'qhxin',   // 每个 server 一个key
    ip_limit: 10000, // 当前 key 允许的单个 IP 最大用户数
    concurrent_limit: 10000 // 当前 key 允许的同时在线数
};

// =========================
// SourcePool
// =========================
var objectIsEmpty = function(obj){
    for(var i in obj){
        if(obj.hasOwnProperty(i)){
            return false;
        }
    }
    return true;
};
var SourcePool = (function(){
    var idsMap = {}, // ids map
        srcMap = {}; // src url map
    var itemMap = (function(){
        var map = {};
        return {
            'save': function(item){
                var key = serverUtil.randomId();
                while(map[key]){
                    key = serverUtil.randomId();
                }
                map[key] = item;
                return key;
            },
            'all': function(){
                return map;
            },
            'get': function(key){
                return map[key];
            },
            'remove': function(key){
                delete map[key];
            }
        };
    })(); // item_map    
        
    return {
        'own': function(/* String */ id,/* Array */ urls){
            var idArray = idsMap[id],
                mapItemKey,
                srcUrl,
                srcArrayMap;
            if(!idArray){
                idArray = idsMap[id] = [];
            }
            for(var i=urls.length-1;i>=0;i--){
                srcUrl = urls[i];
                srcArrayMap = srcMap[srcUrl];
                if(!srcArrayMap){
                    srcArrayMap = srcMap[srcUrl] = {};
                }
                mapItemKey = itemMap.save({'i':id,'u': srcUrl});
                idArray.push(mapItemKey);
                srcArrayMap[mapItemKey] = true;
            }
        },
        'out': function(/* String */ id){
            var keys = idsMap[id],
                key, item, urls_keys, url;
            if(keys){
                for(var i=keys.length-1;i>=0;i--){
                    key = keys[i];
                    item = itemMap.get(key);
                    url = item['u'];
                    urls_keys = srcMap[url];
                    if(urls_keys){
                        delete urls_keys[key];
                        if(objectIsEmpty(urls_keys)){
                            delete srcMap[url];
                        }
                    }
                    itemMap.remove(key);
                }
            }
            delete idsMap[id];
        },
        'find': function(/* String */ url){
            var urls_keys = srcMap[url];
            if(urls_keys){
                var keysArray = Object.keys(urls_keys);
                if(keysArray.length>0){
                    key = keysArray[Math.floor((Math.random()*keysArray.length))];
                    var item = itemMap.get(key);
                    return item['i'];
                }
            }
            return false;
        }
    };
})();

// =========================
// PeerServer
// =========================
var peerConnectedCount = 0;
var peerServer  = ExpressPeerServer(server, peerServerOption);
peerServer.on('connection', function(id) {
    peerConnectedCount++;
    console.log('[ACC]C:'+ id+ '. T:'+ peerConnectedCount);
});
peerServer.on('disconnect', function(id) {
    // clear 
    SourcePool.out(id);
    
    peerConnectedCount--;
    console.log('[ACC]D:'+ id+ '. T:'+ peerConnectedCount);
});

// =========================
// APP
// =========================
var urlencodedParser = bodyParser.urlencoded({ extended: false });

// Index
app.get('/', function(req, res, next) { res.send('Hello world!'); });

// ClientCount
app.get('/peer_connected_count', function(req, res, next) { res.send('Count: '+ peerConnectedCount); });

// ClientOwnSource
// post /own
// data: { id , urls }
app.post('/own',urlencodedParser, function(req, res, next) {
    if(req.body && req.body.data){
        var data = JSON.parse(req.body.data),
            result = {'flag': false};
        if(data.id && data.urls && Array.isArray(data.urls)){
            SourcePool.own(data.id, data.urls);
            result.flag = true;
        }
        res.setHeader('Content-Type', 'text/json');  
        res.send(JSON.stringify(result));
    }else{
        res.sendStatus(404);
    }
});

// ClientFindSource
// post /find
// data: { url }
app.post('/find',urlencodedParser, function(req, res, next) {
    if(req.body && req.body.data){
        var data = JSON.parse(req.body.data),
            result = {'flag': false};
        if(data.url){
            var peer_id = SourcePool.find(data.url);
            if(peer_id){
                result.flag = true;
                result.data = peer_id;
            }
        }
        res.setHeader('Content-Type', 'text/json');  
        res.send(JSON.stringify(result));
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