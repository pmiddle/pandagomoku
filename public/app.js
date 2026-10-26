import {createGame,place,hasThreat} from './engine.js';
import {renderJournal} from './journal-view.js';
import {track} from './analytics.js';
import {OnlineRoom,createRoom,joinRoom,savedRoom} from './online.js';

const $=s=>document.querySelector(s),names=['','Ink','Maple'],images=['','./panda.svg','./panda-rust.svg'];
let game=createGame(),mode='local',difficulty='medium',last=-1,preview=-1,focusIndex=112,pointerType='mouse',toastTimer,botWorker,botId=0,thinking=false,online=null,connected=false,onlineMessage='',finishedRound='',roomBusy=false,sessionEpoch=0,renderedRound=0;
const board=$('#board');
function canMove(){return !game.winner&&!game.draw&&!thinking&&(mode!=='online'||online&&connected&&online.state.ready&&!online.state.closed&&online.state.game.turn===online.state.seat&&online.state.connections.every(c=>c==='online')&&!online.sending)&&(mode!=='bot'||game.turn===1);}
for(let i=0;i<225;i++){
  const button=document.createElement('button');button.className='cell';button.type='button';button.setAttribute('role','gridcell');button.dataset.index=i;
  button.addEventListener('pointerdown',e=>pointerType=e.pointerType);
  button.addEventListener('click',()=>{if(!canMove())return;if(pointerType==='touch'&&preview!==i&&!game.board[i]){preview=i;render();return;}move(i);});
  button.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&!game.board[i]&&canMove()){preview=i;render();}});
  button.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&preview===i){preview=-1;render();}});
  button.addEventListener('focus',()=>focusIndex=i);
  button.addEventListener('keydown',e=>{let next=i;if(e.key==='ArrowLeft')next=i%15?i-1:i;if(e.key==='ArrowRight')next=i%15<14?i+1:i;if(e.key==='ArrowUp')next=Math.max(0,i-15);if(e.key==='ArrowDown')next=Math.min(224,i+15);if(next!==i){e.preventDefault();focusIndex=next;render();board.children[next].focus();}if(e.key==='Enter'||e.key===' '){e.preventDefault();pointerType='keyboard';move(i);}});
  board.append(button);
}
function render(){
  const allowed=canMove();
  [...board.children].forEach((cell,i)=>{const value=game.board[i],isPreview=preview===i&&!value&&allowed;cell.className='cell'+([48,56,112,168,176].includes(i)?' star':'')+(i===last?' last':'')+(game.line.includes(i)?' win':'')+(isPreview?' preview':'');const content=value||isPreview?`<img src="${images[value||game.turn]}" alt="">`:'';if(cell.innerHTML!==content)cell.innerHTML=content;cell.tabIndex=i===focusIndex?0:-1;cell.setAttribute('aria-label',`Row ${Math.floor(i/15)+1}, column ${i%15+1}, ${value?names[value]:'empty'}`);cell.setAttribute('aria-disabled',String(!!value||!allowed));});
  for(const p of [1,2]){const player=$('#player'+p);player.classList.toggle('active',!game.winner&&!game.draw&&game.turn===p);player.classList.toggle('threat',!game.winner&&!game.draw&&hasThreat(game,p));player.querySelector('.turn-badge').textContent=mode==='local'?'YOUR TURN':mode==='bot'?(p===1?'YOUR TURN':'THINKING'):online?.state.seat===p?'YOUR TURN':'THEIR TURN';player.querySelector('small').textContent=mode==='bot'?(p===1?'YOU':`${difficulty.toUpperCase()} BOT`):mode==='online'?(online?.state.seat===p?'YOU':'YOUR FRIEND'):(p===1?'BLACK-EAR PANDA':'CINNAMON PANDA');}
  let status=game.winner?`${names[game.winner]} wins. Beautifully played.`:game.draw?'A full bamboo grove. It’s a draw.':thinking?'Panda is thinking…':preview>=0&&pointerType==='touch'&&allowed?`Tap again to place ${names[game.turn]}.`:`${names[game.turn]}’s turn · ${game.moves} ${game.moves===1?'move':'moves'}`;
  if(mode==='online'&&online){
    const room=online.state;$('#online-banner').hidden=false;$('#room-label').textContent=`ROOM ${room.code} · YOU ARE ${names[room.seat].toUpperCase()}`;
    const message=room.closed?'Your friend left. This grove is closed.':!connected?onlineMessage||'Reconnecting… your seat is saved.':!room.ready?'Waiting for another panda…':room.connections[2-room.seat]==='away'?'Your friend is reconnecting. Their seat is saved.':onlineMessage||'Two pandas connected';
    $('#connection-state').textContent=message;$('#online-banner').classList.toggle('disconnected',!connected||room.connections.includes('away'));
    if(!game.winner&&!game.draw)status=room.closed?'Start a new room to play again.':!room.ready?'Share your room code to begin.':!allowed?(room.game.turn===room.seat?'Waiting for your friend to reconnect.':'Your friend’s turn.'):status;
    $('#new-game').textContent=room.closed||online.stopped?'Back to modes':game.winner||game.draw?'Rematch ↗':'Invite details ↗';$('#restart').hidden=true;$('#again').textContent=room.rematch[room.seat-1]?'Rematch requested ✓':room.rematch[2-room.seat]?'Accept rematch ↗':'Request rematch ↗';$('#again').disabled=room.closed||online.stopped||room.rematch[room.seat-1]||!connected;$('#rematch-status').textContent=room.closed?'Your friend left the room.':room.rematch[room.seat-1]?'Waiting for your friend to agree.':room.rematch[2-room.seat]?'Your friend would love another round.':'';
  }else{$('#online-banner').hidden=true;$('#restart').hidden=false;$('#new-game').textContent='New game ↗';$('#again').textContent='Play again ↗';$('#again').disabled=false;$('#rematch-status').textContent='';}
  $('#mode-label').textContent=mode==='bot'?`PANDA BOT · ${difficulty.toUpperCase()}`:mode==='online'?'WITH A FRIEND · PRIVATE ROOM':'PASS & PLAY · ONE DEVICE';
  $('#status').textContent=status;$('#board-hint').textContent=mode==='local'?'Ink → Maple → Ink. Pass the screen when the turn changes.':mode==='bot'?'You are Ink. Maple has been practicing with the bamboo.':'Your room stays saved through refreshes and connection hiccups.';
}
function showGame(){$('#landing').hidden=true;$('#game').hidden=false;$('#result').close();window.scrollTo({top:0,behavior:'instant'});}
function stopBot(){botId++;botWorker?.terminate();botWorker=null;thinking=false;}
function startLocal(nextMode='local',reason='game_started'){
  sessionEpoch++;online?.stop();online=null;stopBot();mode=nextMode;game=createGame();last=-1;preview=-1;focusIndex=112;finishedRound='';history.replaceState(null,'',location.pathname==='/play'?'/':location.pathname);showGame();track(reason,{mode,difficulty:mode==='bot'?difficulty:undefined});render();
}
async function move(i){
  if(!canMove()||game.board[i])return;preview=-1;focusIndex=i;
  if(mode==='online'){const pending=online.move(i);render();await pending;render();return;}
  if(!place(game,i))return;last=i;render();if(game.winner||game.draw){finish();return;}if(mode==='bot')botMove();
}
function botMove(){
  stopBot();thinking=true;render();const id=botId;
  try{
    botWorker=new Worker(new URL('./bot-worker.js',import.meta.url),{type:'module'});
    botWorker.onmessage=({data})=>{if(data.id!==botId||mode!=='bot')return;if(data.error){thinking=false;toast(data.error);render();return;}setTimeout(()=>{if(id!==botId||mode!=='bot')return;thinking=false;if(place(game,data.index)){last=data.index;render();if(game.winner||game.draw)finish();}botWorker?.terminate();botWorker=null;},180);};
    botWorker.onerror=()=>{thinking=false;toast('The bot could not start. Please restart the round.');render();};botWorker.postMessage({id,board:game.board,player:2,difficulty});
  }catch{thinking=false;toast('This browser could not start Panda Bot. Try Pass & Play.');render();}
}
function restart(){if(mode==='online')return;if(game.moves&&!game.winner&&!game.draw){$('#restart-confirm').showModal();return;}startLocal(mode,'restart');}
function finish(){
  const stamp=mode==='online'?`${online.state.code}:${online.state.round}`:`${botId}:${game.moves}`;if(finishedRound===stamp)return;finishedRound=stamp;
  track('game_completed',{mode,winner:game.winner?names[game.winner]:null,moves:game.moves,draw:game.draw});$('#winner-panda').src=images[game.winner||1];$('#winner-panda').alt=game.winner?`${names[game.winner]}, winning panda`:'Panda';$('#winner-name').textContent=game.winner?`${names[game.winner].toUpperCase()} TAKES THE BAMBOO`:'A FRIENDLY STANDOFF';$('#result-title').textContent=game.draw?'A full bamboo grove.':'Five in a row!';$('#result-copy').textContent=game.draw?'It’s a draw. Another round?':mode==='bot'&&game.winner===2?'Maple found a way. There’s always another round.':'A little patience. A lovely little victory.';$('#feedback-note').textContent='';document.querySelectorAll('[data-rating]').forEach(b=>b.setAttribute('aria-pressed','false'));$('#celebration').innerHTML=game.draw?'':Array.from({length:7},(_,i)=>`<span class="celebration-leaf" style="--x:${10+i*13}%;animation-delay:${i*.12}s">❧</span>`).join('');$('#result').showModal();
}
function toast(message){clearTimeout(toastTimer);$('#toast').hidden=false;$('#toast').textContent=message;toastTimer=setTimeout(()=>$('#toast').hidden=true,4000);}
async function copyText(text,message){try{await navigator.clipboard.writeText(text);toast(message);}catch{$('#share-url').value=text;$('#copy-dialog').showModal();$('#share-url').select();}}
function roomDetails(){if(!online)return;$('#room-code').textContent=online.state.code;$('#waiting-text').textContent=online.state.ready?'Your bamboo buddy is here.':'Waiting for another panda…';$('#room-identity').textContent=`You are ${names[online.state.seat]}. Your friend will be ${names[3-online.state.seat]}.`;$('#room-error').textContent='';$('#room-lobby').showModal();}
function inviteURL(){const url=new URL('/play',location.origin);url.searchParams.set('room',online.state.code);return url.href;}
function attachRoom(session){
  online?.stop();stopBot();mode='online';connected=true;onlineMessage='';finishedRound='';renderedRound=0;
  let roomWasReady=false,renderedVersion=-1;
  online=new OnlineRoom(session,state=>{
    game=state.game;last=state.last;if(state.round!==renderedRound||state.gameVersion!==renderedVersion)preview=-1;
    if(state.ready){if(!roomWasReady&&$('#room-lobby').open)$('#room-lobby').close();if(state.round!==renderedRound&&!(game.winner||game.draw))$('#result').close();}
    roomWasReady=state.ready;renderedVersion=state.gameVersion;renderedRound=state.round;render();if(game.winner||game.draw)finish();if(state.closed)$('#room-error').textContent='Your friend left. This room is closed.';
  },(okay,message)=>{connected=okay;onlineMessage=message;render();if(!okay)$('#room-error').textContent=message;});
  const url=new URL('/play',location.origin);url.searchParams.set('room',session.state.code);history.replaceState(null,'',url);showGame();track('game_started',{mode:'online'});online.start();if(!session.state.ready)roomDetails();
}
async function enterRoom(type,code){
  if(roomBusy)return;roomBusy=true;const epoch=++sessionEpoch;$('#friend-error').textContent='';$('#create-room').disabled=true;$('#join-room').disabled=true;$('#room-working').hidden=false;
  try{const session=type==='create'?await createRoom():await joinRoom(code);if(epoch!==sessionEpoch)return;$('#friend-dialog').close();attachRoom(session);}catch(error){if(epoch===sessionEpoch)$('#friend-error').textContent=error.message;}finally{roomBusy=false;$('#create-room').disabled=false;$('#join-room').disabled=false;$('#room-working').hidden=true;}
}
function home(){sessionEpoch++;online?.stop();online=null;stopBot();$('#result').close();$('#room-lobby').close();$('#landing').hidden=false;$('#game').hidden=true;history.replaceState(null,'','/');$('#resume-room').hidden=!savedRoom();window.scrollTo({top:0,behavior:'instant'});}
function askHome(){if(mode==='online'&&online&&!online.state.closed&&!online.stopped)$('#leave-confirm').showModal();else home();}
$('#play').onclick=()=>startLocal('local');$('#bot-play').onclick=()=>$('#bot-dialog').showModal();$('#friend-play').onclick=()=>{$('#friend-error').textContent='';$('#friend-dialog').showModal();};$('#start-bot').onclick=()=>{difficulty=$('#difficulty').value;$('#bot-dialog').close();startLocal('bot');};$('#again').onclick=()=>mode==='online'?online.rematch():startLocal(mode);$('#restart').onclick=restart;$('#new-game').onclick=()=>mode==='online'?(online.state.closed||online.stopped?home():game.winner||game.draw?$("#result").showModal():roomDetails()):restart;$('#home').onclick=askHome;$('#brand').onclick=e=>{e.preventDefault();if(!$('#game').hidden)askHome();};
for(const id of ['how','rules-top'])$('#'+id).onclick=()=>$('#rules').showModal();document.querySelectorAll('dialog .close').forEach(b=>b.onclick=()=>{if(b.closest('dialog').id==='friend-dialog')sessionEpoch++;b.closest('dialog').close();});$('.close-rules').onclick=()=>$('#rules').close();
$('#create-room').onclick=()=>enterRoom('create');$('#join-form').onsubmit=e=>{e.preventDefault();enterRoom('join',$('#join-code').value);};$('#resume-room').onclick=()=>{const code=savedRoom();$('#join-code').value=code||'';$('#friend-dialog').showModal();if(code)enterRoom('join',code);};$('#copy-code').onclick=()=>copyText(online.state.code,'Room code copied.');$('#copy-invite').onclick=()=>copyText(inviteURL(),'Invite link copied. Send it to your friend.');$('#lobby-close').onclick=()=>$('#room-lobby').close();$('#leave-room').onclick=()=>$('#leave-confirm').showModal();$('#keep-room').onclick=()=>$('#leave-confirm').close();
$('#confirm-leave').onclick=async()=>{const room=online;$('#confirm-leave').disabled=true;const success=await room?.leave();$('#confirm-leave').disabled=false;if(success){$('#leave-confirm').close();home();}else{$('#leave-confirm').close();toast('Could not leave yet. Your seat is saved; reconnect and try again.');}};
$('#keep-playing').onclick=()=>$('#restart-confirm').close();$('#confirm-restart').onclick=()=>{$('#restart-confirm').close();startLocal(mode,'restart');};
$('#share').onclick=async()=>{track('share_clicked',{mode});const iWon=game.winner&&(mode==='local'||game.winner===(mode==='bot'?1:online?.state.seat));const text=iWon?'I just won Panda Gomoku 🐼':'I just played Panda Gomoku 🐼';const url=location.origin+'/';try{if(navigator.share)await navigator.share({title:'Panda Gomoku',text,url});else await copyText(`${text} ${url}`,'Copied! Share a little panda rivalry.');}catch(e){if(e.name!=='AbortError')toast('Sharing unavailable. Try copying the link.');}};
document.querySelectorAll('[data-rating]').forEach(button=>button.onclick=()=>{const rating=button.dataset.rating;try{const history=JSON.parse(localStorage.getItem('panda-feedback')||'[]');history.push({rating,date:new Date().toISOString(),mode});localStorage.setItem('panda-feedback',JSON.stringify(history.slice(-100)));$('#feedback-note').textContent='Saved on this device. Thank you!';}catch{$('#feedback-note').textContent='Thank you! Storage is unavailable on this device.';}track('feedback',{rating,mode});document.querySelectorAll('[data-rating]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));});
renderJournal($('#journal-posts'));
for(let i=0;i<81;i++){const cell=document.createElement('div');cell.className='demo-cell';const ink=[22,30,38,46],rust=[21,31,40,48];if(ink.includes(i)||rust.includes(i))cell.innerHTML=`<img src="${images[ink.includes(i)?1:2]}" alt="">`;$('#demo').append(cell);}
$('#resume-room').hidden=!savedRoom();
$('#friend-dialog').addEventListener('cancel',()=>sessionEpoch++);
const invited=new URLSearchParams(location.search).get('room');if(invited){$('#join-code').value=invited.toUpperCase();$('#friend-dialog').showModal();enterRoom('join',invited);}
track('landing_visit');render();
if('serviceWorker' in navigator&&!['localhost','127.0.0.1'].includes(location.hostname))navigator.serviceWorker.register('./sw.js').catch(()=>{});


