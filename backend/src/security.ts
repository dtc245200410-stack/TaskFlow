import crypto from 'node:crypto';
import {z} from 'zod';
export const uid=z.string().uuid();
export const email=z.string().trim().email().max(254).transform(x=>x.toLowerCase());
export const password=z.string().min(12,'Mật khẩu cần ít nhất 12 ký tự.').max(72).refine(x=>Buffer.byteLength(x,'utf8')<=72,'Mật khẩu tối đa 72 byte UTF-8.');
export const hash=(s:string)=>crypto.createHash('sha256').update(s).digest('hex');
export const token=()=>crypto.randomBytes(32).toString('hex');
export function same(a:string,b:string){const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb);}
export class HttpError extends Error {constructor(public status:number,message:string){super(message);}}
export const publicUser={id:true,name:true,email:true,role:true,disabled:true,createdAt:true} as const;
export const statuses=['TODO','IN_PROGRESS','IN_REVIEW','DONE'] as const;
export const priorities=['LOW','MEDIUM','HIGH','URGENT'] as const;
export const taskInput=z.object({title:z.string().trim().min(1).max(160),description:z.string().max(8000).default(''),status:z.enum(statuses).default('TODO'),priority:z.enum(priorities).default('MEDIUM'),assigneeId:uid.nullable().default(null),startAt:z.iso.datetime({offset:true}).nullable().default(null),dueAt:z.iso.datetime({offset:true}).nullable().default(null),labelIds:z.array(uid).max(20).default([])}).strict().refine(x=>!x.startAt||!x.dueAt||new Date(x.startAt)<=new Date(x.dueAt),'Ngày bắt đầu phải trước hoặc bằng deadline.');
