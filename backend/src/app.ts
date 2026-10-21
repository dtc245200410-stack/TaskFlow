import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import {z,ZodError} from 'zod';
import {Prisma,PrismaClient} from '@prisma/client';
import {rateLimit} from 'express-rate-limit';
import {Registry,collectDefaultMetrics,Counter,Histogram} from 'prom-client';
import {uid,email,password,hash,token,same,HttpError,publicUser,taskInput,statuses,priorities} from './security.js';
import {log} from './logger.js';
const person={id:true,name:true,email:true} as const;
const taskInclude={assignee:{select:person},creator:{select:person},project:{select:{id:true,name:true,archived:true}},labels:{include:{label:true}}} as const;
type Options={origin?:string;secure?:boolean;authLimit?:number};
export function createApp(db:PrismaClient,options:Options={}) {
  const app=express();app.disable('x-powered-by');app.set('trust proxy',1);
  const origin=options.origin||process.env.APP_ORIGIN||'https://localhost:8443';
  const secure=options.secure??process.env.COOKIE_SECURE!=='false';
  const cookie={httpOnly:true,secure,sameSite:'lax' as const,path:'/api',maxAge:7*86400000};
  const metrics=new Registry();collectDefaultMetrics({register:metrics});
  const hits=new Counter({name:'taskflow_http_requests_total',help:'Completed API requests',labelNames:['method','route','status'],registers:[metrics]});
  const latency=new Histogram({name:'taskflow_http_duration_seconds',help:'API duration in seconds',labelNames:['method','route'],buckets:[.01,.05,.1,.3,1,3,10],registers:[metrics]});
  app.use((req,res,next)=>{const started=process.hrtime.bigint();res.locals.requestId=crypto.randomUUID();res.setHeader('X-Request-ID',res.locals.requestId);res.on('finish',()=>{if(['/health','/metrics'].includes(req.path))return;const route=req.route?.path||'unmatched';hits.inc({method:req.method,route,status:String(res.statusCode)});latency.observe({method:req.method,route},Number(process.hrtime.bigint()-started)/1e9);log(res.statusCode>=500?'error':res.statusCode>=400?'warn':'info','http_request',{requestId:res.locals.requestId,method:req.method,route,status:res.statusCode});});next();});
  app.get('/health',async(_req,res)=>{try{await db.$queryRaw`SELECT 1`;res.json({status:'ok'});}catch{res.status(503).json({status:'unavailable'});}});
  app.get('/metrics',async(_req,res)=>res.type(metrics.contentType).send(await metrics.metrics()));
  app.use('/api',(_req,res,next)=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');next();});
  app.use(cookieParser());app.use(express.json({limit:'64kb'}));
  app.use('/api',(req,_res,next)=>{
    if(!['GET','HEAD','OPTIONS'].includes(req.method)) {
      if(req.get('origin')!==origin) throw new HttpError(403,'Nguồn yêu cầu không hợp lệ.');
      if(!req.is('application/json')) throw new HttpError(415,'Yêu cầu cần Content-Type application/json.');
    } next();
  });
  const authLimit=rateLimit({windowMs:15*60*1000,limit:options.authLimit||30,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Thử quá nhiều lần. Vui lòng chờ 15 phút.'}});
  async function session(user:any,res:express.Response){
    const secret=token(),csrf=token();await db.session.deleteMany({where:{expiresAt:{lt:new Date()}}});
    await db.session.create({data:{id:hash(secret),userId:user.id,csrf,expiresAt:new Date(Date.now()+7*86400000)}});
    res.cookie('taskflow_session',secret,cookie);return {user,csrf};
  }
  app.post('/api/auth/register',authLimit,async(req,res)=>{
    const b=z.object({email,password,name:z.string().trim().min(2).max(80)}).strict().parse(req.body);
    const u=await db.user.create({data:{email:b.email,name:b.name,passwordHash:await bcrypt.hash(b.password,12)},select:publicUser});
    res.status(201).json(await session(u,res));
  });
  const dummy=bcrypt.hashSync('constant dummy login password',12);
  app.post('/api/auth/login',authLimit,async(req,res)=>{
    const b=z.object({email,password:z.string().max(200)}).strict().parse(req.body);
    const u=await db.user.findUnique({where:{email:b.email}});
    const valid=await bcrypt.compare(b.password,u?.passwordHash||dummy);
    if(!u||!valid||u.disabled) throw new HttpError(401,'Email hoặc mật khẩu không đúng.');
    const {passwordHash:_,...safe}=u;res.json(await session(safe,res));
  });
  app.use('/api',async(req,res,next)=>{
    const value=req.cookies.taskflow_session;
    if(typeof value!=='string'||value.length!==64)throw new HttpError(401,'Vui lòng đăng nhập.');
    const s=await db.session.findUnique({where:{id:hash(value)},include:{user:{select:publicUser}}});
    if(!s||s.expiresAt<new Date()||s.user.disabled)throw new HttpError(401,'Phiên đăng nhập đã hết hạn.');
    res.locals.auth=s;
    if(!['GET','HEAD','OPTIONS'].includes(req.method)&&!same(req.get('x-csrf-token')||'',s.csrf))throw new HttpError(403,'Mã CSRF không hợp lệ. Hãy tải lại trang.');
    next();
  });
  const actor=(res:express.Response)=>res.locals.auth.user;
  const actorId=(res:express.Response)=>actor(res).id as string;
  const pid=(req:express.Request)=>uid.parse(String(req.params.id));
  async function member(projectId:string,userId:string,write=false,admin=false){
    const m=await db.projectMember.findUnique({where:{projectId_userId:{projectId,userId}},include:{project:true}});
    if(!m)throw new HttpError(404,'Không tìm thấy dự án.');
    if(admin&&!['OWNER','ADMIN'].includes(m.role)||write&&m.role==='VIEWER')throw new HttpError(403,'Bạn không có quyền thực hiện thao tác này.');
    if(write&&m.project.archived)throw new HttpError(409,'Dự án đã lưu trữ. Hãy khôi phục trước khi thay đổi.');
    return m;
  }
  async function task(id:string,userId:string,write=false){const t=await db.task.findUnique({where:{id}});if(!t)throw new HttpError(404,'Không tìm thấy công việc.');const m=await member(t.projectId,userId,write);return {t,m};}
  const activity=(projectId:string,userId:string,action:string,taskId?:string,detail='')=>({projectId,userId,action,taskId,detail});
  app.get('/api/auth/me',(_req,res)=>res.json({user:actor(res),csrf:res.locals.auth.csrf}));
  app.post('/api/auth/logout',async(_req,res)=>{await db.session.delete({where:{id:res.locals.auth.id}});res.clearCookie('taskflow_session',{...cookie,maxAge:undefined});res.status(204).end();});
  app.patch('/api/profile',async(req,res)=>{const b=z.object({name:z.string().trim().min(2).max(80)}).strict().parse(req.body);res.json(await db.user.update({where:{id:actorId(res)},data:b,select:publicUser}));});
  app.post('/api/auth/password',authLimit,async(req,res)=>{
    const b=z.object({currentPassword:z.string().max(200),newPassword:password}).strict().parse(req.body);
    const u=await db.user.findUniqueOrThrow({where:{id:actorId(res)}});
    if(!await bcrypt.compare(b.currentPassword,u.passwordHash))throw new HttpError(400,'Mật khẩu hiện tại không đúng.');
    await db.$transaction([db.user.update({where:{id:u.id},data:{passwordHash:await bcrypt.hash(b.newPassword,12)}}),db.session.deleteMany({where:{userId:u.id}})]);
    res.clearCookie('taskflow_session',{...cookie,maxAge:undefined});res.json({message:'Đã đổi mật khẩu. Vui lòng đăng nhập lại.'});
  });
  app.get('/api/projects',async(_req,res)=>{
    const all=await db.projectMember.findMany({where:{userId:actorId(res)},include:{project:{include:{_count:{select:{tasks:true,members:true}},tasks:{select:{status:true}}}}},orderBy:{project:{createdAt:'desc'}}});
    res.json(all.map(({project,...m})=>({...project,myRole:m.role,done:project.tasks.filter(t=>t.status==='DONE').length,tasks:undefined})));
  });
  app.post('/api/projects',async(req,res)=>{
    const b=z.object({name:z.string().trim().min(2).max(100),description:z.string().max(2000).default(''),type:z.enum(['PERSONAL','TEAM']).default('TEAM')}).strict().parse(req.body);
    const p=await db.project.create({data:{...b,members:{create:{userId:actorId(res),role:'OWNER'}},activities:{create:{userId:actorId(res),action:'PROJECT_CREATED'}}}});res.status(201).json(p);
  });
  app.get('/api/projects/:id',async(req,res)=>{
    const m=await member(pid(req),actorId(res));const p=await db.project.findUnique({where:{id:pid(req)},include:{members:{include:{user:{select:person}}},labels:{orderBy:{name:'asc'}}}});res.json({...p,myRole:m.role});
  });
  app.patch('/api/projects/:id',async(req,res)=>{
    const id=pid(req);await member(id,actorId(res),false,true);
    const b=z.object({name:z.string().trim().min(2).max(100).optional(),description:z.string().max(2000).optional(),archived:z.boolean().optional()}).strict().parse(req.body);
    const [p]=await db.$transaction([db.project.update({where:{id},data:b}),db.activityLog.create({data:activity(id,actorId(res),b.archived===true?'PROJECT_ARCHIVED':b.archived===false?'PROJECT_RESTORED':'PROJECT_UPDATED')})]);res.json(p);
  });
  app.post('/api/projects/:id/members',async(req,res)=>{
    const id=pid(req),m=await member(id,actorId(res),true,true);
    if(m.project.type==='PERSONAL')throw new HttpError(400,'Dự án cá nhân không thêm thành viên.');
    const b=z.object({email,role:z.enum(['ADMIN','MEMBER','VIEWER']).default('MEMBER')}).strict().parse(req.body);
    const u=await db.user.findUnique({where:{email:b.email}});if(!u||u.disabled)throw new HttpError(404,'Tài khoản chưa đăng ký hoặc đã bị khóa.');
    const [added]=await db.$transaction([db.projectMember.create({data:{projectId:id,userId:u.id,role:b.role}}),db.activityLog.create({data:activity(id,actorId(res),'MEMBER_ADDED',undefined,u.name)})]);res.status(201).json(added);
  });
  app.patch('/api/projects/:id/members/:userId',async(req,res)=>{
    const id=pid(req);await member(id,actorId(res),true,true);const userId=uid.parse(String(req.params.userId));
    const target=await db.projectMember.findUnique({where:{projectId_userId:{projectId:id,userId}}});
    if(!target)throw new HttpError(404,'Không tìm thấy thành viên.');if(target.role==='OWNER')throw new HttpError(403,'Không thể đổi quyền chủ dự án.');
    const b=z.object({role:z.enum(['ADMIN','MEMBER','VIEWER'])}).strict().parse(req.body);
    const [changed]=await db.$transaction([db.projectMember.update({where:{projectId_userId:{projectId:id,userId}},data:b}),db.activityLog.create({data:activity(id,actorId(res),'MEMBER_ROLE_CHANGED',undefined,b.role)})]);res.json(changed);
  });
  app.delete('/api/projects/:id/members/:userId',async(req,res)=>{
    const id=pid(req);await member(id,actorId(res),true,true);const userId=uid.parse(String(req.params.userId));
    const target=await db.projectMember.findUnique({where:{projectId_userId:{projectId:id,userId}}});
    if(!target)throw new HttpError(404,'Không tìm thấy thành viên.');if(target.role==='OWNER')throw new HttpError(403,'Không thể xóa chủ dự án.');
    await db.$transaction([db.task.updateMany({where:{projectId:id,assigneeId:userId},data:{assigneeId:null}}),db.projectMember.delete({where:{projectId_userId:{projectId:id,userId}}}),db.activityLog.create({data:activity(id,actorId(res),'MEMBER_REMOVED')})]);res.status(204).end();
  });
  app.post('/api/projects/:id/labels',async(req,res)=>{
    const id=pid(req);await member(id,actorId(res),true,true);
    const b=z.object({name:z.string().trim().min(1).max(40),color:z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1')}).strict().parse(req.body);
    res.status(201).json(await db.label.create({data:{...b,projectId:id}}));
  });
  app.get('/api/tasks',async(req,res)=>{
    const q=z.object({projectId:uid.optional(),status:z.enum(statuses).optional(),priority:z.enum(priorities).optional(),assigneeId:uid.optional(),labelId:uid.optional(),q:z.string().max(100).default(''),my:z.enum(['true']).optional(),overdue:z.enum(['true']).optional(),dueBefore:z.iso.datetime({offset:true}).optional(),dueAfter:z.iso.datetime({offset:true}).optional(),sort:z.enum(['due','updated','priority']).default('due'),page:z.coerce.number().int().min(1).default(1),limit:z.coerce.number().int().min(1).max(500).default(50)}).parse(req.query);
    if(q.projectId)await member(q.projectId,actorId(res));
    const where:Prisma.TaskWhereInput={project:{members:{some:{userId:actorId(res)}},archived:false},projectId:q.projectId,status:q.status,priority:q.priority,assigneeId:q.my?actorId(res):q.assigneeId,labels:q.labelId?{some:{labelId:q.labelId}}:undefined};
    if(q.q)where.OR=[{title:{contains:q.q,mode:'insensitive'}},{description:{contains:q.q,mode:'insensitive'}}];
    if(q.overdue){where.dueAt={lt:new Date()};where.AND=[{status:{not:'DONE'}},...(q.status?[{status:q.status}]:[])];}
    else if(q.dueBefore||q.dueAfter)where.dueAt={lte:q.dueBefore?new Date(q.dueBefore):undefined,gte:q.dueAfter?new Date(q.dueAfter):undefined};
    const orderBy:Prisma.TaskOrderByWithRelationInput[]=q.sort==='updated'?[{updatedAt:'desc'}]:q.sort==='priority'?[{priority:'desc'},{dueAt:{sort:'asc',nulls:'last'}}]:[{dueAt:{sort:'asc',nulls:'last'}},{number:'desc'}];
    const [items,total]=await db.$transaction([db.task.findMany({where,include:taskInclude,orderBy,skip:(q.page-1)*q.limit,take:q.limit}),db.task.count({where})]);res.json({items,total,page:q.page,limit:q.limit});
  });
  async function validateRelations(projectId:string,b:z.infer<typeof taskInput>){
    if(b.assigneeId&&!await db.projectMember.findUnique({where:{projectId_userId:{projectId,userId:b.assigneeId}}}))throw new HttpError(400,'Người phụ trách phải thuộc dự án.');
    if(b.labelIds.length!==new Set(b.labelIds).size||await db.label.count({where:{id:{in:b.labelIds},projectId}})!==b.labelIds.length)throw new HttpError(400,'Nhãn không thuộc dự án hoặc bị trùng.');
  }
  app.post('/api/projects/:id/tasks',async(req,res)=>{
    const projectId=pid(req);await member(projectId,actorId(res),true);const b=taskInput.parse(req.body);await validateRelations(projectId,b);const {labelIds,...data}=b;
    const t=await db.$transaction(async tx=>{const t=await tx.task.create({data:{...data,projectId,creatorId:actorId(res),labels:{create:labelIds.map(labelId=>({labelId}))}},include:taskInclude});await tx.activityLog.create({data:activity(projectId,actorId(res),'TASK_CREATED',t.id,t.title)});return t;});res.status(201).json(t);
  });
  app.get('/api/tasks/:id',async(req,res)=>{
    const id=pid(req),{m}=await task(id,actorId(res));const t=await db.task.findUnique({where:{id},include:{...taskInclude,comments:{include:{user:{select:person}},orderBy:{createdAt:'asc'}},checklist:{orderBy:{id:'asc'}},activities:{include:{user:{select:person}},orderBy:{createdAt:'desc'},take:50}}});res.json({...t,myRole:m.role});
  });
  app.patch('/api/tasks/:id',async(req,res)=>{
    const id=pid(req),{t}=await task(id,actorId(res),true);
    if(req.body&&typeof req.body==='object'&&Object.keys(req.body).length===1&&req.body.status!==undefined){const status=z.enum(statuses).parse(req.body.status);const [changed]=await db.$transaction([db.task.update({where:{id},data:{status},include:taskInclude}),db.activityLog.create({data:activity(t.projectId,actorId(res),'TASK_STATUS_CHANGED',id,`${t.status} → ${status}`)})]);return res.json(changed);}
    const b=taskInput.parse(req.body);await validateRelations(t.projectId,b);const {labelIds,...data}=b;
    const changed=await db.$transaction(async tx=>{await tx.taskLabel.deleteMany({where:{taskId:id}});const u=await tx.task.update({where:{id},data:{...data,labels:{create:labelIds.map(labelId=>({labelId}))}},include:taskInclude});await tx.activityLog.create({data:activity(t.projectId,actorId(res),'TASK_UPDATED',id,t.title)});return u;});res.json(changed);
  });
  app.delete('/api/tasks/:id',async(req,res)=>{
    const id=pid(req),{t,m}=await task(id,actorId(res),true);
    if(t.creatorId!==actorId(res)&&!['OWNER','ADMIN'].includes(m.role))throw new HttpError(403,'Chỉ người tạo hoặc quản trị dự án được xóa.');
    await db.$transaction([db.activityLog.create({data:activity(t.projectId,actorId(res),'TASK_DELETED',undefined,`TASK-${t.number}: ${t.title}`)}),db.task.delete({where:{id}})]);res.status(204).end();
  });
  app.post('/api/tasks/:id/comments',async(req,res)=>{
    const id=pid(req),{t}=await task(id,actorId(res),true);const b=z.object({content:z.string().trim().min(1).max(2000)}).strict().parse(req.body);
    const [c]=await db.$transaction([db.comment.create({data:{...b,taskId:id,userId:actorId(res)},include:{user:{select:person}}}),db.activityLog.create({data:activity(t.projectId,actorId(res),'COMMENT_ADDED',id)})]);res.status(201).json(c);
  });
  app.delete('/api/tasks/:id/comments/:commentId',async(req,res)=>{
    const id=pid(req),{m}=await task(id,actorId(res),true),commentId=uid.parse(String(req.params.commentId));
    const c=await db.comment.findFirst({where:{id:commentId,taskId:id}});if(!c)throw new HttpError(404,'Không tìm thấy bình luận.');
    if(c.userId!==actorId(res)&&!['OWNER','ADMIN'].includes(m.role))throw new HttpError(403,'Không có quyền xóa bình luận.');
    await db.comment.delete({where:{id:commentId}});res.status(204).end();
  });
  app.post('/api/tasks/:id/checklist',async(req,res)=>{
    const id=pid(req);await task(id,actorId(res),true);const b=z.object({title:z.string().trim().min(1).max(200)}).strict().parse(req.body);res.status(201).json(await db.checklistItem.create({data:{...b,taskId:id}}));
  });
  app.patch('/api/tasks/:id/checklist/:itemId',async(req,res)=>{
    const id=pid(req);await task(id,actorId(res),true);const itemId=uid.parse(String(req.params.itemId));const b=z.object({done:z.boolean()}).strict().parse(req.body);
    const result=await db.checklistItem.updateMany({where:{id:itemId,taskId:id},data:b});if(!result.count)throw new HttpError(404,'Không tìm thấy mục checklist.');res.json({ok:true});
  });
  app.delete('/api/tasks/:id/checklist/:itemId',async(req,res)=>{const id=pid(req);await task(id,actorId(res),true);const itemId=uid.parse(String(req.params.itemId));const r=await db.checklistItem.deleteMany({where:{id:itemId,taskId:id}});if(!r.count)throw new HttpError(404,'Không tìm thấy mục checklist.');res.status(204).end();});
  app.get('/api/dashboard',async(_req,res)=>{
    const base:Prisma.TaskWhereInput={project:{members:{some:{userId:actorId(res)}},archived:false}};
    const now=new Date(),soon=new Date(Date.now()+7*86400000);
    const [groups,overdue,upcoming,myTasks,recent]=await db.$transaction([db.task.groupBy({by:['status'],where:base,_count:{_all:true}}),db.task.count({where:{...base,status:{not:'DONE'},dueAt:{lt:now}}}),db.task.findMany({where:{...base,status:{not:'DONE'},dueAt:{gte:now,lte:soon}},include:taskInclude,orderBy:{dueAt:'asc'},take:8}),db.task.count({where:{...base,assigneeId:actorId(res),status:{not:'DONE'}}}),db.activityLog.findMany({where:{project:{members:{some:{userId:actorId(res)}}}},include:{user:{select:person},project:{select:{name:true}}},orderBy:{createdAt:'desc'},take:10})]);
    const counts=Object.fromEntries(statuses.map(s=>[s,groups.find(g=>g.status===s)?._count._all||0]));const total=Object.values(counts).reduce((a,b)=>a+b,0);res.json({counts,total,overdue,upcoming,myTasks,recent,completion:total?Math.round(counts.DONE/total*100):0});
  });
  app.get('/api/admin/users',async(_req,res)=>{if(actor(res).role!=='ADMIN')throw new HttpError(403,'Chỉ quản trị hệ thống được truy cập.');res.json(await db.user.findMany({select:publicUser,orderBy:{createdAt:'desc'},take:200}));});
  app.patch('/api/admin/users/:id',async(req,res)=>{
    if(actor(res).role!=='ADMIN')throw new HttpError(403,'Chỉ quản trị hệ thống được truy cập.');const id=pid(req);if(id===actorId(res))throw new HttpError(400,'Không thể tự khóa tài khoản.');const b=z.object({disabled:z.boolean()}).strict().parse(req.body);
    const [u]=await db.$transaction([db.user.update({where:{id},data:b,select:publicUser}),db.session.deleteMany({where:{userId:id}})]);res.json(u);
  });
  app.use((_req,res)=>res.status(404).json({error:'Không tìm thấy đường dẫn.'}));
  app.use((err:any,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
    let status=err instanceof HttpError?err.status:err instanceof ZodError?400:err?.type==='entity.too.large'?413:err instanceof SyntaxError&&(err as any).status===400?400:500;
    let message=err instanceof HttpError?err.message:err instanceof ZodError?err.issues.map(i=>`${i.path.join('.')||'Dữ liệu'}: ${i.message}`).join('; '):status===413?'Dữ liệu quá lớn.':status===400?'JSON không hợp lệ.':'Hệ thống tạm thời bận. Vui lòng thử lại.';
    if(err instanceof Prisma.PrismaClientKnownRequestError){if(err.code==='P2002'){status=409;message='Dữ liệu đã tồn tại (email, thành viên hoặc nhãn).';}else if(err.code==='P2025'){status=404;message='Không tìm thấy dữ liệu.';}else if(err.code==='P2003'){status=400;message='Dữ liệu tham chiếu không hợp lệ.';}}
    if(status===500)log('error','server_error',{requestId:res.locals.requestId,code:err.code||'internal'});
    res.status(status).json({error:message,requestId:res.locals.requestId});
  });
  return app;
}
