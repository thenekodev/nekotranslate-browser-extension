import browser from 'webextension-polyfill';
import getAncestorsUtil from './get-ancestors-util';
import config from './config.json';
const main=async ()=>{
  const currentDomain=new URL(window.location.href).hostname;
  const domainKey=config.DOMAIN_KEY_PREFIX+currentDomain;
  const isEnabledForDomain=(await browser.storage.local.get([domainKey]))[domainKey]!==undefined;
  if(!isEnabledForDomain){
    return;
  }
  const shadowHost=document.createElement('div');
  document.body.appendChild(shadowHost);
  const shadowRoot=shadowHost.attachShadow({mode:'closed'});
  const styleElem=document.createElement('style');
  styleElem.textContent = `
    * {
      all: unset;
      display: revert;
    }
    :host {
      all: initial;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 9999;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    .overlay {
      position: absolute;
      background-color: #00000066;
    }
    .anim, .result {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
    }
    .anim {
      background-color: #FFFFFF33;
      animation: load-anim-1 ${config.NOTICE_AFTER}ms linear;
    }
    .result {
      object-fit: contain;
    }
    @keyframes load-anim-1 {
      0% {
        width: 0;
      }
      100% {
        width: 100%;
      }
    }
    @keyframes load-anim-2 {
      0% {
        width: 0;
      }
      100% {
        width: 95%;
      }
    }
  `;
  shadowRoot.appendChild(styleElem);
  let rightClickedElem=null;
  let tlIdCntr=0;
  let overlays=new Map();
  document.addEventListener('contextmenu',(e)=>{
    e.stopImmediatePropagation();
    rightClickedElem=e.target;
  },true);
  browser.runtime.onMessage.addListener(async (message)=>{
    if(message.action==='signalAck'){
      if(!rightClickedElem||!(['IMG','CANVAS'].includes(rightClickedElem.tagName))){
        return;
      }
      const tlId=++tlIdCntr;
      const tgtElem=rightClickedElem;
      const overlayElem=document.createElement('div');
      overlayElem.className='overlay';
      const animElem=document.createElement('div');
      animElem.addEventListener('animationend',()=>{
        animElem.style.animation='load-anim-2 30s linear forwards';
      });
      animElem.className='anim';
      overlayElem.appendChild(animElem);
      const updOverlay=()=>{
        if(!shadowRoot.contains(overlayElem)||!document.body.contains(tgtElem)){
          return;
        }
        const bbox=tgtElem.getBoundingClientRect();
        const compStyle=window.getComputedStyle(tgtElem);
        overlayElem.style.top=`${bbox.top+window.scrollY}px`;
        overlayElem.style.left=`${bbox.left+window.scrollX}px`;
        overlayElem.style.width=`${bbox.width}px`;
        overlayElem.style.height=`${bbox.height}px`;
        overlayElem.style.display=compStyle.display==='none'?'none':'block';
        overlayElem.style.visibility=compStyle.visibility;
        overlayElem.style.opacity=compStyle.opacity;
      };
      shadowRoot.appendChild(overlayElem);
      updOverlay();
      const ancestors=getAncestorsUtil(tgtElem);
      ancestors.forEach(x=>{
        x.addEventListener('scroll',updOverlay,{passive:true});
        x.addEventListener('resize',updOverlay,{passive:true});
      });
      const observer=new MutationObserver((mutations)=>{
        updOverlay();
        let shallCleanup=false;
        if(!document.body.contains(tgtElem)){
          shallCleanup=true;
        }
        mutations.forEach(x=>{
          if(x.type==='attributes'&&x.attributeName==='src'&&x.target===tgtElem){
            shallCleanup=true;
          }
        });
        if(shallCleanup){
          cleanup();
        }
      });
      const cleanup=()=>{
        overlays.delete(tlId);
        ancestors.forEach(x=>{
          x.removeEventListener('scroll',updOverlay);
          x.removeEventListener('resize',updOverlay);
        });
        observer.disconnect();
        if(shadowRoot.contains(overlayElem)){
          shadowRoot.removeChild(overlayElem);
        }
      };
      observer.observe(document.body,{
        childList:true,
        subtree:true,
        attributes:true,
        attributeFilter:['id','class','style','src'],
      });
      overlays.set(tlId,{
        overlayElem,
        cleanup,
      });
      let canvas;
      if(tgtElem.tagName==='CANVAS'){
        canvas=tgtElem;
      }
      else{
        canvas=document.createElement('canvas');
        canvas.width=tgtElem.naturalWidth;
        canvas.height=tgtElem.naturalHeight;
        canvas.getContext('2d').drawImage(tgtElem,0,0);
      }
      let imgUrl;
      try{
        imgUrl=canvas.toDataURL();
      }
      catch{
        if(tgtElem.tagName==='IMG'){
          imgUrl=tgtElem.src;
        }
        else{
          cleanup();
          return;
        }
      }
      browser.runtime.sendMessage({
        action:'goTl',
        imgUrl:imgUrl,
        tlId:tlId,
      });
    }
    else if(message.action==='doneTl'){
      const {overlayElem,cleanup}=overlays.get(message.tlId);
      if(message.success){
        const resultElem=document.createElement('img');
        resultElem.className='result';
        resultElem.addEventListener('load',()=>{
          overlayElem.appendChild(resultElem);
        });
        resultElem.src=message.resultUrl;
      }
      else{
        cleanup();
      }
    }
  });
};
main();

