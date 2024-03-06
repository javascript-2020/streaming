


/*

wsmod:d

03-09-22
31-10-22    - multiple connections


*/


      module.exports    = wsmod;
      
      
function wsmod(){

  var obj               = {};
  
  
        var crypto      = require('crypto');
        var http        = require('http');
        var https       = require('https');
        
        const two16     = Math.pow(2,16);
        const two64     = Math.pow(2,64);
        
        
        var op          = {};
        var frame       = {};
        obj.frame       = frame;
        var rd          = {};
        var wt          = {};
        var pos         = {};
        var mask        = {};
        var extlen      = {};
        var bit         = {};
        var display     = {};
        
        
  //:
  
  
        obj.client=function(url,onrec,onerror,onclose,callback){    //d
        
              if(!callback){
                    var promise   = new Promise(res=>callback=res);
              }
              
              handshake.client(url,complete);
              
              return promise;
              
              
              function complete(socket,head){
              
                    if(socket===null){
                          callback(null);
                          return;
                    }
                    
                    var con   = upgrade(socket,onrec,onerror,onclose);
                    rec(con,head);
                    callback(con);
                    
              }//complete
              
        }//client
        
        
  //:
  
        obj.upgrade=function(socket,onrec,onerror,onclose){return upgrade(socket,onrec,onerror,onclose)}    //d
        
        function upgrade(socket,onrec,onerror,onclose){
        
              var con   = connection(socket,onrec,onerror,onclose);
              
              socket.on('data',data=>rec(con,data));
              
              socket.on('error',err=>{
              
                    console.log('error');
                    console.error(err);
                    if(typeof onerror==='function'){
                          onerror(err);
                    }
                    
              });
              
              socket.on('close',()=>{
              
                    list.remove(con);
                    console.log('closed');
                    if(typeof onclose==='function'){
                          onclose();
                    }
                    
              });
              
              return con;
              
        }//upgrade
        
        
        obj.upgrade.server=function(req,socket,onrec,onerror,onclose){return upgrade.server(req,socket,onrec,onerror,onclose)}    //d
        
        upgrade.server=function(req,socket,onrec,onerror,onclose){
                                                                              console.log('upgrade');
              if(req.headers['upgrade'].toLowerCase()!=='websocket'){
                                                                              console.log(req.url,'bad request',req.headers['upgrade']);
                    socket.end('HTTP/1.1 400 Bad Request');
                    return;
              }
              
              handshake(req,socket);
              
              var con   = upgrade(socket,onrec,onerror,onclose);
              return con;
              
        }//upgrade.server
        
        
        obj.upgrade.deny=function(socket){return upgrade.deny(socket)}    //d
        
        upgrade.deny=function(socket){
        
              socket.end(
                    'HTTP/1.1 401 Web Socket Protocol Handshake\r\n' +
                    'Upgrade: WebSocket\r\n' +
                    'Connection: Upgrade\r\n' +
                    '\r\n'
              );
              socket.destroy();
              
        }//deny
        
  //:
  
        function connection(socket,onrec,onerror,onclose){   //c
        
          var con   = {};
          
                list.push(con);
                
                
                con.onrec       = onrec;
                con.onerror     = onerror;
                con.onclose     = onclose;
                
                con.websocket   = socket;
                con.buffer      = Buffer.alloc(0);
                
                con.send        = {};
                
                var payload     = {
                
                      buffer      : null,
                      type        : null,
                      
                      add         : function(frame){
                      
                            var fragment      = rd.payload(frame);
                            payload.buffer    = Buffer.concat([payload.buffer,fragment]);
                            
                            var fin           = rd.fin(frame);
                            if(fin){
                                  rec(payload.buffer,payload.type,con);
                                  payload.reset();
                            }
                            
                      },
                      
                      reset       : function(){
                      
                            payload.buffer   = Buffer.alloc(0);
                            payload.type     = null;
                            
                      }
                      
                };
                
                con.payload   = payload;
                
                payload.reset();
                
                
  //:
  
  
                function rec(payload,type,con){
                
                      call('rec',payload,type,con);
                      
                }//rec
                
                
  //:
  
  
                con.send.frame=function(buffer){
                
                      var r   = send(con,buffer);
                      return r;
                      
                }//send
                
                con.send.text=function(str){
                
                      var r   = send.text(con,str);
                      return r;
                      
                }//send.text
                
                con.send.binary=function(buffer){
                
                      var r   = send.binary(con,buffer);
                      return r;
                      
                }//binary
                
                con.send.ping=function(){
                
                      var r   = send.ping(con);
                      return r;
                      
                }//send.ping
                
                con.send.json=function(json){
                
                      var txt   = JSON.stringify(json);
                      var r     = send.text(con,txt);
                      return r;
                      
                }//send.json
                
                
  //:
  
  
                con.close=function(){
                
                      close(con);
                      
                }//close
                
                
  //:
  
  
                socket.on('error',err=>{
                
                      call('error',err,con);
                      
                });
                
                socket.on('close',()=>{
                
                      call('close',con);
                      
                });
                
                
  //:
  
                var fn          = {};
                fn.rec          = [];
                fn.error        = [];
                fn.close        = [];
                
                con.on=function(name,userfn){
                
                      if(typeof userfn!=='function'){
                            return;
                      }
                      var list    = fn[name];
                      if(!list){
                            return;
                      }
                      list.push(userfn);
                      
                }//on
                
                con.remove=function(name,userfn){
                
                      var list    = fn[name];
                      if(!list){
                            return;
                      }
                      var n       = list.length;
                      for(var i=0;i<n;i++){
                      
                            var userfn2   = list[i];
                            if(userfn2===userfn){
                                  list.splice(i,1);
                                  return;
                            }
                            
                      }//for
                      
                }//remove
                
                
                function call(name){
                
                      var args    = Array.prototype.slice.call(arguments,1);
                      
                      var mainfn    = con['on'+name];
                      callfn(mainfn);
                      
                      fn[name].forEach(userfn=>userfn.apply(null,args));
                      
                      function callfn(fn){
                      
                            if(typeof fn!=='function'){
                                  return;
                            }
                            fn.apply(null,args);
                            
                      }//callfn
                      
                }//call
                
                
            return con;
            
        }//connection
        
        
  //:
  
        var list    = [];
        obj.list    = list;
        
        list.remove=function(con){
        
              var n   = list.length;
              
              for(var i=0;i<n;i++){
              
                    if(list[i]===con){
                          list.splice(i,1);
                          return;
                    }
                    
              }//for
              
        }//remove
        
        list.closeall=function(){
        
              var n   = list.length;
              
              for(var i=n-1;i>=0;i--){
              
                    var con   = list[i];
                    close(con);
                    
              }//for
              
        }//closeall
        
        
  //:
  
  
  
  
        function handshake(req,socket){
        
              var headers   = [
                    'HTTP/1.1 101 Web Socket Protocol Handshake',
                    'Upgrade: WebSocket',
                    'Connection: Upgrade'
              ];
              
              var key   = req.headers['sec-websocket-key'];
              if(key){
                    var hash    = genhash(key)
                    headers.push('Sec-WebSocket-Accept: '+hash);
              }
              
              headers   = headers.join('\r\n');
              headers  += '\r\n\r\n';
              
              socket.write(headers);
              
              
              function genhash(key){
              
                    var fn      = crypto.createHash('sha1');
                    var data    = fn.update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11','binary');
                    var b64     = data.digest('base64');
                    return b64;
                    
              }//genhash
              
        }//handshake
        
        handshake.client=function(url,callback){
        
              if(!callback){
                    var promise   = new Promise((res,rej)=>callback=res);
              }
              
              url             = new URL(url);
              var secure      = (url.protocol==='wss:');
              var hostname    = url.hostname;
              var port        = url.port;
              var path        = url.pathname+url.search;
              
              var num   = Buffer.alloc(16);
              for(var i=0;i<16;i++){
              
                    num[i]    = Math.round(Math.random()*255);
                    
              }//for
              var b64   = num.toString('base64');
              
              
              var hdrs    = {
                  'Upgrade'                 : 'websocket',
                  'Connection'              : 'Upgrade',
                  'Sec-WebSocket-Version'   : 13,
                  'Sec-WebSocket-Key'       : b64,
                  'Host'                    : hostname+':'+port
              }
              
              var opts    = {
                  hostname    : hostname,
                  port        : port,
                  method      : 'GET',
                  path        : path,
                  headers     : hdrs,
                  rejectUnauthorized    : false
              }
              
              var req   = (secure ? https : http).request(opts);
              req.on('error',err=>console.log(err));
              req.on('upgrade',upgrade);
              req.on('response',response);
              req.end();
              
              return promise;
              
              
              function upgrade(response,socket,head){
              
                  if(validate(response)===false){
                        callback(null);
                        return;
                  }
                                                                                console.log('upgrade ok');
                  callback(socket,head);
                  
              }//upgrade
              
              function response(response){
                                                                                console.log('upgrade failed, response');
                    response.socket.end();
                    
              }//response
              
              function validate(response){
              
                    if(response.headers.upgrade.toLowerCase()!=='websocket'){
                                                                                console.log('validate upgrade failed - response.headers.upgrade : '+response.headers.upgrade);
                          response.socket.end();
                          return false;
                    }
                    
                    var sha1          = crypto.createHash('sha1');
                    sha1.update(b64+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11');
                    var expectedKey   = sha1.digest('base64');
                    
                    if(response.headers['sec-websocket-accept']!==expectedKey){
                                                                                console.log('validate upgrade failed - invalid key : '+response.headers['sec-websocket-accept']);
                        response.socket.end();
                        return false;
                    }
                    
              }//validateHandshake
              
              
              
        }//handshake.client
        
        
        
        
        
        function rec(con,buf){
        
              if(buf.length===0)return;
              con.buffer    = Buffer.concat([con.buffer,buf]);
              
              while(frame.available(con.buffer)){
              
                    var buf       = frame.rd(con.buffer);
                    con.buffer    = frame.remove(con.buffer);
                    
                    var opcode    = rd.opcode(buf);
                    
                    switch(opcode){
                    
                      case 0    : op.continuation(con,buf);       break;      //continuation
                      case 1    : op.text(con,buf);               break;      //text
                      case 2    : op.binary(con,buf);             break;      //binary
                      
                      case 8    : op.close(con);                  break;      //close
                      case 9    : op.ping(con);                   break;      //ping
                      case 10   : op.pong(con);                   break;      //pong
                      
                    }//switch
                    
              }//while
              
        }//rec
        
        
        function close(con){
        
              send.close(con);
              con.websocket.destroy();
              list.remove(con);
              
        }//close
        
        
  //:-
  
  
        op.continuation=function(con,frame){
        
              if(con.payload.type===null){
                    close(con);
                    return;
              }
              
              con.payload.add(frame);
              
        }//continuation
        
        op.text=function(con,frame){
        
              if(con.payload.type!==null){
                    close(con);
                    return;
              }
              
              con.payload.type    = 'text';
              con.payload.add(frame);
              
        }//text
        
        op.binary=function(con,frame){
        
              if(con.payload.type!==null){
                    close(con);
                    return;
              }
              
              con.payload.type    = 'binary';
              con.payload.add(frame);
              
        }//binary
        
        op.close=function(con,frame){
        
              close(con);
              
        }//close
        
        op.ping=function(con){
                                                        console.log('ping received');
              var buf   = frame.create.pong();
              send(con,buf);
              
        }//ping
        
        op.pong=function(){
                                                        console.log('pong received');
        }//pong
        
        
  //:
  
  
        function send(con,buffer){
        
              con.websocket.write(buffer);
              
        }//send
        
        send.text=function(con,txt){
                                                                      //console.log('send : '+txt);
              var payload   = Buffer.from(txt,'utf8');
              var buffer    = frame.create(1,1,false,payload);
                                                                      //display.buffer(buffer);
              send(con,buffer);
              
        }//text
        
        send.binary=function(con,payload){
        
              var buffer    = frame.create(1,2,false,payload);
              send(con,buffer);
              
        }//binary
        
        send.ping=function(con){
        
              var buf   = frame.create.ping();
              send(con,buf);
              
        }//ping
        
        send.close=function(con){
        
              var buf   = frame.create.close();
              send(con,buf);
              
        }//close
        
        
  //:
  
  
        frame.rd=function(buffer){
        
              var len     = pos.endframe(buffer);
              var frame   = Buffer.alloc(len);
              buffer.copy(frame,0,0,len);
              return frame;
              
        }//rd
        
        frame.create=function(fin,opcode,ismasked,payload){
        
              payload       = payload||Buffer.alloc(0);
              
              var size      = frame.size(payload,ismasked);
              var buffer    = Buffer.alloc(size);
              
              wt.fin(buffer,fin);
              wt.opcode(buffer,opcode);
              wt.ismasked(buffer,ismasked);
              
              if(ismasked){
                    var buf    = mask.create();
                    wt.mask(buffer,buf);
                    mask.mask(payload,buf);
              }
              
              wt.paylen(buffer,payload.length);
              wt.payload(buffer,payload);
              
              return buffer;
              
        }//create
        
        frame.remove=function(buffer){
                                                                    //console.log('removeframe');
              var len   = pos.endframe(buffer);
              var num   = buffer.length-len;
              var buf   = Buffer.alloc(num);
              
              buffer.copy(buf,0,len);
              return buf;
              
        }//remove
        
        frame.size=function(payload,ismasked){
        
              var len     = payload.length;
              var ext     = extlen.len(len);
              var mask    = ismasked?4:0;
              
              var size    = 2+ext+mask+len;
              return size;
              
        }//size
        
        frame.available=function(buffer){
        
              if(buffer.length<2){
                    return false;
              }
              
              var ismasked        = rd.ismasked(buffer);
              var payloadlength   = rd.payloadlength(buffer);
              
              var hdr             = 2;
              var ext             = extlen.paylen(payloadlength);
              var hdrlen          = hdr+ext;
              
              if(buffer.length<hdrlen){
                    return false;
              }
              
              var mask            = ismasked?4:0;
              var paylen          = rd.paylen(buffer);
              var framelength     = hdrlen+mask+paylen;
              
              if(buffer.length<framelength){
                    return false;
              }
              
              return true;
              
        }//available
        
        
  //:-
  
  
        frame.create.binary=function(buf){
        
              var buffer    = frame.create(1,2,0,buf);
              return buffer;
              
        }//binary
        
        frame.create.text=function(str){
        
              var payload   = Buffer.from(str,'utf8');
              var buffer    = frame.create(1,1,0,payload);
              return buffer;
              
        }//text
        
        frame.create.close=function(){
        
              var buffer   = frame.create(1,8);
              return buffer;
              
        }//close
        
        frame.create.ping=function(){
        
              var buffer   = frame.create(1,9);
              return buffer;
              
        }//ping
        
        frame.create.pong=function(){
        
              var buffer    = frame.create(1,10);
              return buffer;
              
        }//pong
        
        
  //:
  
  
        rd.fin=function(buffer){
        
              var byte    = buffer.readUInt8(0);
              var fin     = bit.rd(byte,7);
              return fin;
              
        }//fin
        
        rd.opcode=function(buffer){
        
              var byte      = buffer.readUInt8(0);
              var opcode    = byte & 15;
              return opcode;
              
        }//opcode
        
        rd.ismasked=function(buffer){
        
              var byte        = buffer.readUInt8(1);
              var ismasked    = bit.rd(byte,7);
              return ismasked;
              
        }//ismasked
        
        rd.payloadlength=function(buffer){
        
              var byte      = buffer.readUInt8(1);
              var paylen    = byte & 127;
              return paylen;
              
        }//payloadlength
        
        
        rd.extpaylen=function(buffer){
        
              var paylen    = rd.payloadlength(buffer);
              var len;
              
              if(paylen<126){
                    return null;
              }
              
              if(paylen===126){
                    len   = buffer.readUInt16BE(2)
                    return len;
              }
              
              len   = buffer.readBigUInt64BE(2);
              len   = Number(len);
              return len;
              
        }//extpaylen
        
        rd.paylen=function(buffer){
        
              var len     = rd.payloadlength(buffer);
              
              if(len<126){
                    return len;
              }
              
              len    = rd.extpaylen(buffer);
              return len;
              
        }//paylen
        
        rd.mask=function(buffer){
        
             var index    = pos.mask(buffer);
             var mask     = Buffer.alloc(4);
             buffer.copy(mask,0,index,index+4);
             return mask;
             
        }//mask
        
        rd.payload=function(buffer){
        
              var index     = pos.payload(buffer);
              var len       = rd.paylen(buffer);
              
              var payload   = Buffer.alloc(len);
              buffer.copy(payload,0,index,index+len);
              
              var ismasked    = rd.ismasked(buffer);
              if(ismasked){
                    var buf    = rd.mask(buffer);
                    mask.mask(payload,buf);
              }
              
              return payload;
              
        }//payload
        
        
  //:
  
  
        wt.fin=function(buffer,fin){
        
              var byte    = buffer.readUInt8(0);
              byte        = bit.wt(byte,7,fin);
              buffer.writeUInt8(byte,0);
              
        }//fin
        
        wt.opcode=function(buffer,opcode){
        
              var byte    = buffer.readUint8(0);
              
              for(var i=0;i<4;i++){
              
                    var v   = bit.rd(opcode,i);
                    byte    = bit.wt(byte,i,v);
                    
              }//for
              
              buffer.writeUInt8(byte,0);
              
        }//opcode
        
        wt.ismasked=function(buffer,ismasked){
        
              var byte    = buffer.readUInt8(1);
              byte        = bit.wt(byte,7,ismasked);
              buffer.writeUInt8(byte,1);
              
        }//ismasked
        
        wt.payloadlength=function(buffer,len){
        
              var byte    = buffer.readUInt8(1);
              
              if(len<126){
                    write(len);
                    return;
              }
              
              if(len<two16){
                    write(126);
                    return;
              }
              
              write(127);
              
              
              function write(num){
              
                    for(var i=0;i<7;i++){
                    
                          var v   = bit.rd(num,i);
                          byte    = bit.wt(byte,i,v);
                          
                    }//for
                    
                    buffer.writeUInt8(byte,1);
                    
              }//write
              
        }//payloadlength
        
        wt.extpaylen=function(buffer,len){
        
              if(len<126){
                    return;
              }
              
              if(len<two16){
                    buffer.writeUInt16BE(len,2);
                    return;
              }
              
              var lenn    = BigInt(len);
              buffer.writeBigUInt64BE(lenn,2);
              
        }//extpaylen
        
        wt.paylen=function(buffer,len){
        
              wt.payloadlength(buffer,len);
              wt.extpaylen(buffer,len);
              
        }//paylen
        
        wt.mask=function(buffer,mask){
        
              var index   = pos.mask(buffer);
              mask.copy(buffer,index);
              
        }//mask
        
        wt.payload=function(buffer,payload){
        
              var index   = pos.payload(buffer);
              payload.copy(buffer,index);
              
        }//payload
        
        
  //:
  
  
        pos.mask=function(buffer){
        
              var hdr       = 2;
              var paylen    = rd.payloadlength(buffer);
              var ext       = extlen.paylen(paylen);
              
              var index     = hdr+ext;
              return index;
              
        }//mask
        
        
        pos.payload=function(buffer){
        
              var mindex      = pos.mask(buffer);
              var ismasked    = rd.ismasked(buffer);
              var mask        = ismasked?4:0;
              
              var pindex      = mindex+mask;
              return pindex;
              
        }//payload
        
        
        pos.endframe=function(buffer){
        
              var pindex      = pos.payload(buffer);
              var plen        = rd.paylen(buffer);
              var framelen    = pindex+plen;
              return framelen;
              
        }//frame
        
        
  //:
  
  
        mask.create=function(){
        
              var mask    = Buffer.alloc(4);
              
              for(var i=0;i<4;i++){
              
                    var v   = Math.floor(Math.random()*256);
                    mask.writeUInt8(v,i);
                    
              }//for
              
              return mask;
              
        }//create
        
        mask.mask=function(payload,mask){
        
              var n   = payload.length;
              
              for(let i=0;i<n;i++){
              
                    var byte    = payload.readUInt8(i);
                    byte        = byte ^ mask[i&3];
                    payload.writeUInt8(byte,i);
                    
              }//for
              
        }//mask
        
        
  //:
  
  
        extlen.len=function(len){
        
              if(len<126){
                    return 0;
              }
              
              if(len<two16){
                    return 2;
              }
              
              return 8;
              
        }//size
        
        extlen.paylen=function(payloadlength){
        
              if(payloadlength<126){
                    return 0;
              }
              
              if(payloadlength===126){
                    return 2;
              }
              
              return 8;
              
        }//payloadlength
        
        
  //:
  
  
        bit.set       = function(num,n){return num | (1<<n)}
        bit.clear     = function(num,n){return num & ~(1<<n)}
        bit.wt        = function(num,n,v){return v ? bit.set(num,n) : bit.clear(num,n)}
        bit.rd        = function(num,n){return (num>>n) & 1}
        
        
  //:
  
  
        display.buffer=function(buffer,str){
        
              str   = str||'buffer';
              
              console.log();
              console.log(str+' : '+buffer.length);
              console.log();
              
              for(var i=0;i<buffer.length;i++){
              
                    var s       = (i+'').padStart(3);
                    
                    var byte    = buffer.readUInt8(i);
                    var str     = byte.toString(2);
                    str         = str.padStart(8,'0');
                    
                    console.log(s,' - ',str);
                    
              }//for
              
              console.log();
              
        }//buffer
        
        
        
        
        
        
  return obj;
  
//wsmod:d-
}




