import {newRoom,changeRoom,viewRoom,seatOf,RoomError} from './rooms.js';
import {RoomStore} from './store.js';

const CODE_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export async function hashToken(token){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));return [...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
export async function roomApi(request,env){
  try{
    if(!env.DB)throw new RoomError('Online rooms are not connected yet. Pass & Play and Panda Bot are ready.',503);
    if(request.method!=='POST')return json({error:'Use POST for room actions.'},405);
    const url=new URL(request.url),origin=request.headers.get('Origin');
    if(origin&&origin!==url.origin)throw new RoomError('Please open the game directly to play.',403);
    if(!request.headers.get('Content-Type')?.includes('application/json'))throw new RoomError('JSON required.',415);
    const raw=await request.text();if(raw.length>2048)throw new RoomError('Request too large.',413);
    let input;try{input=JSON.parse(raw);}catch{throw new RoomError('Invalid request.');}
    if(!input||Array.isArray(input)||typeof input!=='object')throw new RoomError('Invalid request.');
    const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');
    if(!token||!/^[a-f0-9]{64}$/.test(token))throw new RoomError('Please reopen your room on this device.',401);
    const identity=await hashToken(token),store=new RoomStore(env.DB),parts=url.pathname.split('/').filter(Boolean);
    const action=parts.length===2?'create':parts[3];
    if(!['create','join','sync','move','leave','rematch'].includes(action)||parts.length!==(action==='create'?2:4))throw new RoomError('Room action not found.',404);
    if(action==='create'||action==='join'){
      const ip=request.headers.get('CF-Connecting-IP')||request.headers.get('X-Local-IP')||'local';
      const rateKey=await hashToken(`${ip}:${action}`);
      if(!await store.limit(rateKey,Math.floor(Date.now()/3600000),action==='create'?15:120))throw new RoomError('Too many room attempts. Please try again later.',429);
    }
    if(action==='create'){
      await store.cleanup(Date.now());
      // Creation retries use the same random token, which also determines the code.
      const code=[...identity.slice(0,12).matchAll(/../g)].map(m=>CODE_ALPHABET[parseInt(m[0],16)%32]).join('');
      const room=newRoom(code,identity);if(await store.insert(room))return json({...viewRoom(room,1),revision:0},201);
      const existing=await store.get(code);if(existing.room.host===identity&&!existing.room.closed&&existing.room.expires>Date.now())return json({...viewRoom(existing.room,1),revision:existing.revision});
      throw new RoomError('Room code collision. Please create a new room.',409);
    }
    const code=parts[2];if(!/^[A-HJ-NP-Z2-9]{6}$/.test(code))throw new RoomError('Enter the six-character room code.');
    for(let attempt=0;attempt<8;attempt++){
      const found=await store.get(code);if(!found)throw new RoomError('No panda room with that code. Check it and try again.',404);
      const {room,revision}=found,result=changeRoom(room,identity,action,input);
      if(!result.dirty||await store.compareAndSet(room,revision))return json({...viewRoom(room,result.seat),revision:revision+(result.dirty?1:0)});
    }
    throw new RoomError('The room is busy. Your board will reconnect shortly.',409);
  }catch(error){if(!(error instanceof RoomError))console.error('Room service error',error.message);return json({error:error instanceof RoomError?error.message:'The bamboo connection is resting. Please try again.'},error.status||503);}
}
