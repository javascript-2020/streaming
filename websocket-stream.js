



                                                                            console.clear();
                                                                            console.log('mediastream via websocket 2');
        var dir           = './';
        var port          = 3000;
        
        var files_width   = 500;
        var ws_url        = '/ws-url';
        
        
        
        
        
        
        
        
        var http            = require('http')
        var fs              = require('fs')
        var fsp             = fs.promises;
        var path            = require('path');
        var cp              = require('child_process');
        
        var MP4Box          = require('./mp4box.all.js');
        
        var wsmod           = require('./wsmod-v2.0.js')();
        
        
        
        
        
  //req:
  
  
        var req2   = {};
        
        async function rdpost(req){
        
              var resolve,promise   = new Promise(res=>resolve=res);
              var body    = '';
              req.on('data',data=>body+=data);
              req.on('end',()=>resolve(JSON.parse(body)));
              return promise;
              
        }//rdpost
        
        req2.index=(req,res)=>{
                                                                                console.log('req : index.html');
              res.writeHead(200,{'content-type':'text/html'});
              res.end(html.index);
              
        }//index
        
        req2.update=async (req,res)=>{
                                                                                console.log('update');
              var files   = await readdir();
              var str     = JSON.stringify(files);
              res.end(str);
              
        }//update
        
        req2.transcode=async (req,res)=>{
        
              var json    = await rdpost(req);
              await transcode(json,res);
              res.end('done.');
              
        }//transcode
        
        req2.delete=async(req,res)=>{
        
              var json    = await rdpost(req);
                                                                                console.log('delete',json.file);
              await fsp.rm(dir+json.file);
              var files   = await readdir();
              res.end(JSON.stringify(files));
              
        }//delete
        
        req2.info=async(req,res)=>{
        
              var json      = await rdpost(req);
              var {info}    = await getmime(json.file);
              var stat      = await fsp.stat(dir+json.file)
              var output    = '\n\n';
              output       += json.file+' : '+stat.size+' B\n\n';
              output       += require('util').format(info);
              output       += '\n\n';
              output       += await ffmpeg.info(json.file);
              output       += '\n\n';
              res.end(JSON.stringify(output));
              
        }//info
        
        
        
        
  //server:
  
        const server = http.createServer()
        server.on('listening',()=>console.log('listening 127.0.0.1:3000'));
        server.listen(port,'127.0.0.1')
        var con;
        
        
        server.on('request',(req,res)=>{
        
              var url   = req.url.slice(1);
              if(req2[url]){
                    req2[url](req,res);
                    return;
              }
              req2.index(req,res);
              
        });
        
        
        server.on('upgrade',(req,socket)=>{
        
              if(req.url==='/upload'){
                    upload(req,socket);
                    return;
              }
              
              wsmod.upgrade.server(req,socket,onrec,onerror,onclose);
              
              
        });
        
        
        function onrec(payload,type,con){
        
              if(type==='text'){
                    var json    = JSON.parse(payload);
                    if(json.stop){
                                                                      console.log('stop');
                          clearTimeout(timer);
                    }
                    if(json.stream){
                                                                      console.log('stream',json.stream);
                          stream(con,json);
                    }
                    if(json.start){
                          start(con,json);
                    }
                    if(json.next){
                                                                      console.log('next');
                          send(con);
                    }
              }
              
        }//onrec
        
        
        function onerror(err){
        }//onerror
        
        
        function onclose(){
                                                                      console.log('onclose');
              clearTimeout(timer);
              
        }//onclose
        
        
  //:
  
  
        var fh;
        var size;
        var offset;
        
        var timer;
        var updatetime   = 1000;
        
        var tmp   = Buffer.alloc(4);
        
        
        async function stream(con,json){
        
              var file              = json.stream;
              var {err,frag,mime}   = await getmime(file);
              if(err){
                    con.send.json(err);
                    return;
              }
              var dur           = await ffmpeg.duration(con,file);
              
              if(!frag){
                    con.send.json({type:'error',txt:'file not fragmented mp4'});
                    return;
              }
              
              fh          = await fsp.open(dir+file);
              var stats   = await fh.stat();
              size        = stats.size;console.log('filesize',size);
              offset    = 0;
              
              con.send.json({type:'start',mime,dur,file,size});
              
              
        }//stream
        
        async function start(con){
        
              await send(con);    //ftyp
              await send(con);    //moov
              await send(con);    //moof,mdat
              
        }//start
        
        
        async function getpacket(){
        
              await fh.read(tmp,{position:offset});
              var size    = tmp.readInt32BE(0);
              
              var data     = Buffer.alloc(size);
              await fh.read(data,{position:offset});
              
              var name    = data.toString('utf8',4,8);
                                                                                console.log(offset,name,size);
              offset     += size;
              
              return {name,data,offset};
              
        }//getpacket
        
        
        async function send(con){
        
              var {name,data,offset}   = await getpacket();
              var data2    = data;
              
              if(name==='moof'){
                    var {name,data,offset}   = await getpacket();
                    data   = Buffer.concat([data2,data]);
              }
                                                                            console.log('send',data.length);
              con.send.binary(data);
              
              if(offset>=size){
                                                                            console.log('complete');
                    complete(con);
              }
              
        }//send
        
        
        function complete(con){
        
              con.send.json({type:'complete'});
              
        }//complete
        
        
        async function getmime(file){
        
              var resolve,promise   = new Promise(res=>resolve=res);
              var abort;
              
              var mp4       = MP4Box.createFile();
              mp4.onReady   = info=>{
                                                                            //console.log(info);
                    abort   = true;
                    fh.close();
                    
                    var mime    = info.mime;
                    var frag    = info.isFragmented;
                    resolve({frag,mime,info});
                    
              };
              
              var fh        = await fsp.open(dir+file,'r');
              var buf       = Buffer.alloc(1024*1024);
              var offset    = 0;
              readblock();
              
              return promise;
              
              
              async function readblock(){
              
                    if(abort)return;
                    var {bytesRead}   = await fh.read(buf,{});
                    if(bytesRead){
                          let ab          = buf.buffer.slice(buf.byteOffset,buf.byteOffset+bytesRead);
                          ab.fileStart    = offset;
                          offset         += bytesRead;
                          mp4.appendBuffer(ab);
                          readblock();
                          return;
                    }
                    resolve({err:{type:error,txt:'file error'}});
                    
              }//readblock
              
        }//getmime
        
        
        
        async function readdir(){
        
              var files     = [];
              var entries   = await fsp.readdir(dir,{withFileTypes:true});
              entries.forEach(file=>{
              
                    if(file.isFile()){
                          var ext   = path.extname(file.name);
                          if(mime.video.includes(ext))files.push(file.name);
                    }
                    
              });
              return files;
              
        }//readdir
        
        
        var mime      = {};
        mime.video    = [
              '.3g2','.3gp','.amv','.asf','.avi','.f4a','.f4b','.f4p','.f4v',
              '.flv','.flv','.gifv','.m4p','.m4v','.m4v','.mkv','.mng','.mod',
              '.mov','.mp2','.mp4','.mpe','.mpeg','.mpg','.mpv','.mxf','.nsv',
              '.ogg','.ogv','.qt','.rm','.roq','.rrc','.svi','.vob','.webm',
              '.wmv','.yuv'
        ];
        mime.audio    = [
              '.4mp','.aac','.abm','.acm','.acp','.aif','.akp','.alac','.als',
              '.amxd','.ang','.aup','.band','.bun','.cda','.cdo','.cgrp','.cwb',
              '.dct','.dff','.dmse','.dsm','.dsd','.fev','.flac','.fsc','.fur',
              '.g726','.gp','.gp5','.gsf','.gsm','.h5s','.igp','.itls','.kt3',
              '.m4a','.m4r','.mid','.midi','.minigsf','.mka','.mlp','.mp3','.mpa',
              '.mqa','.mscz','.mxl','.nki','.ogg','.omg','.pna','.pek','.pcg','.phy',
              '.ptxt','.qcp','.rad','.rmj','.rip','.rx2','.saf','.sc2','.sfk','.slp',
              '.sngx','.sequence','.sty','.vdj','.vsq','.vpw','.voxal','.wav','.wma',
              '.xfs','.xmu','.xrns'
        ];
        
        
        
  //:
  
  
  
  
  
        function transcode(json,res){
        
              var resolve,promise   = new Promise(res=>resolve=res);
              
              var input     = dir+json.file;
              var output    = dir+'frag-'+json.file;
              
              var args    = `-y `                                                         +
                            `-i ${input} `                                                +
                            `-g 52 `                                                      +
                            `-c:a aac -b:a ${json.audio}k `                               +
                            `-c:v libx264 -b:v ${json.video}k `                           +
                            `-f mp4 `                                                     +
                            `-movflags frag_keyframe+empty_moov+default_base_moof `       +
                            `-frag_duration ${json.frag}M `                               +
                            `-reset_timestamps 1 `                                        +
                            `${output}`;
                            
              args        = args.split(' ');
              
              var process   = cp.spawn('ffmpeg',args);
              
              process.stdout.on('data',data=>res.write(data.toString()));
              process.stderr.on('data',data=>res.write(data.toString()));
              process.on('error',err=>res.write(err.toString()));
              process.on('exit',code=>{
              
                    res.write('transcode complete : '+input+' => '+output+'\n');
                    resolve();
                    
              });
              
              return promise;
              
        }//transcode
        
        
        function upload(req,socket){
                                                                                console.log('upload');
              var con     = wsmod.upgrade.server(req,socket,onrec,null,onclose);
              var phase   = 'info';
              var fh;
              
              async function onrec(payload,type,con){
              
                    if(phase==='info'){
                          var str         = payload.toString();
                          var json        = JSON.parse(str);
                          var filename    = json.filename;
                          phase           = 'data';
                          fh              = await fsp.open(dir+filename,'w');
                    }else{
                          await fh.write(payload);
                    }
                    
              }//onrec
              
              function onclose(){
              
                    fh.close();
                    
              }//onclose
              
        }//upload
        
        
        
  //:
  //ffmpeg:
  
        var ffmpeg    = {};
        
        ffmpeg.duration=async function(con,file){
        
              var resolve,promise   = new Promise(res=>resolve=res);
              
              cp.exec('ffmpeg -i '+dir+file,{encoding:'utf8'},complete);
              
              return promise;
              
              
              function complete(err,stdout,stderr){
              
                    var i1      = stderr.indexOf('Duration:');
                    var i2      = stderr.indexOf(',',i1);
                    var dur     = stderr.slice(i1+9,i2);
                    var parts   = dur.split(':');
                    var h       = parts[0]*1;
                    var m       = parts[1]*1;
                    var s       = parts[2].slice(0,2)*1;
                    var ms      = ((parts[2].slice(3)*1)/100);
                    
                    var secs    = h*60*60+m*60+s+ms;
                    resolve(secs);
                    
              }//complete
              
        }//duration
        
        
        ffmpeg.info=async function(file){
        
              var resolve,promise   = new Promise(res=>resolve=res);
              
              cp.exec('ffmpeg -i '+dir+file,{encoding:'utf8'},complete);
              
              return promise;
              
              
              function complete(err,stdout,stderr){
              
                    var output    = stdout+stderr;
                    resolve(output);
                    
              }//complete
              
        }//info
        
        
        
  //:
  //html:
  
  
var html    = {};




html.index=`



<html>

<style>
      html,body {
            margin:0;
            height:100%;
      }
      
      body {
            font-family:arial;
            display:flex;
            flex-direction:column;
      }
      
      #hdr {
            height:30px;
      }
      
      #main {
            flex:1;
            display:flex;
      }
      
      #files {
            margin:20px;
            display:flex;
            flex-direction:column;
      }
      #file-btns {
            display:flex;
            justify-content:space-between;
      }
      #list {
            margin-top:20px;
            padding:10px;
            border:1px solid lightblue;
            width:${files_width}px;
            flex:1;
      }
      .file-item {
            padding:10px;
            cursor:pointer;
      }
      
      #view {
            flex:1;
            display:flex;
            flex-direction:column;
            margin:20px;
      }
      
      #file-info {
            padding:20px 0;
            font-weight:bold;
            font-size:20px;
            color:gray;
            height:20px;
      }
      
      #filename {
            margin:20px;
      }
      
      button {
            font-size:18px;
            padding:10px;
            width:120px;
            color:blue;
      }
      
      video {
            width:500px;
            display:block;
            border:1px solid lightblue;
            
      }
      
      #plyr-info {
            margin:20px 0;
      }
      #plyr-info span {
            margin-right:20px;
      }
      
      #time {
            display:inline-block;
            min-width:50px;
      }
      
      #transcode {
            height:200px;
            border:1px solid lightblue;
            padding:10px;
            margin-bottom:30px;
      }
      #transcode #title {
            color:blue;
            font-size:18px
            font-weight:bold;
            margin-bottom:20px;
      }
      #transcode #params {
            display:grid;
            grid-template-columns:200px auto;
      }
      
      #transcode input {
            padding:5px 10px;
            font-size:16px;
            margin-right:10px;
            width:50px;
      }
      #transcode button {
            margin-top:20px;
      }
      
      #clear {
            border:1px solid lightblue;
            border-radius:3px;
            padding:2px;
            width:25px;
            height:20px;
            cursor:pointer;
      }
      
      #output {
            margin:5px 0 0 0;
            border:1px solid lightblue;
            padding:10px;
            overflow:auto;
            flex:1;
            font-size:16px;
            min-width:0;
      }
      
      #links {
            width:700px;
            border:1px solid lightblue;
            margin:20px;
            overflow:auto;
            padding:10px;
      }
      
      .link-item {
            white-space:nowrap;
            display:block;
            padding:10px;
            text-decoration:none;
      }
      
      .link-hdr {
            display:inline-block;
            width:220px;
      }
      
      .link-desc {
      }
      
</style>

<body>


    <div id=hdr>
    </div>
    
    <div id=main>
    
          <div id=files>
                <div id=file-btns>
                      <button id=delete>delete</button>
                      <button id=upload>upload</button>
                      <button id=update>update</button>
                </div>
                <div id=list>
                </div>
          </div>
          
          <div id=view>
          
                <div id=transcode>
                
                      <div id=title>
                            convert to fragmented mp4
                      </div>
                      
                      <div id=params>
                            <div>
                                  audio bitrate
                            </div>
                            <div>
                                  <input id=audio-br value=64>kb
                            </div>
                            
                            <div>
                                  video bitrate
                            </div>
                            <div>
                                  <input id=video-br value=448>kb
                            </div>
                            
                            <div>
                                  fragment duration
                            </div>
                            <div>
                                  <input id=frag-dur value=10>secs
                            </div>
                      </div>
                      
                      <button>transcode</button>
                      
                </div>
                
                <div>
                      <button id=play>play</button>
                      <button id=stopbtn>stop</button>
                      <button id=info>info</button>
                </div>
                
                <div id=file-info>
                      <span id=filename>no file</span><span id=filesize>-</span>
                </div>
                
                <video id=plyr controls></video>
                
                <div id=plyr-info>
                      <span id=time>00:00:00</span>
                      <span id=dur>00:00:00</span>
                      <span>buffered</span>
                      <span id=buf-start>00:00:00</span>
                      <span>=></span>
                      <span id=buf-end>00:00:00</span>
                </div>
                
                <img id=clear src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IArs4c6QAAAtNJREFUOE+tlFlIlGEUhp//n5kmtc3JrMzKdGihRacutKCbkqwoK1DE8CJQEVtuRGlFrQispAzqwoIsMohWjBaKNkt0slzQFq3Gclwbd9NxmfnnD8EJG8ehwA++u+97znnP+3IExvkI48zjD7A9J2etes6sTf1NtWrpXVmx9/nsW4DNVcFVoMpZGbRrUWLi3J3xCfo78NQOFOT3ehutzfCzAZqMfL736L2xpzZs48fudkfoTVAotNrAMF1QsUqn69p76HDKJcgFBu1AsfpYWvbCAJ84Gmuh3gDGaiyGbzU7Knq2PITPdmguLI9YueKMONNn3ZXGhszsr4asErP5p13NyBmKUV5e2qzNIVne7cYwsalOpO0X1h6p91qnvN1opSAB1qk9JuYNaKb3X+0xJxzo6LgJWEcqcGaK8oLnxJA4teXhhAHbFLlfxmzBXG2lyl8g6AdCy3FZ3nwXyp3N2JXL7nolR5fZSJZkGLofwHAZYq6AfiyzXMbmKqwOh0K71SKwH+ZfBON/A5/BwaWQogLPcqiYLCAFKtH9gJLFFkIcZ2cv4LTDUkiaC6dEUHRA1ykI64a60x7c8J0qrL09KKdGtnLin2b4BJJ1kKECxVDst8msfw2vhj5vBfcMP+FBgFpYc91gC421UuAo/a8Or8HsUCh3E/BWCXAfzkbbSAEk+8cjsGS3j1jUZ5MLA5rl8DFjEwmKTIF+DShVCjCJdM0bRAu0OnbxeBp+GyYpqpKapIhzEg+c5jBfo4laPUl1Q2wz0YncF9tLaB4UAbITRwW9h3gywE0IntEqhQKWUaZIcTHpYndnGl/KqG9pNp1rkJZngsnFclCa3AR9Xp8cGQ/fRwHbdselaxbMTqOmgu+fKqui82uC30K3q21TqmT9GSsduVA6CrgPfPem7MnXuiv8n794mbrhTaXTWDgUGDJV6VTy8EMVoBk24o+z/7OEx31j/wbpawsoZA7l1AAAAABJRU5ErkJggg=='>
                
                <pre id=output>
                </pre>
                
          </div>
          
          <div id=links>
          
                <a target='_blank' class=link-item>
                      <span class=link-hdr>
                      </span>
                      <span class=link-desc>
                      </span>
                </div>
                
          </div>
          
    </div>
    
    
    <script type=module>
    
          //import MP4Box from 'https://cdn.jsdelivr.net/npm/mp4box/+esm';
          //import MP4Box from 'https://localhost:3010/dist/mp4box.esm.js';
          
          
          var $=s=>document.querySelector(s);
          
          var cur;
          post('/update',null,update);
          
          
          var mediaSource;
          var sourceBuffer;
          var mimecodec;
          var duration;
          var status;
          
          
          
          
          var ws          = new WebSocket('ws://streaming-irqb-1pnbldzk--3000--8e1c3ef8.local-credentialless.webcontainer.io${ws_url}');
          //ws.binaryType   = 'arraybuffer';
          ws.onopen       = e=>output('websocket open');
          ws.onclose      = e=>output('websocket close');
          ws.onerror      = e=>output(e.message);
          ws.onmessage    = rec;
          ws.send.json    = json=>ws.send(JSON.stringify(json));
          
          
          plyr.onerror=function(e){
          
                                                                                  console.log(plyr.error);
                output(plyr.error.message);
                
          }//onerror
          
          
          plyr.ontimeupdate=function(e){
          
                $('#time').textContent        = plyr.currentTime.toFixed(2);
                var bs    = '-';
                var be    = 0;
                if(plyr.buffered.length===1){
                      bs    = plyr.buffered.start(0).toFixed(2);
                      be    = plyr.buffered.end(0).toFixed(2);
                }
                $('#buf-start').textContent   = bs;
                $('#buf-end').textContent     = be||'-';
                
                
                if(status==='complete')return;
                
                var cur   = plyr.currentTime;
                var end   = be;
                if(cur>=end-2){
                      ws.send.json({next:true});
                }
                
          }//ontimeupdate
          
          
  //:
  
  
          $('#delete').onclick   = e=>{
          
                if(!cur){
                      output('no file');
                      return;
                }
                post('/delete',cur,update);
                
          }//delete
          
          
          $('#upload').onclick    = e=>{
          
                var input         = document.createElement('input');
                input.type        = 'file';
                input.onchange    = onchange;
                input.click();
                
                
                function onchange(){
                
                      var file    = input.files[0];
                      var ws      = new WebSocket('ws://localhost:3000/upload');
                      ws.onopen   = e=>{
                      
                            var str   = JSON.stringify({filename:file.name});
                            ws.send(str);
                            ws.send(file);
                            ws.close();
                            
                      }//onopen
                      
                      ws.onclose    = e=>post('/update',null,update);
                      
                }//onchange
                
          }//upload
          
          
          $('#update').onclick    = e=>{
          
                post('/update',null,update);
                
          }//update
          
          
          play.onclick   = e=>{
          
                if(!cur){
                      output('no file');
                      return;
                }
                ws.send.json({stream:cur.file});
                
          }//start
          
          
          stopbtn.onclick    = e=>{
          
                plyr.pause()
                plyr.src    = ""
                if(!ws)return;
                ws.send.json({stop:'stop'});
                
          }//stop
          
          info.onclick    = e=>{
          
                if(!cur){
                      output('no file');
                      return;
                }
                post('/info',cur,output);
                
          }//info
          
          
          $('#transcode button').onclick    = async e=>{
          
                if(!cur){
                      output('no file');
                      return;
                }
                var audio   = $('#audio-br').value*1;
                var video   = $('#video-br').value*1;
                var frag    = $('#frag-dur').value*1;
                var file    = cur.file;
                
                var body      = JSON.stringify({file,audio,video,frag});
                var res       = await fetch('/transcode',{method:'post',body})
                var reader    = res.body.getReader();
                var text      = new TextDecoder();
                while(true){
                      var {done,value}    = await reader.read();
                      if(done)return;
                      output(text.decode(value));
                }//while
                
          }//transcode
          
          
  //:
  
  
          function create(){
          
                mediaSource                 = new MediaSource();
                mediaSource.onsourceopen    = open;
                mediaSource.onsourceclose   = close;
                mediaSource.onsourceended   = ended;
                
                plyr.src                    = URL.createObjectURL(mediaSource);
                status                      = 'create';
                
                
                
                function open(){
                                                                            console.log('mediasource open');
                      mediaSource.onsourceopen    = null;
                      
                      mediaSource.duration        = duration;
                      $('#dur').textContent       = duration;
                      
                      sourceBuffer                = mediaSource.addSourceBuffer(mimecodec);
                      ['abort', 'error', 'update', 'updateend', 'updatestart'].forEach(name=>{
                            sourceBuffer['on'+name]   = evt;
                      });
                      
                      
                      ws.send.json({start:true});
                      
                      
                      function evt(e){
                                                                              console.log('sourceBuffer',e.type);
                            if(e.type==='updateend'){
                                  if(status==='complete'){
                                        mediaSource.endOfStream();
                                  }
                            }
                            
                      }//evt
                      
                }//open
                
                function close(){
                                                                            console.log('mediasource close');
                }//close
                
                function ended(){
                                                                            console.log('mediasource ended');
                }//ended
                
          }//create
          
          
          function rec(e){
                                                                            console.log('rec buf');
                var buf   = e.data;
                
                if(typeof buf==='string'){
                      var json    = JSON.parse(buf);
                      rec[json.type](json);
                      return;
                }
                
                sourceBuffer.appendBuffer(buf);
                
                plyr.play();
                
          }//rec
          
          
          rec.error=function(json){
          
                output(json.error);
                
          }//error
          
          
          rec.start=function(json){
          
                mimecodec               = json.mime;
                duration                = json.dur;
                filename.textContent    = json.file;
                filesize.textContent    = size(json.size);
                                                                    console.log(  mimecodec,
                                                                                  MediaSource.isTypeSupported(mimecodec),
                                                                                  duration
                                                                    );
                create();
                
                
                function size(size){
                
                      var i = size == 0 ? 0 : Math.floor(Math.log(size)/Math.log(1024));
                      return (size/Math.pow(1024,i)).toFixed(2)*1+' '+['B','kB','MB','GB','TB'][i];
                      
                }//size
                
          }//start
          
          
          rec.complete=function(json){
          
                status    = 'complete';
                
                if(mediaSource.readState==='open'){
                      if(!sourceBuffer.updating){
                            mediaSource.endOfStream();
                      }
                }
                
          }//complete
          
          
          rec.update=function(json){
          
                post('/update',null,update);
                
          }//update
          
          
          rec.stdout=function(json){
          
                output(json.data);
                
          }//stdout
          
          
          rec.stderr=function(json){
          
                output(json.data);
                
          }//stderr
          
          
  //:
  
  
          async function post(url,json,callback){
          
                json        = json||{};
                var res     = await fetch(url,{method:'post',body:JSON.stringify(json)});
                var json    = await res.json();
                callback(json);
                
          }//post
          
  //:
  
  
          function update(files){
          
                cur   = null;
                $('#list').replaceChildren();
                files.forEach(file=>{
                
                      var node    = document.createElement('div');
                      node.classList.add('file-item');
                      node.textContent   = file;
                      $('#list').append(node);
                      node.onclick         = e=>click(node,file);
                      node.onmouseenter    = e=>me(node,file);
                      node.onmouseleave    = e=>ml(node,file);
                      
                });
                
                function click(node,file){
                
                      if(cur){
                            if(node===cur.node){
                                  cur.node.style.background   = '';
                                  cur   = null;
                                  return;
                            }
                      }
                      
                      cur    = {node,file};
                      $('#list').childNodes.forEach(node2=>{
                      
                            if(node2===node)node.style.background   = 'lightyellow';
                            else node2.style.background   = '';
                            
                      });
                      
                }//click
                
                function me(node,file){
                
                      if(cur)return;
                      $('#list').childNodes.forEach(node2=>{
                      
                            if(node2===node)node.style.background   = 'rgba(239,247,250,1)';
                            else node2.style.background   = '';
                            
                      });
                      
                }//me
                
                function ml(node,file){
                
                      if(cur)return;
                      node.style.background   = '';
                      
                }//ml
                
          }//update
          
          
          $('#clear').onclick   = e=>$('#output').replaceChildren();
          
          function output(txt){
          
                var div   = document.createElement('div');
                div.textContent   = txt;
                $('#output').append(div);
                $('#output').scrollTop    = $('#output').scrollHeight;
                
          }//output
          
          
          output('ready');
          
          
    </script>
    
    
    <script>
    
          setTimeout(updatelinks,50);
          
          function updatelinks(){
          
                var item    = document.querySelector('.link-item');
                item.remove();
                
                links.forEach(link=>{
                
                      var nitem                       = item.cloneNode(true);
                      
                      nitem.href                      = link.href;
                      nitem.title                     = link.href;
                      
                      var node                        = nitem.querySelector('.link-hdr');
                      node.textContent                = link.hdr;
                      
                      var node                        = nitem.querySelector('.link-desc');
                      node.textContent                = link.desc;
                      
                      document.querySelector('#links').append(nitem);
                      
                      nitem.onmouseenter              = e=>{
                            nitem.style.background    = 'lightblue';
                      }
                      nitem.onmouseleave              = e=>{
                            nitem.style.background    = '';
                      }
                });
                
          }//updatelinks
          
          
  //links:
  
  
  
  
  
  
/*
                { hdr     : '',
                  href    : '',
                  desc    : '',
                },
*/

          var links   = [
          
                { hdr     : 'ffmpeg Documentation',
                  href    : 'https://ffmpeg.org/ffmpeg-all.html',
                  desc    : 'ffmpeg documentation',
                },
                { hdr     : 'mp4reg - cconcolato',
                  href    : 'https://cconcolato.github.io/mp4ra/atoms.html',
                  desc    : 'list of atom type names and other useful stuff',
                },
                { hdr     : 'keyframe insertion',
                  href    : 'https://github.com/vbence/stream-m#fragments',
                  desc    : 'when to insert keyframes and webcam streaming',
                },
                { hdr     : 'atomic parsley',
                  href    : 'https://atomicparsley.sourceforge.net/',
                  desc    : 'simple description of mp4 container',
                },
                { hdr     : 'mp4box.js mp4 reader',
                  href    : 'https://gpac.github.io/mp4box.js/test/filereader.html',
                  desc    : 'utilties from the makes of mp4box.js',
                },
                { hdr     : 'quicktime file format',
                  href    : 'https://developer.apple.com/standards/qtff-2001.pdf',
                  desc    : 'similar to mp4 container',
                },
                { hdr     : 'official iso for mp4 file format',
                  href    : 'https://www.iso.org/search.html?q=mp4',
                  desc    : 'if you want to buy it ~$100',
                },
                { hdr     : 'bento4 website',
                  href    : 'https://www.bento4.com/',
                  desc    : 'download bento4',
                },
                { hdr     : 'gpac mp4box exe official',
                  href    : 'https://github.com/gpac/gpac/wiki',
                  desc    : 'download mp4box official',
                },
                { hdr     : 'mp4box.js',
                  href    : 'https://www.npmjs.com/package/mp4box',
                  desc    : 'npm mp4box.js',
                },
                { hdr     : 'download ffmpeg',
                  href    : 'https://www.ffmpeg.org/download.html',
                  desc    : 'download ffmpeg',
                },
                { hdr     : 'http live streaming',
                  href    : 'https://blog.kyri0s.org/post/271121944/deploying-apples-http-live-streaming-in-a-gnu-linux',
                  desc    : 'some instruction on building ffmpeg',
                },
                { hdr     : 'http live streaming',
                  href    : 'https://blog.kyri0s.org/post/1406637341/free-live-video-streaming-with-http-live-streaming',
                  desc    : 'some instruction on building ffmpeg',
                },
                
          ];
          
      </script>
      
</body>
</html>

`;




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

              wsmod.list.closeall();
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

















