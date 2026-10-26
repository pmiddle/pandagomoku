function freshToken(){return [...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('');}
function save(key,value){try{localStorage.setItem(key,value);}catch{throw new Error('Allow storage for this site so your room can reconnect after a refresh.');}}
function read(key){try{return localStorage.getItem(key);}catch{return null;}}
export function savedRoom(){return read('panda:last-room');}
export function forgetRoom(){try{localStorage.removeItem('panda:last-room');localStorage.removeItem('panda:pending-create');}catch{}}
async function request(code,action,token,data={}){
  let response;
  try{response=await fetch(code?`/api/rooms/${code}/${action}`:'/api/rooms',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(data),signal:AbortSignal.timeout(10000),cache:'no-store'});}catch{throw new Error('Connection lost. Your seat is saved; reconnecting…');}
  let result;try{result=await response.json();}catch{throw new Error('Online rooms need the game server. Local modes still work.');}
  if(!response.ok){const error=new Error(result.error||'The room could not be reached.');error.status=response.status;throw error;}return result;
}
export async function createRoom(){
  let token=read('panda:pending-create');if(!token){token=freshToken();save('panda:pending-create',token);}
  try{const state=await request(null,'create',token);save(`panda:seat:${state.code}`,token);save('panda:last-room',state.code);try{localStorage.removeItem('panda:pending-create');}catch{}return {state,token};}
  catch(error){if(error.status&&error.status!==503){try{localStorage.removeItem('panda:pending-create');}catch{}}throw error;}
}
export async function joinRoom(raw){const code=raw.trim().toUpperCase();if(!/^[A-HJ-NP-Z2-9]{6}$/.test(code))throw new Error('Enter the six-character room code.');let token=read(`panda:seat:${code}`);if(!token){token=freshToken();save(`panda:seat:${code}`,token);}const state=await request(code,'join',token);save('panda:last-room',code);return {state,token};}
export class OnlineRoom{
  constructor(session,onState,onConnection){this.state=session.state;this.token=session.token;this.onState=onState;this.onConnection=onConnection;this.stopped=false;this.sending=false;this.failures=0;this.timer=null;}
  start(){this.onState(this.state);this.poll();}
  async poll(){
    if(this.stopped)return;
    try{const state=await request(this.state.code,'sync',this.token);if(this.stopped)return;this.failures=0;this.onConnection(true,'');this.receive(state);}catch(error){if(this.stopped)return;this.failures++;if([401,403,404,410].includes(error.status)){this.stop();forgetRoom();this.onConnection(false,error.message);return;}this.onConnection(false,error.message);}
    if(!this.stopped)this.timer=setTimeout(()=>this.poll(),document.hidden?5000:Math.min(8000,1100*Math.max(1,this.failures)));
  }
  receive(state){if(state.revision<this.state.revision||state.round<this.state.round||state.round===this.state.round&&state.gameVersion<this.state.gameVersion)return;this.state=state;if(state.closed){this.stop();forgetRoom();}this.onState(state);}
  async action(action,input={}){if(this.sending||this.stopped)return;this.sending=true;try{const state=await request(this.state.code,action,this.token,input);if(!this.stopped){this.onConnection(true,'');this.receive(state);}return true;}catch(error){if(!this.stopped)this.onConnection(!!error.status&&error.status<500,error.message);return false;}finally{this.sending=false;if(!this.stopped)this.onState(this.state);}}
  move(index){return this.action('move',{index,round:this.state.round,moveNumber:this.state.game.moves,actionId:crypto.randomUUID()});}
  rematch(){return this.action('rematch',{round:this.state.round});}
  async leave(){const success=await this.action('leave');if(success){this.stop();forgetRoom();}return success;}
  stop(){this.stopped=true;clearTimeout(this.timer);}
}
