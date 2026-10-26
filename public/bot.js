import {winningLine} from './engine.js';

const directions=[[0,1],[1,0],[1,1],[1,-1]];
export function candidates(board){
  const cells=new Set();
  board.forEach((p,i)=>{if(!p)return;const r=Math.floor(i/15),c=i%15;for(let y=Math.max(0,r-2);y<=Math.min(14,r+2);y++)for(let x=Math.max(0,c-2);x<=Math.min(14,c+2);x++)if(!board[y*15+x])cells.add(y*15+x);});
  return cells.size?[...cells]:[112];
}
export function immediate(board,player,options=candidates(board)){
  return options.filter(i=>{board[i]=player;const won=winningLine(board,i).length>0;board[i]=0;return won;});
}
function pattern(board,index,player){
  let score=0;const r=Math.floor(index/15),c=index%15;
  for(const [dr,dc]of directions){let count=1,open=0;
    for(const sign of [-1,1]){let y=r+dr*sign,x=c+dc*sign;while(y>=0&&y<15&&x>=0&&x<15&&board[y*15+x]===player){count++;y+=dr*sign;x+=dc*sign;}if(y>=0&&y<15&&x>=0&&x<15&&!board[y*15+x])open++;}
    if(count>=5)score+=1000000;
    else if(open)score+=([0,2,18,180,3500][count]||0)*(open===2?5:1);
    // Short windows also value split shapes such as XX_X.
    for(let offset=-4;offset<=0;offset++){let stones=0,blocked=false;for(let k=0;k<5;k++){const y=r+dr*(offset+k),x=c+dc*(offset+k);if(y<0||y>14||x<0||x>14||board[y*15+x]===3-player){blocked=true;break;}if(y*15+x===index||board[y*15+x]===player)stones++;}if(!blocked)score+=[0,1,5,30,260,100000][stones];}
  }
  return score;
}
function rank(board,player,limit=12){return candidates(board).map(index=>({index,score:pattern(board,index,player)+pattern(board,index,3-player)*1.08+(14-Math.abs(7-Math.floor(index/15))-Math.abs(7-index%15))*.2})).sort((a,b)=>b.score-a.score).slice(0,limit);}
function evaluate(board,player){const options=candidates(board),own=options.map(i=>pattern(board,i,player)).sort((a,b)=>b-a),other=options.map(i=>pattern(board,i,3-player)).sort((a,b)=>b-a);return own.slice(0,3).reduce((a,b)=>a+b,0)-other.slice(0,3).reduce((a,b)=>a+b,0)*1.1;}
function search(board,player,depth,alpha,beta,context){
  if(performance.now()>context.deadline){context.timeout=true;return evaluate(board,player);}
  const options=candidates(board);if(!options.length)return 0;
  if(immediate(board,player,options).length)return 10000000+depth*1000;
  if(depth===0)return evaluate(board,player);
  const blocks=immediate(board,3-player,options);if(blocks.length>1)return -10000000;
  const moves=blocks.length?blocks.map(index=>({index})):rank(board,player,depth>1?8:6);
  let best=-Infinity;
  for(const {index}of moves){board[index]=player;const value=-search(board,3-player,depth-1,-beta,-alpha,context);board[index]=0;best=Math.max(best,value);alpha=Math.max(alpha,value);if(alpha>=beta||context.timeout)break;}
  return best;
}
export function chooseMove(input,player=2,difficulty='medium',options={}){
  const board=[...input],random=options.random||Math.random,choices=candidates(board).filter(i=>!board[i]);
  if(!choices.length)return null;
  const wins=immediate(board,player,choices);if(wins.length)return wins[0];
  const blocks=immediate(board,3-player,choices);
  if(difficulty==='easy'){
    if(blocks.length&&random()>.35)return blocks[0];
    if(random()<.3)return choices[Math.floor(random()*choices.length)];
    const moves=rank(board,player,6);return moves[Math.floor(random()*Math.min(4,moves.length))].index;
  }
  if(blocks.length)return blocks[0];
  const moves=rank(board,player,10);if(difficulty!=='hard'||choices.length===1)return moves[0].index;
  const context={deadline:performance.now()+(options.budgetMs??450),timeout:false};let best=moves[0].index;
  // Iterative deepening keeps a completed result if the mobile time budget expires.
  for(let depth=1;depth<=3;depth++){let iteration=best,value=-Infinity;for(const move of moves){board[move.index]=player;const score=-search(board,3-player,depth-1,-Infinity,-value,context);board[move.index]=0;if(context.timeout)break;if(score>value){value=score;iteration=move.index;}}if(context.timeout)break;best=iteration;}
  return best;
}
