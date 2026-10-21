import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('..',import.meta.url));
const require=createRequire(new URL('../frontend/package.json',import.meta.url));
const {chromium}=require('playwright');
const dir=mkdtempSync(path.join(tmpdir(),'taskflow-ui-'));
const output=path.join(root,'docs/evidence');mkdirSync(output,{recursive:true});
const results=[],errors=[];
const children=[];
function start(args,cwd,env={}){const p=spawn(process.execPath,args,{cwd,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});let log='';p.stdout.on('data',x=>{log+=x});p.stderr.on('data',x=>{log+=x});p.qaLog=()=>log;children.push(p);return p;}
const apiServer=start(['--import','tsx','test/work-preview.ts'],path.join(root,'backend'),{QA_DATA_DIR:dir});
start(['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4173'],path.join(root,'frontend'));
let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4000/health')).ok&&(await fetch('http://127.0.0.1:4173')).ok)break}catch{}if(i===99)throw new Error('Preview startup failed: '+apiServer.qaLog());await new Promise(r=>setTimeout(r,200));}
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173');await page.getByRole('heading',{name:'Chào mừng trở lại'}).waitFor();await page.screenshot({path:path.join(output,'ui-login.png'),fullPage:true});
 await page.getByLabel('Email',{exact:true}).fill('admin@taskflow.local');await page.getByLabel('Mật khẩu',{exact:true}).fill('QA-preview-only-2026-strong');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
 await page.getByRole('heading',{name:'Tổng quan',exact:true}).waitFor();await page.getByText('Tiến độ công việc',{exact:true}).waitFor();await page.screenshot({path:path.join(output,'ui-dashboard.png'),fullPage:true});results.push('PASS login and live database dashboard');
 await page.getByRole('link',{name:'Ra mắt TaskFlow',exact:true}).click();await page.getByRole('button',{name:'Thiết kế giao diện Kanban',exact:true}).waitFor();await page.screenshot({path:path.join(output,'ui-kanban.png'),fullPage:true});
 // Pointer drag between real droppable columns, followed by a reload and API read.
 const handle=page.getByRole('button',{name:'Kéo Thiết kế giao diện Kanban',exact:true});const from=await handle.boundingBox();const to=await page.locator('.kanban-column').filter({has:page.getByRole('heading',{name:'Hoàn thành',exact:true})}).boundingBox();
 await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();await page.mouse.move(from.x+20,from.y+10,{steps:4});await page.mouse.move(to.x+to.width/2,to.y+90,{steps:20});await page.mouse.up();await page.getByRole('status').filter({hasText:'Đã lưu trạng thái'}).waitFor();await page.reload();
 await page.locator('.kanban-column').filter({has:page.getByRole('heading',{name:'Hoàn thành',exact:true})}).getByRole('button',{name:'Thiết kế giao diện Kanban',exact:true}).waitFor();results.push('PASS real Kanban pointer drag persists after reload');
 await page.getByRole('button',{name:'Tạo công việc',exact:true}).click();const form=page.getByRole('dialog',{name:'Tạo công việc mới'});await form.getByLabel('Tiêu đề công việc').fill('QA giao diện tự động');await form.getByLabel('Mô tả',{exact:true}).fill('Nội dung kiểm thử UI');await form.getByRole('button',{name:'Tạo công việc',exact:true}).click();
 await page.getByRole('dialog').getByRole('heading',{name:'QA giao diện tự động',exact:true}).waitFor();await page.getByLabel('Nội dung checklist').fill('Kiểm tra lưu dữ liệu');await page.getByRole('button',{name:'Thêm',exact:true}).click();await page.getByLabel('Kiểm tra lưu dữ liệu',{exact:true}).check();await page.getByLabel('Nội dung bình luận').fill('Bình luận từ kiểm thử trình duyệt');await page.getByRole('button',{name:'Gửi bình luận',exact:true}).click();await page.getByText('Bình luận từ kiểm thử trình duyệt',{exact:true}).waitFor();await page.screenshot({path:path.join(output,'ui-detail.png'),fullPage:true});
 await page.getByRole('button',{name:'Chỉnh sửa',exact:true}).click();await page.getByLabel('Tiêu đề công việc').fill('QA giao diện đã cập nhật');await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();await page.getByRole('heading',{name:'QA giao diện đã cập nhật',exact:true}).waitFor();results.push('PASS create/edit task, checklist and comment');
 await page.getByRole('button',{name:'Đóng',exact:true}).click();await page.getByRole('link',{name:'Tất cả công việc',exact:true}).click();await page.getByRole('heading',{name:'Tất cả công việc',exact:true}).waitFor();await page.getByLabel('Tìm trong danh sách').fill('QA giao diện đã cập nhật');await page.getByRole('button',{name:/QA giao diện đã cập nhật/}).waitFor();await page.screenshot({path:path.join(output,'ui-list.png'),fullPage:true});results.push('PASS task search and list navigation');
 await page.getByRole('button',{name:/QA giao diện đã cập nhật/}).click();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Xóa công việc',exact:true}).click();await page.getByRole('heading',{name:'Không có công việc phù hợp',exact:true}).waitFor();results.push('PASS task deletion');
 await page.getByRole('link',{name:'Lịch công việc',exact:true}).click();await page.getByRole('heading',{name:'Lịch công việc',exact:true}).waitFor();await page.locator('.calendar-cell').first().waitFor();await page.screenshot({path:path.join(output,'ui-calendar.png'),fullPage:true});
 await page.locator('a[href="/projects"]').click();await page.getByRole('heading',{name:'Ra mắt TaskFlow',exact:true}).waitFor();await page.screenshot({path:path.join(output,'ui-projects.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/dashboard');await page.getByText('Tiến độ công việc',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);await page.screenshot({path:path.join(output,'ui-mobile.png'),fullPage:true});await page.getByRole('button',{name:'Mở menu'}).click();await page.getByRole('link',{name:'Công việc của tôi',exact:true}).click();await page.getByRole('heading',{name:'Công việc của tôi',exact:true}).waitFor();results.push('PASS mobile width 390, navigation and no horizontal overflow');
 assert.deepEqual(errors,[]);results.push('PASS no browser pageerror');
 writeFileSync(path.join(output,'ui-results.json'),JSON.stringify({environment:'Chromium + Vite production build + Express/Prisma/PGlite over HTTP, not Docker Compose',results,errors},null,2));console.log(results.join('\n'));
}catch(e){if(browser){const page=browser.contexts()[0]?.pages()[0];if(page){await page.screenshot({path:path.join(tmpdir(),'taskflow-ui-failure.png'),fullPage:true});console.error((await page.locator('body').innerText()).slice(-7000));}}throw e;}finally{if(browser)await browser.close();for(const p of children)p.kill('SIGTERM');await new Promise(r=>setTimeout(r,600));rmSync(dir,{recursive:true,force:true});}
