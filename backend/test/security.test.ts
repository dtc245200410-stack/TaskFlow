import {test} from 'node:test';
import assert from 'node:assert/strict';
import {taskInput,password,same,hash} from '../src/security.js';
test('Validation rejects invalid task fields and reversed dates',()=>{
  assert.equal(taskInput.safeParse({title:''}).success,false);
  assert.equal(taskInput.safeParse({title:'Task',status:'UNKNOWN'}).success,false);
  assert.equal(taskInput.safeParse({title:'Task',unexpected:true}).success,false);
  assert.equal(taskInput.safeParse({title:'Task',startAt:'2026-10-24T00:00:00Z',dueAt:'2026-10-23T00:00:00Z'}).success,false);
  assert.equal(taskInput.parse({title:'  Hợp lệ  '}).title,'Hợp lệ');
});
test('Password validation enforces bcrypt byte limit and CSRF compares safely',()=>{
  assert.equal(password.safeParse('short').success,false);
  assert.equal(password.safeParse('漢'.repeat(30)).success,false);
  assert.equal(password.safeParse('A-long-valid-password-123').success,true);
  assert.equal(same('abc','abc'),true);assert.equal(same('abc','abcd'),false);assert.equal(hash('abc').length,64);
});

test('Login rate limit and public errors do not disclose database internals',async()=>{
 const {createApp}=await import('../src/app.js');
 const fake={user:{findUnique:async()=>null}} as any;
 const server=createApp(fake,{origin:'http://qa.test',secure:false,authLimit:1}).listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 try{const base='http://127.0.0.1:'+(server.address() as any).port;const send=()=>fetch(base+'/api/auth/login',{method:'POST',headers:{Origin:'http://qa.test','Content-Type':'application/json'},body:JSON.stringify({email:'nobody@example.test',password:'wrong'})});assert.equal((await send()).status,401);assert.equal((await send()).status,429);}finally{await new Promise<void>(r=>server.close(()=>r()));}
 const broken={user:{findUnique:async()=>{throw new Error('secret-password at private-database:5432')}}} as any;
 const other=createApp(broken,{origin:'http://qa.test',secure:false}).listen(0,'127.0.0.1');await new Promise<void>(r=>other.once('listening',r));
 try{const r=await fetch('http://127.0.0.1:'+(other.address() as any).port+'/api/auth/login',{method:'POST',headers:{Origin:'http://qa.test','Content-Type':'application/json'},body:JSON.stringify({email:'a@example.test',password:'wrong'})});assert.equal(r.status,500);assert.doesNotMatch(await r.text(),/secret-password|private-database|stack/);}finally{await new Promise<void>(r=>other.close(()=>r()));}
});
