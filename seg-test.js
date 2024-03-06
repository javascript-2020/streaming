

<video id=video controls autoplay></video>

<br><br>

<input id=startbtn type=button value=start>
<input id=stopbtn type=button value=stop>


<script src='https://localhost:3011/dist/mp4box.all.min.js'></script>


<script>
/*

//seg-test.js:d

05-03-24

*/



        var autoplay      = true;
        var auto          = true;
        var abort;
        
        var offset        = 0;
        var chunksize     = 1024*1024;
        var pending       = false;
        
        var mediasource   = new MediaSource();
        var mp4           = MP4Box.createFile();
        var dur;
        var eos;
        
        
        
        
        
        stopbtn.onclick   = e=>{
                                                                                  console.log('stopbtn');
              abort   = true;
        }
        
        startbtn.onclick=e=>{
                                                                                  console.log('startbtn');
              video.src         = URL.createObjectURL(mediasource);
              video.play();
        }
        
        
        function start(){
        
              video.play();
              
        }//start
        
        
        video.onplaying=function(e){
                                                                                    console.log('onplaying');
              auto    = false;
              
        }//onplaying
        
        
        video.ontimeupdate=function(e){
                                                                                    console.log('ontimeupdate',video.buffered.length);
                  auto      = false;
                  
                  var cur   = video.currentTime;
                  var n     = video.buffered.length;
                  for(var i=0;i<n;i++){
                  
                        var start   = video.buffered.start(i);
                        var end     = video.buffered.end(i);
                        
                        if(start<=cur && end>=cur){
                                                                                    console.log(start,cur,end);
                              if(end-cur<10){
                                    download();
                              }
                              return;
                        }
                  }//for
                  
                  download();
                  
        }//ontimeupdate
        
        
        video.onerror=function(e){
        
              console.log(video.error);
              
        }//onerror
        
        
        video.onseeking=function(e){
        
              if(video.lastSeekTime===video.currentTime){
                    return;
               }
                                                                              console.log('seek');
                                                                              
              eos   = false;
              
          		seek_info   = mp4.seek(video.currentTime,true);
            
            
          		if(mediasource.sampleNum){
              			mp4.releaseUsedSamples(mediasource.id,mediasource.sampleNum);
              			delete mediasource.sampleNum;
              }
              removepending();
              removebuffer(video.currentTime);
          		mp4.flush();
            
                                                                                //console.log(seek_info);
              offset    = seek_info.offset;
              auto      = true;
              if(pending){
                                                                                //console.log('pending');
                    download.abort    = offset;
              }else{
                    download();
              }
              
              video.lastSeekTime    = video.currentTime;
              
        }//onseeking
        
        
  //:
  
  
        function removebuffer(time){
        
              var n   = mediasource.sourceBuffers.length;
              for(var i=0;i<n;i++){
              
                    var sb    = mediasource.sourceBuffers[i];
                    sb.remove(0,time);
                    //sb.remove(time,dur);
                    
              }//for
              
        }//removebuffer
        
        
        function removepending(){
        
              var n   = mediasource.sourceBuffers.length;
              for(var i=0;i<n;i++){
              
                    var sb    = mediasource.sourceBuffers[i];
                    var nj    = sb.pendingAppends.length;
                    for(var j=0;j<nj;j++){
                    
                          var obj   = sb.pendingAppends[j];
                    			mp4.releaseUsedSamples(obj.id,obj.sampleNum);
                       
                    }//for
                    
              }//removepending
              
        }//removepending
        
        
        function endofstream(){
        
              var n   = mediasource.sourceBuffers.length;
              for(var i=0;i<n;i++){
              
                    var sb    = mediasource.sourceBuffers[i];
                    if(sb.updating){
                          return;
                    }
                    
              }//for
              if(mediasource.readyState!=='open'){
                    return;
              }
    		                                                                      console.log('end of stream');
    			    mediasource.endOfStream();
           
        }//endofstream
        
        
  //:
  
  
        mediasource.onsourceopen=function(e){
                                                                                  //console.log('onsourceopen');
              download();
              
        }//onsourceopen
        
        
        mediasource.onerror=function(e){
        }//onerror
        
        
  //:
  
  
        mp4.onSamples=function(id,user,samples){console.log('onsamples')}
        
        
        mp4.onSidx=function(sidx){console.log('sidx',sidx)}
        
        
        mp4.onItem=function(item){console.log('onitem')}
        
        
        mp4.onSegment=function(id,user,buffer,sampleNum,is_last){
                                                                                    //console.log('onsegment');
          		var sb    = user;
          		sb.segmentIndex++;
          		sb.pendingAppends.push({id,buffer,sampleNum,is_last});
          		onUpdateEnd.call(sb,true,false);
            
        }//onsegment
        
        
        mp4.onReady=function(info){
                                                                                        //console.log('onready',info.tracks.length);
          		if (info.isFragmented) {
          		      dur   = info.fragment_duration/info.timescale;
          		} else {
          			    dur   = info.duration/info.timescale;
          		}
              if(!isNaN(dur)){
        	          mediasource.duration    = dur;
        	    }
        	                                                                                console.log(dur);
          		for(var i=0;i<info.tracks.length;i++){
            
              			var track                 = info.tracks[i];
                  	var track_id              = track.id;
                  	var codec                 = track.codec;
                  	var mime                  = 'video/mp4; codecs=\"'+codec+'\"';
                                                                                        //console.log(i,track_id,mime,mediasource.readyState);
              			var sb    = mediasource.addSourceBuffer(mime);
                 
              			sb.onerror=function(e){
                                                                                        console.log('sourcebuffer error',e);
                    }
                    
              			sb.ms               = mediasource;
              			sb.id               = track_id;
              			sb.pendingAppends   = [];
                 
              			mp4.setSegmentOptions(track_id,sb,{nbSamples:100});
                 
              }//for
              
              
            	var initSegs    = mp4.initializeSegmentation();
             
            	for(var i=0;i<initSegs.length;i++){
             
                		var sb    = initSegs[i].user;
                		if(i===0){
                			    sb.ms.pendingInits    = 0;
                		}
                  
                		sb.addEventListener('updateend',onInitAppended);
                		sb.appendBuffer(initSegs[i].buffer);
                  
                		sb.segmentIndex   = 0;
                		sb.ms.pendingInits++;
                  
              }//for
              
        }//onready
        
        
        function onInitAppended(e) {
                                                                              //console.log('onInitAppended');
            	var sb    = e.target;
            	if (sb.ms.readyState === "open") {
                		sb.sampleNum    = 0;
                		sb.removeEventListener('updateend',onInitAppended);
                		sb.addEventListener('updateend',onUpdateEnd.bind(sb,true,true));
                		                                                      /* In case there are already pending buffers we call onUpdateEnd to start appending them*/
                		onUpdateEnd.call(sb,false,true);
                  
                		sb.ms.pendingInits--;
                  
                		if(autoplay && sb.ms.pendingInits===0){
                			    mp4.start();
                		}
            	}
             
        }//oninitappend
        
        
        
        function onUpdateEnd(isNotInit,isEndOfAppend){
                                                                                          //console.log('onupdateend',this.sampleNum,isEndOfAppend);
            	if(isEndOfAppend===true){
                		if(this.sampleNum){
                    			mp4.releaseUsedSamples(this.id,this.sampleNum);
                    			delete this.sampleNum;
                		}
                		if(eos){
                		      endofstream(this);
                		}
            	}
             
            	if(this.ms.readyState==='open' && this.updating===false && this.pendingAppends.length>0){
             
                		var obj = this.pendingAppends.shift();
                		                                                                  Log.info("MSE - SourceBuffer #"+this.id, "Appending new buffer, pending: "+
                		                                                                            this.pendingAppends.length
                		                                                                  );
                		this.sampleNum = obj.sampleNum;
                		this.is_last = obj.is_last;
                		this.appendBuffer(obj.buffer);
            	}
             
        }//onupdateend
        
        
        
        
  //:
  
  
  
        async function download(){
        
              if(pending){
                                                                                      console.log('download pending');
                    return;
              }
              pending   = true;
              eos       = false;
                                                                                      console.log('download',offset,offset+chunksize);
              var opts      = {
                    method    : 'get',
                    headers   : {
                          'range'   : `bytes=${offset}-${offset+chunksize}`
                    }
              };
              var res       = await fetch('http://localhost:3012/',opts);
              var reader    = res.body.getReader();
              
              var range   = res.headers.get('content-range');
              var i       = range.indexOf('/');
              var size    = parseInt(range.slice(i+1));
              var total   = 0;
              var parts     = [];
                                                                                      //console.log('size',size);
              while(true){
              
                    var {done,value}    = await reader.read();
                    if(done){
                          complete();
                          return;
                    }
                    total  += value.length;
                                                                                      //console.log(value.length,total,chunksize);
                    parts.push(value);
                    
              }//while
              
              
              function complete(){
                                                                                      console.log('fetch.complete');
                    if(download.abort){
                          pending           = false;
                          offset            = download.abort;
                          download.abort    = null;
                          download();
                          return;
                    }
                                                                                      //console.log('complete');
                    var buf         = concat(parts);
                    buf.fileStart   = offset;
                    
                    if(offset+chunksize>=size){
                          eos   = true;
                    }
                    
                    download.complete(buf);
                    
              }//complete
              
        }//download
        
        
        download.complete=function(response){
                                                                                      console.log('download.complete');
          			mp4.appendBuffer(response);
             
                pending   = false;
        		    offset   += chunksize;
              
          			if(eos){
          				    mp4.flush();
          			}
             
                if(auto){
        		          download();
        		    }
              
        }//download.complete
        
        
        function concat(views){
        
              let length = 0
              for(var v of views){
              
                    length   += v.byteLength;
                    
              }//for
              
              var buf       = new Uint8Array(length);
              var offset    = 0;
              for(var v of views){
              
                      const uint8view   = new Uint8Array(v.buffer,v.byteOffset,v.byteLength);
                      buf.set(uint8view,offset);
                      offset   += uint8view.byteLength;
                      
              }//for
              return buf.buffer;
              
        }//concat
        
        
        
        
</script>







