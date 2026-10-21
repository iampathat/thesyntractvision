/* Project Glasswing: dedicated fullscreen landing and REAL eagle motion cinema.
   Theory and creation by Patrik Sundblom, OpenAI / ChatGPT as R&D support.
   No mesh distortion, clipped sprites, or blocking service-worker operations. */
(()=>{
 'use strict';
 const landing=document.getElementById('gw-landing');
 const film=document.getElementById('gw-film');
 const video=document.getElementById('gw-film-video');
 const app=document.getElementById('app');
 let fromLanding=false,returnFocus=null,endTimer=0;
 const setBlocked=blocked=>{
   document.body.classList.toggle('gw-entry-active',blocked);
   if(app)app.inert=blocked;
 };
 const showLanding=()=>{
   if(film){film.hidden=true;film.classList.remove('gw-film-ending');}
   if(landing) landing.hidden=false;
   setBlocked(!!landing);
 };
 const enter=()=>{
   if(video){video.pause();video.currentTime=0;}
   if(film)film.hidden=true;
   if(landing)landing.hidden=true;
   clearTimeout(endTimer);
   setBlocked(false);
   document.getElementById('app')?.querySelector('a[href="#home"],button[data-action="new"]')?.focus?.({preventScroll:true});
 };
 const finish=()=>{
   if(!film||film.hidden)return;
   if(video)video.pause();
   clearTimeout(endTimer);
   film.hidden=true;
   film.classList.remove('gw-film-ending');
   if(fromLanding && landing){showLanding();landing.querySelector('[data-enter-lab]')?.focus?.({preventScroll:true});}
   else {setBlocked(false);returnFocus?.focus?.({preventScroll:true});}
   returnFocus=null;
 };
 const conclude=()=>{
   if(!film||film.hidden)return;
   film.classList.add('gw-film-ending');
   clearTimeout(endTimer);
   endTimer=setTimeout(finish,1000);
 };
 const play=fromButton=>{
   if(!film||!video)return;
   fromLanding=!!landing&&!landing.hidden;
   returnFocus=fromButton||null;
   if(landing)landing.hidden=true;
   film.classList.remove('gw-film-ending');
   film.hidden=false;
   setBlocked(true);
   video.currentTime=0;
   video.muted=false;
   video.play().catch(err=>{
      console.warn('Glasswing cinematic could not start:',err);
      // Nothing auto-disappears if playback is blocked: clear Skip remains usable.
      const note=film.querySelector('[data-film-status]');
      if(note){note.textContent='Playback unavailable. Select Skip intro to continue.';note.hidden=false;}
   });
   film.querySelector('[data-film-skip]')?.focus?.({preventScroll:true});
 };
 if(video){video.addEventListener('ended',conclude);video.addEventListener('error',()=>{
    const note=film?.querySelector('[data-film-status]');
    if(note){note.textContent='The film could not load. Select Skip intro to continue.';note.hidden=false;}
 });}
 if(landing)landing.hidden=false; // ALWAYS visible, no sessionStorage surprises.
 if(film)film.hidden=true;
 setBlocked(!!landing);
 document.addEventListener('click',e=>{
   const go=e.target.closest('[data-enter-lab]');if(go){e.preventDefault();enter();return;}
   const watch=e.target.closest('[data-watch-intro],[data-replay-intro]');if(watch){e.preventDefault();play(watch);return;}
   const skip=e.target.closest('[data-film-skip]');if(skip){e.preventDefault();finish();return;}
   const home=e.target.closest('[data-open-landing]');if(home){e.preventDefault();if(landing)showLanding();else location.assign('./?welcome=1');}
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&film&&!film.hidden)finish();});
})();