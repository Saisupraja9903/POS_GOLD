import { chromium } from 'playwright-core';
const base='http://localhost:5174/pos';
const accounts=[
  {role:'SALES_MANAGER',email:'sales.manager@demo.jewellery',password:'Sales@12345',home:'/team',visible:['Products','Invoices','Gold Exchange','Old Gold Buyback','Returns','Team','Reports','Return Reports','Settings'],hidden:['Billing']},
  {role:'BRANCH_MANAGER',email:'branch.manager@demo.jewellery',password:'Branch@12345',home:'/reports',visible:['Products','Invoices','Old Gold Buyback','Returns','Team','Reports','Return Reports','Settings'],hidden:['Billing','Gold Exchange']},
];
function assert(value,message){if(!value)throw new Error(message)}
async function login(page,account){await page.goto(`${base}/`,{waitUntil:'networkidle'});await page.evaluate(async({email,password})=>{const response=await fetch('/pos-api/v1/auth/pos/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});const body=await response.json();if(!response.ok)throw new Error(JSON.stringify(body));sessionStorage.setItem('pos_access_token',body.access_token);sessionStorage.setItem('pos_refresh_token',body.refresh_token)},account)}
async function authorizedFetch(page,path,options={}){return page.evaluate(async({path,options})=>{const token=sessionStorage.getItem('pos_access_token');const response=await fetch(path,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(options.headers||{})}});return {status:response.status,body:await response.text()}},{path,options})}
const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
try{
  for(const account of accounts){
    const page=await browser.newPage({viewport:{width:1440,height:1000}});await login(page,account);await page.goto(`${base}${account.home}`,{waitUntil:'networkidle'});
    const menu=await page.locator('aside nav').innerText();for(const label of account.visible)assert(menu.includes(label.toUpperCase()),`${account.role} missing ${label}`);for(const label of account.hidden)assert(!menu.includes(label.toUpperCase()),`${account.role} sees ${label}`);
    await page.goto(`${base}/billing`,{waitUntil:'networkidle'});assert(!page.url().endsWith('/billing'),`${account.role} opened Billing`);
    await page.goto(`${base}/old-gold-buyback`,{waitUntil:'networkidle'});await page.getByText('Supervisory access · Buyback history and details are view only').waitFor();assert(await page.getByRole('button',{name:'New Buyback'}).count()===0,`${account.role} sees New Buyback`);
    const oldGold=await authorizedFetch(page,'/pos-api/v1/pos/old-gold-buybacks/valuation',{method:'POST',body:'{}'});const exchange=await authorizedFetch(page,'/pos-api/v1/pos/exchanges',{method:'POST',body:'{}'});assert(oldGold.status===403,`${account.role} Old Gold mutation returned ${oldGold.status}`);assert(exchange.status===403,`${account.role} exchange mutation returned ${exchange.status}`);
    if(account.role==='SALES_MANAGER'){await page.goto(`${base}/exchange`,{waitUntil:'networkidle'});await page.getByText('GOLD EXCHANGE · REPORT / HISTORY').waitFor();assert(await page.getByText('Enter exchange details').count()===0,'Sales Manager sees exchange entry')}
    await page.goto(`${base}/team`,{waitUntil:'networkidle'});await page.getByText(account.role==='SALES_MANAGER'?'Sales Manager → My Sales Persons':'Branch Manager → Sales Manager → Sales Person').waitFor();
    if(account.role==='SALES_MANAGER'){const team=JSON.parse((await authorizedFetch(page,'/pos-api/v1/pos/team')).body);assert(team.every(member=>member.role_code==='SALES_PERSON'),'Sales Manager team includes another role')}
    if(account.role==='BRANCH_MANAGER'){
      const team=JSON.parse((await authorizedFetch(page,'/pos-api/v1/pos/team')).body);const manager=team.find(member=>member.role_code==='SALES_MANAGER'&&member.email==='sales.manager@demo.jewellery')||team.find(member=>member.role_code==='SALES_MANAGER');assert(manager,'No Sales Manager available');const suffix=Date.now();const payload={full_name:'P1 Hierarchy Proof',employee_id:`P1-${suffix}`,phone:'9876504321',email:`p1-${suffix}@example.com`,password:'Temporary@123',role_code:'SALES_PERSON',manager_id:manager.id};
      const invalid=await authorizedFetch(page,'/pos-api/v1/pos/team',{method:'POST',body:JSON.stringify({...payload,email:`invalid-${suffix}@example.com`,employee_id:`P1-X-${suffix}`,manager_id:'00000000-0000-0000-0000-000000000001'})});assert(invalid.status===403,`Unrelated manager assignment returned ${invalid.status}: ${invalid.body}`);
      const created=await authorizedFetch(page,'/pos-api/v1/pos/team',{method:'POST',body:JSON.stringify(payload)});assert(created.status===201,`Branch Manager creation returned ${created.status}: ${created.body}`);const staffId=JSON.parse(created.body).id;
      const managerPage=await browser.newPage();await login(managerPage,accounts[0]);const assigned=JSON.parse((await authorizedFetch(managerPage,'/pos-api/v1/pos/team')).body).filter(member=>member.id===staffId);assert(assigned.length===1&&assigned[0].manager_id===manager.id,'Created Sales Person not persisted under selected manager');await managerPage.close();await authorizedFetch(page,`/pos-api/v1/pos/team/${staffId}`,{method:'DELETE'});
    }
    await page.close();
  }
  console.log('Sales Person baseline and manager role workflows passed.');
}finally{await browser.close()}
