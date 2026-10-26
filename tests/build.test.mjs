import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('every referenced interface ID exists',()=>{const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8'),html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');for(const match of source.matchAll(/\$\('#([a-z-]+)'\)/g))assert.ok(html.includes(`id="${match[1]}"`),`Missing interface element ${match[1]}`);});
