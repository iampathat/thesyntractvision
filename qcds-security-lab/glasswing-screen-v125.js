/* Project Glasswing v1.26 — ONE cinematic intro, then the Security Lab.
   Theory and creation by Patrik Sundblom.
   with OpenAI / ChatGPT as research & development support.
   The cinematic retains the existing video artwork; no second landing screen. */
(()=>{
  'use strict';
  const film=document.getElementById('gw-film');
  const video=document.getElementById('gw-film-video');
  const app=document.getElementById('app');
  let finishTimer=0,playDeadline=0,returnFocus=null;
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
    clearTimeout(playDeadline);
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
    clearTimeout(playDeadline);
    film.classList.add('gw-film-ending');
    finishTimer=setTimeout(enter,430);
  };
  const play=(fromButton=null)=>{
    if(!film||!video){enter();return;}
    returnFocus=fromButton;
    clearTimeout(finishTimer);
    clearTimeout(playDeadline);
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
      status('Intro video unavailable. Opening Security Lab.');
      finish();
    });
    // Even if Safari never fires ended/error, never leave the app locked.
    playDeadline=setTimeout(finish,4800);
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
  const deepLink=Boolean(location.hash && location.hash!=='#home');
  const updateOrEntry=['skip_intro','settings','refreshed','glasswing_refresh']
    .some(key=>params.has(key));
  const reducedMotion=typeof matchMedia==='function' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches;
  let previouslyEntered=false;
  try{previouslyEntered=sessionStorage.getItem('qcds-glasswing-entered')==='1'}
  catch{ /* No session storage: skip only explicit deep links and refreshes. */ }
  const requestedReplay=params.has('watch_intro');
  if(!requestedReplay && (updateOrEntry||deepLink||previouslyEntered||reducedMotion)){
    if(film)film.hidden=true;
    block(false);
  }else{
    // One cinematic entrance per session, never an update/cache gate.
    try{sessionStorage.setItem('qcds-glasswing-entered','1')}catch{}
    play();
  }
})();
