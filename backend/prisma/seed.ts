import bcrypt from 'bcryptjs';
import {database} from '../src/db.js';
export async function seed(db:any,settings:{adminEmail:string,adminPassword:string,demoPassword:string}) {
  for(const value of [settings.adminPassword,settings.demoPassword])if(Buffer.byteLength(value)<12||Buffer.byteLength(value)>72)throw new Error('Seed passwords must contain 12–72 bytes');
  const admin=await db.user.upsert({where:{email:settings.adminEmail.toLowerCase()},update:{},create:{email:settings.adminEmail.toLowerCase(),name:'Quản trị TaskFlow',passwordHash:await bcrypt.hash(settings.adminPassword,12),role:'ADMIN'}});
  const member=await db.user.upsert({where:{email:'member@taskflow.local'},update:{},create:{email:'member@taskflow.local',name:'Thành viên demo',passwordHash:await bcrypt.hash(settings.demoPassword,12)}});
  const viewer=await db.user.upsert({where:{email:'viewer@taskflow.local'},update:{},create:{email:'viewer@taskflow.local',name:'Người xem demo',passwordHash:await bcrypt.hash(settings.demoPassword,12)}});
  // Only initialize each demo project once. A second seed never resets user changes.
  if(!await db.project.findUnique({where:{demoKey:'team-demo'}}))await db.$transaction(async(tx:any)=>{
    const p=await tx.project.create({data:{name:'Ra mắt TaskFlow',description:'Không gian làm việc nhóm cho đồ án Đề 24. Theo dõi chức năng, hạ tầng và kiểm thử.',type:'TEAM',demoKey:'team-demo',members:{create:[{userId:admin.id,role:'OWNER'},{userId:member.id,role:'MEMBER'},{userId:viewer.id,role:'VIEWER'}]}}});
    const labels=[];for(const [name,color]of [['Frontend','#6366f1'],['Backend','#0d9488'],['DevOps','#d97706']])labels.push(await tx.label.create({data:{projectId:p.id,name,color}}));
    const titles=['Thiết kế giao diện Kanban','Xây dựng API công việc','Kiểm tra quyền truy cập dự án','Cấu hình Nginx và HTTPS','Dashboard Prometheus và Grafana','Tập trung log với Loki','Kiểm thử dữ liệu sau restart','Hoàn thiện báo cáo đồ án','Rà soát các task quá hạn','Chuẩn bị buổi demo'];
    for(let i=0;i<titles.length;i++){
      const due=new Date();due.setDate(due.getDate()+i-2);due.setHours(23,59,0,0);
      const status=['IN_PROGRESS','IN_REVIEW','DONE','DONE','TODO','IN_PROGRESS','TODO','TODO','TODO','TODO'][i];
      const t=await tx.task.create({data:{projectId:p.id,title:titles[i],description:'Công việc mẫu có thể chỉnh sửa. Tiêu chí hoàn thành: thực hiện, kiểm tra và ghi lại minh chứng.',status,priority:['HIGH','URGENT','MEDIUM','HIGH','MEDIUM','HIGH','LOW','MEDIUM','URGENT','LOW'][i],creatorId:admin.id,assigneeId:i%2?member.id:admin.id,dueAt:due,labels:{create:{labelId:labels[i%3].id}},checklist:{create:[{title:'Thực hiện nội dung chính',done:status==='DONE'},{title:'Kiểm tra và ghi nhận kết quả',done:status==='DONE'}]}}});
      await tx.activityLog.create({data:{projectId:p.id,taskId:t.id,userId:admin.id,action:'TASK_CREATED',detail:t.title}});
    }
  });
  if(!await db.project.findUnique({where:{demoKey:'personal-demo'}}))await db.project.create({data:{demoKey:'personal-demo',name:'Kế hoạch cá nhân',description:'Chỉ chủ dự án nhìn thấy dữ liệu trong không gian này.',type:'PERSONAL',members:{create:{userId:admin.id,role:'OWNER'}}}});
  return {admin,member,viewer};
}
if(process.argv[1]?.endsWith('seed.ts')||process.argv[1]?.endsWith('seed.js')) {
  const db=database();
  try {
    const {ADMIN_EMAIL,ADMIN_INITIAL_PASSWORD,DEMO_PASSWORD}=process.env;
    if(!ADMIN_EMAIL||!ADMIN_INITIAL_PASSWORD||!DEMO_PASSWORD)throw new Error('Missing ADMIN_EMAIL, ADMIN_INITIAL_PASSWORD or DEMO_PASSWORD');
    await seed(db,{adminEmail:ADMIN_EMAIL,adminPassword:ADMIN_INITIAL_PASSWORD,demoPassword:DEMO_PASSWORD});
    console.log('Seed completed. Existing passwords and projects were preserved.');
  } finally {await db.$disconnect();}
}
