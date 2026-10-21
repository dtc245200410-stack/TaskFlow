let csrf='';
export function setCsrf(s:string){csrf=s;}
export async function api(path:string,method='GET',body?:unknown){
  const response=await fetch('/api'+path,{method,credentials:'same-origin',headers:method==='GET'?{}:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:body===undefined?undefined:JSON.stringify(body)});
  if(response.status===204)return null;
  const data=await response.json().catch(()=>({error:'Phản hồi máy chủ không hợp lệ.'}));
  if(!response.ok){if(response.status===401)window.dispatchEvent(new Event('session-expired'));throw new Error(data.error||'Không thể thực hiện yêu cầu.');}
  if(data.csrf)setCsrf(data.csrf);return data;
}
