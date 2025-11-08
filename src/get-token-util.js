import browser from 'webextension-polyfill';
import config from './config.json';
const getTokenUtil=async (isStrict,origTabId)=>{
  const {token}=await browser.storage.local.get(['token']);
  if(token){
    return token;
  }
  else if(isStrict){
    return null;
  }
  const loginTab=await browser.tabs.create({url:config.WEB_URL+'/login'});
  return new Promise((resolve)=>{
    browser.tabs.onUpdated.addListener(async function listener(tabId,info){
      if(tabId!==loginTab.id||info.status!=='complete'){
        return;
      }
      browser.tabs.onUpdated.removeListener(listener);
      let token;
      if(browser.scripting?.executeScript){
        const results=await browser.scripting.executeScript({
          target:{tabId:loginTab.id},
          function:()=>{
            return localStorage.getItem('token');
          },
        });
        if(browser.runtime.lastError||!results||!results[0]){
          resolve(null);
          return;
        }
        token=results[0].result;
      }
      else{
        const results=await browser.tabs.executeScript(loginTab.id,{
          code:'localStorage.getItem("token")',
        });
        token=results[0];
      }
      await browser.storage.local.set({token});
      if(token){
        if(origTabId){
          await browser.tabs.update(origTabId,{active:true});
        }
        await browser.tabs.remove(loginTab.id);
      }
      resolve(token);
    });
  });
};
export default getTokenUtil;

