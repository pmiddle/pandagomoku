import {chooseMove} from './bot.js';
self.onmessage=({data})=>{try{self.postMessage({id:data.id,index:chooseMove(data.board,data.player,data.difficulty)});}catch{self.postMessage({id:data.id,error:'The panda needs a moment. Try a new game.'});}};
