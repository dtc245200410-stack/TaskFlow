import fs from 'node:fs';
import path from 'node:path';
const dir=process.env.LOG_DIR;
if(dir) fs.mkdirSync(dir,{recursive:true});
export function log(level:string,event:string,fields:Record<string,unknown>={}) {
  const line=JSON.stringify({time:new Date().toISOString(),level,event,...fields})+'\n';
  process.stdout.write(line);
  if(dir) {
    const p=path.join(dir,'backend.log');
    try {
      if(fs.existsSync(p)&&fs.statSync(p).size>5*1024*1024) {
        for(let i=3;i>=1;i--){const s=i===1?p:p+'.'+(i-1);if(fs.existsSync(s))fs.renameSync(s,p+'.'+i);}
      }
      fs.appendFileSync(p,line);
    } catch {process.stderr.write('TaskFlow log file unavailable\n');}
  }
}
