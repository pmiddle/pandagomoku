import {createGame,place} from '../public/engine.js';

export const ROOM_LIFETIME=24*60*60*1000;
export const AWAY_AFTER=25000;
export class RoomError extends Error{constructor(message,status=400){super(message);this.status=status;}}
export function newRoom(code,host,now=Date.now()){
  return {code,host,guest:null,game:createGame(),first:1,round:1,gameVersion:0,last:-1,seen:[0,now,0],rematch:[false,false,false],actions:['','',''],closed:false,expires:now+ROOM_LIFETIME};
}
export function seatOf(room,identity){return room.host===identity?1:room.guest===identity?2:0;}
export function viewRoom(room,seat,now=Date.now()){
  return {code:room.code,seat,game:room.game,first:room.first,round:room.round,gameVersion:room.gameVersion,last:room.last,ready:!!room.guest,closed:room.closed,expires:room.expires,rematch:room.rematch.slice(1),connections:[1,2].map(p=>room.closed?'left':p===2&&!room.guest?'waiting':now-room.seen[p]<AWAY_AFTER?'online':'away')};
}
export function changeRoom(room,identity,action,input={},now=Date.now()){
  if(room.expires<=now)throw new RoomError('This room has expired. Create a fresh one.',410);
  let seat=seatOf(room,identity);
  if(action==='join'){
    if(room.closed)throw new RoomError('A panda left this room. Create a new one.',410);
    if(!seat){if(room.guest)throw new RoomError('This room already has two pandas.',409);room.guest=identity;seat=2;}
  }
  if(!seat)throw new RoomError('This device does not have a seat in this room.',403);
  if(action!=='sync'&&room.closed)throw new RoomError('Your friend left the room. Start a new room.',410);
  let dirty=action==='join';
  if(now-room.seen[seat]>=10000){room.seen[seat]=now;dirty=true;}
  if(action==='move'){
    if(typeof input.actionId!=='string'||!/^[a-zA-Z0-9-]{12,80}$/.test(input.actionId))throw new RoomError('Invalid move request.');
    if(room.actions[seat]===input.actionId)return {seat,dirty};
    if(!room.guest)throw new RoomError('Wait for another panda to join.',409);
    if(now-room.seen[3-seat]>=AWAY_AFTER)throw new RoomError('Your friend is reconnecting. Their seat is saved.',409);
    if(input.round!==room.round||input.moveNumber!==room.game.moves)throw new RoomError('The board changed. Your game is syncing.',409);
    if(room.game.turn!==seat)throw new RoomError('It is your friend’s turn.',409);
    if(!place(room.game,input.index))throw new RoomError('That move is not available.',409);
    room.last=input.index;room.actions[seat]=input.actionId;room.gameVersion++;dirty=true;
  }else if(action==='rematch'){
    if(input.round!==room.round)throw new RoomError('A new round has already started.',409);
    if(!room.game.winner&&!room.game.draw)throw new RoomError('Finish this round before a rematch.',409);
    if(!room.rematch[seat]){room.rematch[seat]=true;dirty=true;}
    if(room.rematch[1]&&room.rematch[2]){room.first=3-room.first;room.game=createGame();room.game.turn=room.first;room.round++;room.gameVersion++;room.last=-1;room.rematch=[false,false,false];room.actions=['','',''];}
  }else if(action==='leave'){room.closed=true;dirty=true;}
  else if(!['sync','join','move','rematch'].includes(action))throw new RoomError('Unknown room action.');
  if(dirty)room.expires=now+ROOM_LIFETIME;
  return {seat,dirty};
}
