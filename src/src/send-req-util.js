import getTokenUtil from './get-token-util';
import config from './config.json';
const sendReqUtil=async(endpoint,body)=>{
  const headers={};
  if(body&&body.constructor.name==='Object'){
    headers['Content-Type']='application/json';
    body=JSON.stringify(body);
  }
  const token=await getTokenUtil(true);
  if(token){
    headers['Authorization']=`Bearer ${token}`;
  }
  const res=await fetch(config.API_URL+endpoint,{
    method:body?'POST':'GET',
    headers:headers,
    body:body,
  });
  const resBody=await res.json();
  if(res.status!==200){
    throw new Error(resBody.detail);
  }
  return resBody;
};
export default sendReqUtil;

