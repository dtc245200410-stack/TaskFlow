import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import {database} from '../src/db.js';
import {seed} from '../prisma/seed.js';
test('SQL migration, seed idempotence, database constraints and disk reopen (PGlite)',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'taskflow-persist-'));process.env.DB_POOL_SIZE='1';
 let wasm=await PGlite.create(dir);await wasm.exec(readFileSync(new URL('../prisma/migrations/202610210001_initial/migration.sql',import.meta.url),'utf8'));
 let stopped=false;const socket=new PGLiteSocketServer({db:wasm,port:55441,host:'127.0.0.1'});await socket.start();const db=database('postgresql://postgres:unused@127.0.0.1:55441/postgres');
 try{
  const options={adminEmail:'qa-admin@example.test',adminPassword:'QA-seed-only-password-2026',demoPassword:'QA-seed-only-password-2026'};
  await seed(db,options);assert.equal(await db.task.count(),10);await seed(db,options);assert.equal(await db.task.count(),10);assert.equal(await db.user.count(),3);
  const t=await db.task.findFirstOrThrow();await db.task.update({where:{id:t.id},data:{title:'QA saved to disk',status:'IN_REVIEW'}});
  await assert.rejects(()=>db.task.update({where:{id:t.id},data:{title:'  '}}));
  await assert.rejects(()=>db.task.update({where:{id:t.id},data:{startAt:new Date('2026-11-02'),dueAt:new Date('2026-11-01')}}));
  await db.$disconnect();await socket.stop();stopped=true;await new Promise(r=>setTimeout(r,50));await wasm.close();
  wasm=await PGlite.create(dir);const result=await wasm.query('SELECT "title","status" FROM "Task" WHERE "id"=$1',[t.id]);assert.equal((result.rows[0] as any).title,'QA saved to disk');assert.equal((result.rows[0] as any).status,'IN_REVIEW');
 }finally{await db.$disconnect();if(!stopped){await socket.stop();await new Promise(r=>setTimeout(r,50));}await wasm.close();rmSync(dir,{recursive:true,force:true});}
});
