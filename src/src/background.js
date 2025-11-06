import browser from 'webextension-polyfill';
import getTokenUtil from './get-token-util';
import sendReqUtil from './send-req-util';
import locales from './locales/locales';
import config from './config.json';
const rebuildCtxMenu=async ()=>{
  await browser.contextMenus.removeAll();
  const patterns=Object.keys(await browser.storage.local.get(null))
    .filter(key=>key.startsWith(config.DOMAIN_KEY_PREFIX))
    .map(key=>key.substring(config.DOMAIN_KEY_PREFIX.length))
    .map(domain=>`*://${domain}/*`);
  if(!patterns.length){
    return;
  }
  const {uiLang}=await browser.storage.local.get(['uiLang']);
  browser.contextMenus.create({
    id:config.CTX_MENU_ITEM_ID,
    title:locales[uiLang].sendToNekoTranslate,
    contexts:['image'],
    documentUrlPatterns:patterns,
  });
};
const initAddon=async ()=>{
  let uiLang=(navigator.language||navigator.userLanguage).split('-')[0];
  if(!locales[uiLang]){
    uiLang='en';
  }
  const settings=await browser.storage.local.get({
    tgtLang:'en',
    engine:config.DEFAULT_ENGINE,
    uiLang,
  });
  await browser.storage.local.set(settings);
  rebuildCtxMenu();
};
browser.runtime.onInstalled.addListener(initAddon);
browser.runtime.onStartup.addListener(initAddon);
browser.runtime.onMessage.addListener(async (message,sender)=>{
  if(message.action==='goTl'){
    const {tgtLang,engine}=await browser.storage.local.get(['tgtLang','engine']);
    const body=new FormData();
    body.append('tgt_lang',tgtLang);
    body.append('engine',engine);
    const reportFailure=()=>{
      browser.tabs.sendMessage(sender.tab.id,{
        action:'doneTl',
        success:false,
        tlId:message.tlId,
      });
    };
    try{
      const imgRes=await fetch(message.imgUrl);
      if(imgRes.status!==200){
        throw new Error();
      }
      const imgBlob=await imgRes.blob();
      body.append('files',imgBlob,'1.jpeg');
    }
    catch{
      reportFailure();
      return;
    }
    let res;
    while(!res){
      try{
        res=await sendReqUtil('/translate',body);
      }
      catch(err){
        if(err.message==='quota_exceeded'){
          if(await getTokenUtil(true)){
            browser.tabs.create({url:config.WEB_URL+'/pricing'});
          }
          else if(await getTokenUtil(false,sender.tab.id)){
            continue;
          }
        }
        reportFailure();
        return;
      }
    }
    const mangaId=res.manga_id;
    while(true){
      const success=await new Promise(resolve=>{
        let timeout=null;
        const ws=new WebSocket(config.API_URL+'/ws');
        const pingApi=()=>{
          ws.send(JSON.stringify({
            name:'ping',
          }));
        };
        ws.addEventListener('open',()=>{
          pingApi();
          ws.send(JSON.stringify({
            name:'sub4manga',
            payload:mangaId,
          }));
        });
        ws.addEventListener('message',async (e)=>{
          const msg=JSON.parse(e.data);
          if(msg.name==='pong'){
            timeout=setTimeout(pingApi,config.WS_PING_INTERVAL);
            return;
          }
          if(!['ack','manga_update'].includes(msg.name)){
            return;
          }
          const manga=await sendReqUtil(`/get-manga/${mangaId}`);
          if(['pending','processing'].includes(manga.state)){
            return;
          }
          browser.tabs.sendMessage(sender.tab.id,{
            action:'doneTl',
            success:manga.state==='completed',
            resultUrl:`${config.API_URL}/static/mangas/${mangaId}/1.jpeg`,
            tlId:message.tlId,
          });
          resolve(true);
          ws.close();
        });
        ws.addEventListener('close',()=>{
          if(timeout!==null){
            clearTimeout(timeout);
          }
          resolve(false);
        });
      });
      if(success){
        break;
      }
    }
  }
  else if(message.action==='tryLogin'){
    getTokenUtil(false,message.origTabId);
  }
});
browser.contextMenus.onClicked.addListener(async (info,tab)=>{
  if(info.menuItemId===config.CTX_MENU_ITEM_ID){
    browser.tabs.sendMessage(tab.id,{action:'signalAck'});
  }
});
browser.storage.onChanged.addListener((changes,areaName)=>{
  if(areaName!=='local'){
    return;
  }
  for(const x in changes){
    if(x==='uiLang'||x.startsWith(config.DOMAIN_KEY_PREFIX)){
      rebuildCtxMenu();
      break;
    }
  }
});

