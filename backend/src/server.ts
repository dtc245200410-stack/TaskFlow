import {database} from './db.js';
import {createApp} from './app.js';
import {log} from './logger.js';
const db=database();
const server=createApp(db).listen(Number(process.env.PORT||4000),'0.0.0.0',()=>log('info','server_started',{port:Number(process.env.PORT||4000)}));
async function shutdown(){server.close();await db.$disconnect();process.exit(0);}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
