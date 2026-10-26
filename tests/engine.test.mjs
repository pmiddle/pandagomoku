import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,place,winningLine,hasThreat} from '../public/engine.js';
for(const [name,indices]of Object.entries({horizontal:[105,106,107,108,109],vertical:[7,22,37,52,67],diagonal:[0,16,32,48,64],antiDiagonal:[14,28,42,56,70]})){test(`${name} win and finished-game lock`,()=>{const game=createGame();indices.forEach((i,n)=>{assert.ok(place(game,i));if(n<4)assert.ok(place(game,210+n));});assert.equal(game.winner,1);assert.equal(game.line.length,5);assert.equal(place(game,200),false);});}
test('occupied and invalid cells preserve turn and moves',()=>{const g=createGame();assert.ok(place(g,0));for(const i of [0,-1,225,1.5])assert.equal(place(g,i),false);assert.equal(g.turn,2);assert.equal(g.moves,1);});
test('no wraparound and fewer than five is not a win',()=>{const b=Array(225).fill(0);[12,13,14,15,16].forEach(i=>b[i]=1);assert.deepEqual(winningLine(b,14),[]);});
test('edge overline is a win',()=>{const b=Array(225).fill(0);[0,1,2,3,4,5].forEach(i=>b[i]=2);assert.equal(winningLine(b,0).length,6);});
test('threat detection does not mutate board',()=>{const g=createGame();[0,1,2,3].forEach(i=>g.board[i]=1);const before=[...g.board];assert.ok(hasThreat(g,1));assert.deepEqual(g.board,before);});
test('full board draw',()=>{const g=createGame();g.board=g.board.map((_,i)=>((Math.floor(i/15)+2*(i%15))%4<2?1:2));for(let i=0;i<225;i++)assert.equal(winningLine(g.board,i).length,0);const p=g.board[224];g.board[224]=0;g.turn=p;g.moves=224;assert.ok(place(g,224));assert.equal(g.draw,true);assert.equal(g.winner,0);assert.equal(place(g,0),false);});
