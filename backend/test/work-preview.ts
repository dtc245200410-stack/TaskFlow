// Local QA harness. Never used by Docker Compose production startup.
import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import {readFileSync} from 'node:fs';
import {database} from '../src/db.js';
import {createApp} from '../src/app.js';
import {seed} from '../prisma/seed.js';
process.env.DB_POOL_SIZE='1';
const wasm=await PGlite.create(process.env.QA_DATA_DIR||'/tmp/taskflow-preview');
const exists=await wasm.query("SELECT to_regclass('public.\"User\"') AS t");
if(!(exists.rows[0] as any).t)await wasm.exec(readFileSync(new URL('../prisma/migrations/202610210001_initial/migration.sql',import.meta.url),'utf8'));
const socket=new PGLiteSocketServer({db:wasm,port:55440,host:'127.0.0.1'});await socket.start();
const db=database('postgresql://postgres:unused@127.0.0.1:55440/postgres');
const settings={adminEmail:'admin@taskflow.local',adminPassword:'QA-preview-only-2026-strong',demoPassword:'QA-preview-only-2026-strong'};
await seed(db,settings);const before=await db.task.count();await seed(db,settings);if(await db.task.count()!==before)throw new Error('Seed duplicated demo tasks');
const server=createApp(db,{origin:'http://127.0.0.1:4173',secure:false,authLimit:200}).listen(4000,'127.0.0.1');
console.log('QA_READY: Prisma + PGlite; seed idempotence verified; not Docker PostgreSQL.');
async function stop(){await new Promise<void>(r=>server.close(()=>r()));await db.$disconnect();await socket.stop();await wasm.close();process.exit(0)}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
