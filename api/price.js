import {GAMES,parseEuro} from '../public/core.js';
const cache=new Map(); let nextFetch=0;
export default async function handler(req,res){
  res.setHeader('Content-Type','application/json');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Use GET.'});}
  const url=new URL(req.url,'http://localhost');const appid=Number(url.searchParams.get('appid'));const name=(url.searchParams.get('name')||'').trim();
  if(!GAMES[appid]||!name||name.length>180||/[\x00-\x1f]/.test(name))return res.status(400).json({error:'Choose a supported game and exact market name.'});
  const key=`${appid}:${name}`;const cached=cache.get(key);
  if(cached&&Date.now()-cached.time<600000){res.setHeader('Cache-Control','public, s-maxage=600');return res.status(200).json(cached.data);}
  if(Date.now()<nextFetch){res.setHeader('Retry-After','5');return res.status(429).json({error:'Give Steam a moment. Try again in a few seconds.'});}
  nextFetch=Date.now()+3000;
  try{
    const endpoint=new URL('https://steamcommunity.com/market/priceoverview/');endpoint.search=new URLSearchParams({appid:String(appid),currency:'3',market_hash_name:name});
    const upstream=await fetch(endpoint,{signal:AbortSignal.timeout(9000),redirect:'error',headers:{Accept:'application/json'}});
    if(upstream.status===429){nextFetch=Date.now()+60000;res.setHeader('Retry-After','60');return res.status(429).json({error:'Steam is limiting requests. Try again later.'});}
    if(!upstream.ok)throw Error('Steam is unavailable.');
    const body=await upstream.text();if(body.length>16384)throw Error('Unexpected response.');const quote=JSON.parse(body);
    const price=parseEuro(quote.lowest_price);
    if(!quote.success||price===null)return res.status(404).json({error:'No current listing found. Check the exact name on Steam, or record a price manually.'});
    const data={price,median:parseEuro(quote.median_price),volume:typeof quote.volume==='string'?quote.volume.slice(0,30):null,at:new Date().toISOString(),source:'Steam price overview',currency:'EUR'};
    if(cache.size>=300)cache.delete(cache.keys().next().value);cache.set(key,{time:Date.now(),data});
    res.setHeader('Cache-Control','public, s-maxage=600');return res.status(200).json(data);
  }catch{return res.status(502).json({error:'Steam did not return a usable quote. Your saved prices are unchanged. You can record a price manually.'});}
}
