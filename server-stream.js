


        var http    = require('http');
        var fs      = require('fs');
        var fsp     = fs.promises;
        
        var file    = './fast-buck.mp4';
        //var file    = "D:/movies/Star.Trek.Nemesis.2002.720p.BRrip.x264.YIFY.mp4";
        var port    = 80;
        
        
        var fh;
        var size;
        
(async()=>{

        fh      = await fsp.open(file);
        size    = (await fh.stat()).size;
        console.log(file,size);
        
})();








        var server    = http.createServer();
        server.on('listening',e=>console.log('listening 127.0.0.1, '+port));
        server.on('request',onreq);
        server.listen(port,'127.0.0.1');
        
        
        
        async function onreq(req,res){
        
                                                                                                console.log('onreq',req.url,req.method);
            if(req.url==='/index.html' || req.url==='/'){
                  res.writeHead(200,{'content-type':'text/html'});
                  var stream  = fs.createReadStream('index.html');
                  stream.pipe(res);

                  return;
            }
            if(req.url==='/mp4box.all.js'){
                  res.writeHead(200,{'content-type':'text/javascript'});
                  var stream = fs.createReadStream('mp4box.all.js');
                  stream.pipe(res);
            }
            
            
            
/*
              if(req.method==='OPTIONS'){
                    var headers   = {
                          'Access-Control-Allow-Origin'     : '*',
                          'Access-Control-Allow-Methods'    : 'OPTIONS, POST, GET',
                          'Access-Control-Max-Age'          : 2592000,                            // 30 days
                          'Access-Control-Expose-Headers'   : 'content-range'
                    };
                    res.writeHead(204,headers);
                    res.end();
                    return;
              }
*/

              var headers   = {
                    'Access-Control-Allow-Origin'     : '*',
                    'Access-Control-Allow-Methods'    : 'OPTIONS, POST, GET',
                    'Access-Control-Max-Age'          : 2592000,                            // 30 days
                    'Access-Control-Expose-Headers'   : 'content-range'
              };
              
              
              var range   = req.headers.range;
              if(range){
                                                                                                  console.log('range',range);
                    var code=206;
                    
                    var [start,end]   = range.replace(/bytes=/,'').split('-').map(v=>v*1);
                    
                    if(isNaN(start)){
                          start   = size-end;
                          end     = size-1;
                    }
                    if(isNaN(end)){
                          end     = size-1;
                    }
                    if(end>=size-1)end   = size-1;
                                                                                                console.log(start,end,end-start);
                                                                                              
                    if((start>=size)||(end>=size)){
                                                                                                console.log('out of range');
                          res.writeHead(416,headers);
                          res.end(req.url+' range not satisfiable');
                          return;
                    }
                    
                    var hdrs    = {
                          ...headers,
                          'content-range'     : `bytes ${start}-${end}/${size}`,
                          'accept-ranges'     : 'bytes',
                          'content-length'    : end-start+1,
                    };
                    res.writeHead(code,hdrs);
                    
                    var stream    = fs.createReadStream(file,{start,end});
                    stream.pipe(res);
                    return;
                    
              }
              
              
/*              
              res.writeHead(200,headers);
              
              
              var offset    = 0;
              
              while(true){
              
                    var {bytesRead}   = await fh.read(buf,{});
                    if(bytesRead===0){
                                                                        console.log('done');
                          res.end();
                          return;
                          
                    }else{
                                                                        console.log(offset,bytesRead,size);
                          offset   += bytesRead;
                          
                          res.write(buf);
                    }
                    
              }//while
*/              
              
        }//onreq
        
        
(function restart(){

      process.stdout.setEncoding('utf8');
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      
      var ctrlc   = '\u0003';
      var esc     = String.fromCharCode(27);
      process.stdin.on('data',keypressed);
      
      function keypressed(key){
      
            if(key===ctrlc || key===esc)process.exit();
            if(key==='r'){
                  process.stdin.off('data',keypressed);
                  server.close(()=>{
                  
                      if(fh){
                            fh.close();
                      }
                      
                      var js    = fs.readFileSync(__filename);
                      var fn    = Function('require','__filename','__dirname',js);
                      fn(require,__filename,__dirname);
                      
                  });
            }
            
      }//keypressed
      
})();



