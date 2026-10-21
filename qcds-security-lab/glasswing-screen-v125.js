/* Project Glasswing v1.26 — ONE cinematic intro, then the Security Lab.
   Theory and creation by Patrik Sundblom.
   with OpenAI / ChatGPT as research & development support.
   The cinematic retains the existing video artwork; no second landing screen. */
(()=>{
  'use strict';
  const film=document.getElementById('gw-film');
  const video=document.getElementById('gw-film-video');
  const app=document.getElementById('app');
  let finishTimer=0,returnFocus=null;
  const status=(message)=>{
    const note=film?.querySelector('[data-film-status]');
    if(note){note.textContent=message;note.hidden=!message;}
  };
  const block=(yes)=>{
    document.body.classList.toggle('gw-entry-active',yes);
    if(app)app.inert=yes;
  };
  const enter=()=>{
    clearTimeout(finishTimer);
    if(video){video.pause();try{video.currentTime=0;}catch{}}
    if(film){film.hidden=true;film.classList.remove('gw-film-ending');}
    block(false);
    if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
    // App content is created asynchronously; no forced focus before it exists.
    returnFocus=null;
  };
  const finish=()=>{
    if(!film||film.hidden)return;
    clearTimeout(finishTimer);
    film.classList.add('gw-film-ending');
    finishTimer=setTimeout(enter,430);
  };
  const play=(fromButton=null)=>{
    if(!film||!video){enter();return;}
    returnFocus=fromButton;
    clearTimeout(finishTimer);
    film.hidden=false;
    film.classList.remove('gw-film-ending');
    block(true);
    status('');
    video.muted=true; // Required for reliable mobile autoplay.
    video.playsInline=true;
    try{video.currentTime=0;}catch{}
    const started=video.play();
    if(started?.catch)started.catch(err=>{
      console.warn('Project Glasswing intro playback unavailable',err);
      status('Video could not start. Choose Enter Security Lab to continue.');
    });
  };
  if(video){
    video.addEventListener('ended',finish);
    video.addEventListener('error',()=>{
      status('Intro video is unavailable. Choose Enter Security Lab to continue.');
    });
  }
  document.addEventListener('click',event=>{
    const target=event.target;
    const enterButton=target.closest('[data-film-skip],[data-enter-lab]');
    if(enterButton){event.preventDefault();enter();return;}
    const replay=target.closest('[data-watch-intro],[data-replay-intro]');
    if(replay){event.preventDefault();play(replay);return;}
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&film&&!film.hidden)enter();
  });
  const params=new URLSearchParams(location.search);
  if(params.has('skip_intro')||params.has('settings')){
    if(film)film.hidden=true;
    block(false);
  }else{
    // There is no secondary landing screen and no session-storage intro gate.
    play();
  }
})();
