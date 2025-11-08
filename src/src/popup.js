import browser from 'webextension-polyfill';
import getTokenUtil from './get-token-util';
import sendReqUtil from './send-req-util';
import plans from './plans.json';
import engineMap from './engine_map.json';
import config from './config.json';
import locales from './locales/locales';
const main=async ()=>{
  let userLevel=3;
  const logoSectionElem=document.getElementById('divLogoSection');
  const currentDomainElem=document.getElementById('divCurrentDomain');
  const toggleSwitchElem=document.getElementById('inputToggleSwitch');
  const sliderElem=document.getElementById('spanSlider');
  const instructionElem=document.getElementById('divInstruction');
  const usernameElem=document.getElementById('spanUsername');
  const signInElem=document.getElementById('btnSignIn');
  const signOutElem=document.getElementById('btnSignOut');
  const planElem=document.getElementById('aPlan');
  const balanceElem=document.getElementById('spanBalance');
  const tgtLangElem=document.getElementById('selectTgtLang');
  const engineElem=document.getElementById('selectEngine');
  const uiLangElem=document.getElementById('selectUILang');
  const globeIconElem=document.getElementById('svgGlobeIcon');
  const infoIconElem=document.getElementById('svgInfoIcon');
  const tElems=Array.from(document.getElementsByClassName('t-text'));
  const uiLangOptionElems=Array.from(document.getElementsByClassName('ui-lang-option'));
  let {tgtLang,engine,uiLang}=await browser.storage.local.get(['tgtLang','engine','uiLang']);
  const updateInstructionVisibility=()=>{
    instructionElem.style.display=toggleSwitchElem.checked?'block':'none';
  };
  const updateTgtLangElem=()=>{
    tgtLangElem.innerHTML='';
    const optionElems=[];
    for(const x of Object.keys(locales)){
      const optionElem=document.createElement('option');
      optionElem.value=x;
      optionElem.innerText=locales[uiLang][`lang${x.charAt(0).toUpperCase()}${x.slice(1)}`];
      optionElems.push(optionElem);
    }
    optionElems
      .sort((a,b)=>{return a.innerText.localeCompare(b.innerText);})
      .forEach((x)=>{tgtLangElem.appendChild(x);});
    tgtLangElem.value=tgtLang;
  };
  const updateEngineElem=()=>{
    engineElem.innerHTML='';
    for(const [k,v] of Object.entries(engineMap)){
      const optionElem=document.createElement('option');
      optionElem.value=k;
      optionElem.innerText=`${v.name} (${userLevel<v.minLevel?`${locales[uiLang].atLeast} ${plans[v.minLevel]}`:`${v.cpp} cpp${v.isRealtime?'':', '+locales[uiLang].notRealtime}`})`;
      engineElem.appendChild(optionElem);
    }
    engineElem.value=engine;
  };
  const updateT=()=>{
    tElems.forEach((x)=>{
      const tId=x.getAttribute('data-i18n');
      if(tId&&locales[uiLang][tId]){
        x.textContent=locales[uiLang][tId];
      }
    });
  };
  const updateUserSection=async ()=>{
    if(await getTokenUtil(true)){
      signInElem.style.display='none';
      signOutElem.style.display='block';
      let user;
      try{
        user=await sendReqUtil('/get-user');
      }
      catch(err){
        await browser.storage.local.remove('token');
        updateUserSection();
        return;
      }
      usernameElem.textContent=user.email;
      planElem.textContent=plans[user.level];
      userLevel=user.level;
    }
    else{
      usernameElem.textContent='Anonymous';
      signOutElem.style.display='none';
      signInElem.style.display='block';
      planElem.textContent='Free';
      userLevel=0;
    }
    if(userLevel<engineMap[engine].minLevel){
      engine=config.DEFAULT_ENGINE;
      browser.storage.local.set({engine});
    }
    updateEngineElem();
    const {quota}=await sendReqUtil('/get-quota');
    if(quota){
      balanceElem.style.color='#111827';
    }
    else{
      balanceElem.style.color='#E53935';
    }
    balanceElem.innerText=quota;
  };
  const checkTgtLangEngineComp=(tgtLang,engine)=>{
    if(['hr','is'].includes(tgtLang)&&engine==='deepl'){
      alert(locales[uiLang].deeplUnsupportedLanguage);
      return false;
    }
    return true;
  };
  updateT();
  updateTgtLangElem();
  updateEngineElem();
  updateUserSection();
  const [tab]=await browser.tabs.query({
    active:true,
    currentWindow:true,
  });
  const currentDomain=new URL(tab.url).hostname;
  const domainKey=config.DOMAIN_KEY_PREFIX+currentDomain;
  const isEnabledForDomain=(await browser.storage.local.get([domainKey]))[domainKey]!==undefined;
  currentDomainElem.textContent=currentDomain;
  toggleSwitchElem.checked=isEnabledForDomain;
  updateInstructionVisibility();
  logoSectionElem.addEventListener('click',()=>{
    browser.tabs.create({url:config.WEB_URL});
  });
  toggleSwitchElem.addEventListener('change',async (e)=>{
    sliderElem.style.setProperty('--transition','0.2s');
    if(e.target.checked){
      await browser.storage.local.set({[domainKey]:true});
    }
    else{
      await browser.storage.local.remove(domainKey);
    }
    browser.tabs.reload(tab.id);
    updateInstructionVisibility();
  });
  signInElem.addEventListener('click',()=>{
    browser.runtime.sendMessage({
      action:'tryLogin',
      origTabId:tab.id,
    });
    window.close();
  });
  signOutElem.addEventListener('click',async ()=>{
    await browser.storage.local.remove('token');
    updateUserSection();
  });
  planElem.addEventListener('click',(e)=>{
    e.preventDefault();
    browser.tabs.create({url:config.WEB_URL+'/pricing'});
  });
  tgtLangElem.addEventListener('change',(e)=>{
    if(checkTgtLangEngineComp(e.target.value,engine)){
      tgtLang=e.target.value;
      browser.storage.local.set({tgtLang});
    }
    else{
      e.target.value=tgtLang;
    }
  });
  engineElem.addEventListener('change',(e)=>{
    if(checkTgtLangEngineComp(tgtLang,e.target.value)){
      if(userLevel>=engineMap[e.target.value].minLevel){
        engine=e.target.value;
        browser.storage.local.set({engine});
      }
      else{
        browser.tabs.create({url:config.WEB_URL+'/pricing'});
      }
    }
    else{
      e.target.value=engine;
    }
  });
  globeIconElem.addEventListener('click',()=>{
    if(uiLangElem.style.display==='block'){
      uiLangElem.style.display='none';
    }
    else{
      uiLangOptionElems.forEach((x)=>{
        x.classList.remove('ui-lang-option-selected');
        if(x.getAttribute('data-value')===uiLang){
          x.classList.add('ui-lang-option-selected');
        }
      });
      uiLangElem.style.display='block';
    }
  });
  infoIconElem.addEventListener('click',()=>{
    alert(`NekoTranslate Browser Extension version ${config.VERSION_NUMBER}`);
  });
  uiLangOptionElems.forEach((x)=>{
    x.addEventListener('click',async (e)=>{
      uiLang=e.target.getAttribute('data-value');
      browser.storage.local.set({uiLang});
      updateT();
      updateTgtLangElem();
      updateEngineElem();
      uiLangElem.style.display='none';
    });
  });
  document.addEventListener('click',(e)=>{
    if(!globeIconElem.contains(e.target)){
      uiLangElem.style.display='none';
    }
  });
};
main();

