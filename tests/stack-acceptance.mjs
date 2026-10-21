import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const base='http://backend:4000',origin=process.env.APP_ORIGIN;
let cookie='',csrf='';
async function call(path,method='GET',body){const r=await fetch(base+'/api'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,'X-CSRF-Token':csrf},body:body===undefined?undefined:JSON.stringify(body)});const data=r.status===204?null:await r.json();return {r,data};}
const reg=await call('/auth/register','POST',{email:'qa-'+Date.now()+'@example.test',name:'QA nghiệm thu',password:crypto.randomBytes(24).toString('hex')});assert.equal(reg.r.status,201);cookie=reg.r.headers.get('set-cookie').split(';')[0];csrf=reg.data.csrf;
const project=await call('/projects','POST',{name:'QA nghiệm thu '+Date.now(),type:'PERSONAL'});assert.equal(project.r.status,201);
const create=await call('/projects/'+project.data.id+'/tasks','POST',{title:'Task kiểm tra PostgreSQL thật'});assert.equal(create.r.status,201);
assert.equal((await call('/tasks/'+create.data.id,'PATCH',{status:'DONE'})).r.status,200);
assert.equal((await call('/tasks/'+create.data.id)).data.status,'DONE');
assert.equal((await call('/tasks/'+create.data.id,'DELETE',{})).r.status,204);
await call('/projects/'+project.data.id,'PATCH',{archived:true});await call('/auth/logout','POST',{});
console.log('PASS: real backend health/auth/project/CRUD/Kanban through Compose network. One QA account and archived empty project are retained.');
