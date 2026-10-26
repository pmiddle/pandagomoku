// A single conditional SQL update serializes each room across Worker instances.
export class RoomStore{
  constructor(db){this.db=db;}
  async get(code){const row=await this.db.prepare('SELECT data, revision FROM rooms WHERE code = ?').bind(code).first();return row?{room:JSON.parse(row.data),revision:row.revision}:null;}
  async insert(room){const result=await this.db.prepare('INSERT OR IGNORE INTO rooms (code, data, revision, expires) VALUES (?, ?, 0, ?)').bind(room.code,JSON.stringify(room),room.expires).run();return result.meta.changes===1;}
  async compareAndSet(room,revision){const result=await this.db.prepare('UPDATE rooms SET data = ?, revision = revision + 1, expires = ? WHERE code = ? AND revision = ?').bind(JSON.stringify(room),room.expires,room.code,revision).run();return result.meta.changes===1;}
  async limit(key,window,max){const result=await this.db.prepare('INSERT INTO rate_limits (key, window, count) VALUES (?, ?, 1) ON CONFLICT(key) DO UPDATE SET count = CASE WHEN window = excluded.window THEN count + 1 ELSE 1 END, window = excluded.window RETURNING count').bind(key,window).first();return result.count<=max;}
  async cleanup(now){await this.db.batch([this.db.prepare('DELETE FROM rooms WHERE expires < ?').bind(now),this.db.prepare('DELETE FROM rate_limits WHERE window < ?').bind(Math.floor(now/3600000)-1)]);}
}
