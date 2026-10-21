import fs from 'node:fs';
setInterval(()=>{
 let changed=false;
 for(const name of ['access.log','error.log']) {
  const p='/logs/'+name;
  if(!fs.existsSync(p)||fs.statSync(p).size<5*1024*1024)continue;
  for(let i=3;i>=1;i--){const source=i===1?p:p+'.'+(i-1);if(fs.existsSync(source))fs.renameSync(source,p+'.'+i);}
  changed=true;
 }
 if(changed)try{process.kill(1,'SIGUSR1');}catch{process.stderr.write('Cannot reopen Nginx logs\n');}
},30000);
