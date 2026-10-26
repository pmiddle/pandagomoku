import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseMove,candidates} from '../public/bot.js';
for(const level of ['easy','medium','hard'])test(`${level} takes a win and preserves input`,()=>{const board=Array(225).fill(0);[0,1,2,3].forEach(i=>board[i]=2);const before=[...board];assert.equal(chooseMove(board,2,level,{random:()=>.8}),4);assert.deepEqual(board,before);});
for(const level of ['medium','hard'])test(`${level} blocks opponent immediate win in four directions`,()=>{for(const line of [[0,1,2,3],[0,15,30,45],[0,16,32,48],[14,28,42,56]]){const board=Array(225).fill(0);line.forEach(i=>board[i]=1);assert.equal(chooseMove(board,2,level),line[3]+line[1]-line[0]);}});
test('opening, full board, relevant candidates and bounded hard search',()=>{const board=Array(225).fill(0);assert.equal(chooseMove(board),112);assert.equal(chooseMove(Array(225).fill(1)),null);board[112]=1;assert.equal(candidates(board).length,24);const start=performance.now();const move=chooseMove(board,2,'hard',{budgetMs:50});assert.ok(candidates(board).includes(move));assert.ok(performance.now()-start<1000);});
