import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdirSync} from 'node:fs';
export function localDatabase(filename=':memory:'){
  if(filename!==':memory:')mkdirSync('.local',{recursive:true});
  const sqlite=new DatabaseSync(filename);
  if(!sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='rooms'").get())sqlite.exec(readFileSync(new URL('../drizzle/0000_rooms.sql',import.meta.url),'utf8'));
  const db={prepare(sql){return {bind(...values){const run=()=>{const result=sqlite.prepare(sql).run(...values);return {meta:{changes:Number(result.changes)}};};return {async first(){return sqlite.prepare(sql).get(...values)||null;},async run(){return run();},runSync:run};}};},async batch(statements){sqlite.exec('BEGIN');try{const results=statements.map(stmt=>stmt.runSync());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}},close(){sqlite.close();}};
  return db;
}
