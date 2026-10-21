import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import {database} from '../src/db.js';
import {createApp} from '../src/app.js';
// TEST_DATABASE_URL must point at an isolated, already-migrated PostgreSQL test database.
// Without it, execute the identical migration and API on PGlite, explicitly not a Docker test.
test('Authentication, project permissions, CRUD, Kanban, filters and persistence',async(t)=>{
  process.env.DB_POOL_SIZE='1';
  let wasm:any,socket:any,dir:string|undefined;
  let url=process.env.TEST_DATABASE_URL;
  if(!url){dir=mkdtempSync(path.join(tmpdir(),'taskflow-qa-'));wasm=await PGlite.create(dir);await wasm.exec(readFileSync(new URL('../prisma/migrations/202610210001_initial/migration.sql',import.meta.url),'utf8'));socket=new PGLiteSocketServer({db:wasm,port:55439,host:'127.0.0.1'});await socket.start();url='postgresql://postgres:unused@127.0.0.1:55439/postgres';}
  const db=database(url),server=createApp(db,{origin:'http://qa.taskflow.local',secure:false,authLimit:1000}).listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
  const base='http://127.0.0.1:'+(server.address() as any).port;
  const pass='QA-test-only-password-2026';const suffix=Date.now();
  type Client={cookie:string;csrf:string;user:any};
  const empty={cookie:'',csrf:'',user:null};
  async function call(client:Client,route:string,method='GET',body?:any,headers:Record<string,string>={}){const r=await fetch(base+'/api'+route,{method,headers:{Origin:'http://qa.taskflow.local','Content-Type':'application/json',Cookie:client.cookie,'X-CSRF-Token':client.csrf,...headers},body:body===undefined?undefined:JSON.stringify(body)});const data=r.status===204?null:await r.json();return {r,data};}
  async function register(name:string){const {r,data}=await call(empty,'/auth/register','POST',{email:`${name}-${suffix}@example.test`,name,password:pass});assert.equal(r.status,201);return {cookie:r.headers.get('set-cookie')!.split(';')[0],csrf:data.csrf,user:data.user};}
  let owner:Client,member:Client,viewer:Client,outsider:Client,p:any,task:any,comment:any,item:any;
  try{
    await t.test('Register, login, cookie flags and generic credential errors',async()=>{
      assert.equal((await call(empty,'/tasks')).r.status,401);
      assert.equal((await call(empty,'/auth/register','POST',{name:'QA',email:'bad',password:'short'})).r.status,400);
      owner=await register('Owner');member=await register('Member');viewer=await register('Viewer');outsider=await register('Outsider');
      const login=await call(empty,'/auth/login','POST',{email:owner.user.email,password:pass});assert.equal(login.r.status,200);assert.match(login.r.headers.get('set-cookie')!,/HttpOnly/);assert.match(login.r.headers.get('set-cookie')!,/SameSite=Lax/);assert.equal(login.data.user.passwordHash,undefined);
      assert.equal((await call(empty,'/auth/login','POST',{email:owner.user.email,password:'wrong'})).r.status,401);
    });
    await t.test('Origin and CSRF protection reject writes',async()=>{
      assert.equal((await call(owner,'/projects','POST',{name:'Blocked'},{Origin:'https://evil.test'})).r.status,403);
      assert.equal((await call(owner,'/projects','POST',{name:'Blocked'},{'X-CSRF-Token':'wrong'})).r.status,403);
      assert.equal((await call(owner,'/projects','POST',{name:'Blocked'},{'Content-Type':'text/plain'})).r.status,415);
    });
    await t.test('Project membership enforces viewer, outsider and owner restrictions',async()=>{
      const result=await call(owner,'/projects','POST',{name:'QA project '+suffix,type:'TEAM'});assert.equal(result.r.status,201);p=result.data;
      assert.equal((await call(owner,`/projects/${p.id}/members`,'POST',{email:member.user.email,role:'MEMBER'})).r.status,201);
      assert.equal((await call(owner,`/projects/${p.id}/members`,'POST',{email:viewer.user.email,role:'VIEWER'})).r.status,201);
      assert.equal((await call(outsider,`/projects/${p.id}`)).r.status,404);
      assert.equal((await call(viewer,`/projects/${p.id}/tasks`,'POST',{title:'Forbidden'})).r.status,403);
      assert.equal((await call(member,`/projects/${p.id}/members`,'POST',{email:outsider.user.email})).r.status,403);
      assert.equal((await call(owner,`/projects/${p.id}/members/${owner.user.id}`,'DELETE',{})).r.status,403);
    });
    await t.test('CRUD validates relations, dates and labels and stores Kanban status',async()=>{
      assert.equal((await call(owner,`/projects/${p.id}/tasks`,'POST',{title:'Invalid assignee',assigneeId:outsider.user.id})).r.status,400);
      const label=(await call(owner,`/projects/${p.id}/labels`,'POST',{name:'QA',color:'#6366f1'})).data;
      const result=await call(member,`/projects/${p.id}/tasks`,'POST',{title:'QA persisted task',priority:'HIGH',assigneeId:member.user.id,dueAt:'2020-01-01T23:59:59+07:00',labelIds:[label.id]});assert.equal(result.r.status,201);task=result.data;
      assert.equal((await call(owner,`/tasks/${task.id}`,'PATCH',{status:'IN_REVIEW'})).r.status,200);
      assert.equal((await db.task.findUniqueOrThrow({where:{id:task.id}})).status,'IN_REVIEW');
      assert.equal((await call(outsider,`/tasks/${task.id}`)).r.status,404);
      assert.equal((await call(outsider,`/tasks/${task.id}`,'PATCH',{status:'DONE'})).r.status,404);
      assert.equal((await call(viewer,`/tasks/${task.id}`,'DELETE',{})).r.status,403);
      assert.equal((await call(member,`/tasks?q=persisted&my=true&overdue=true&priority=HIGH&labelId=${label.id}`)).data.total,1);
      assert.equal((await call(owner,'/tasks?sort=bad')).r.status,400);
      assert.equal((await call(owner,'/tasks/not-a-uuid')).r.status,400);
      assert.equal((await call(outsider,'/tasks')).data.total,0);
    });
    await t.test('Comments, checklist, activity and resource ID isolation',async()=>{
      comment=(await call(member,`/tasks/${task.id}/comments`,'POST',{content:'QA comment'})).data;
      item=(await call(member,`/tasks/${task.id}/checklist`,'POST',{title:'QA step'})).data;
      assert.equal((await call(member,`/tasks/${task.id}/checklist/${item.id}`,'PATCH',{done:true})).r.status,200);
      assert.equal((await call(viewer,`/tasks/${task.id}/comments`,'POST',{content:'Forbidden'})).r.status,403);
      const detail=(await call(owner,`/tasks/${task.id}`)).data;assert.equal(detail.comments[0].content,'QA comment');assert.equal(detail.checklist[0].done,true);assert.ok(detail.activities.length>=3);
      assert.equal((await call(outsider,`/tasks/${task.id}/checklist/${item.id}`,'PATCH',{done:false})).r.status,404);
    });
    await t.test('Dashboard, admin authorization, archive and restore',async()=>{
      assert.equal((await call(owner,'/dashboard')).data.overdue,1);
      assert.equal((await call(member,'/admin/users')).r.status,403);
      await call(owner,`/projects/${p.id}`,'PATCH',{archived:true});
      assert.equal((await call(owner,`/tasks/${task.id}`,'PATCH',{status:'DONE'})).r.status,409);
      assert.equal((await call(owner,'/tasks')).data.total,0);
      await call(owner,`/projects/${p.id}`,'PATCH',{archived:false});
      const metrics=await(await fetch(base+'/metrics')).text();assert.match(metrics,/taskflow_http_requests_total/);assert.match(metrics,/status="403"/);
    });
    await t.test('Removing a member removes access and clears assignment',async()=>{
      assert.equal((await call(owner,`/projects/${p.id}/members/${member.user.id}`,'DELETE',{})).r.status,204);
      assert.equal((await call(member,`/tasks/${task.id}`)).r.status,404);
      assert.equal((await db.task.findUniqueOrThrow({where:{id:task.id}})).assigneeId,null);
    });
    await t.test('System admin can lock accounts without bypassing project privacy',async()=>{
      await db.user.update({where:{id:owner.user.id},data:{role:'ADMIN'}});
      assert.equal((await call(owner,'/admin/users')).r.status,200);
      assert.equal((await call(owner,'/admin/users/'+owner.user.id,'PATCH',{disabled:true})).r.status,400);
      assert.equal((await call(owner,'/admin/users/'+outsider.user.id,'PATCH',{disabled:true})).r.status,200);
      assert.equal((await call(outsider,'/auth/me')).r.status,401);
      assert.equal((await call(owner,'/admin/users/'+outsider.user.id,'PATCH',{disabled:false})).r.status,200);
      assert.equal((await call(outsider,'/auth/me')).r.status,401);
    });
    await t.test('Password change invalidates every session; delete task persists',async()=>{
      assert.equal((await call(viewer,'/auth/password','POST',{currentPassword:'wrong',newPassword:pass+'new'})).r.status,400);
      assert.equal((await call(viewer,'/auth/password','POST',{currentPassword:pass,newPassword:pass+'new'})).r.status,200);
      assert.equal((await call(viewer,'/auth/me')).r.status,401);
      assert.equal((await call(owner,`/tasks/${task.id}`,'DELETE',{})).r.status,204);
      assert.equal(await db.task.count({where:{id:task.id}}),0);
      assert.equal((await call(owner,`/tasks/${task.id}`)).r.status,404);
    });
  }finally{
    await new Promise<void>(r=>server.close(()=>r()));await db.$disconnect();if(socket)await socket.stop();if(wasm)await wasm.close();if(dir)rmSync(dir,{recursive:true,force:true});
  }
});
