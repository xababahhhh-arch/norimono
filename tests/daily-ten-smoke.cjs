'use strict';
// Free browser smoke test: 10 games × 3 viewport sizes. No GitHub Actions billing.
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const assert = require('node:assert/strict');
const games = ['bridge-planks','fuel-match','mirror-bus','traffic-pause','repair-wheels','tunnel-echo','delivery-map','shadow-cloud','boat-current','rescue-priority'];
const pause = ms => new Promise(resolve => setTimeout(resolve,ms));
async function ready() {
  for(let i=0;i<60;i++) {
    try {await new Promise((resolve,reject)=>http.get('http://127.0.0.1:18765/index.html',r=>{r.resume();r.statusCode===200?resolve():reject(Error('HTTP '+r.statusCode))}).on('error',reject));return}
    catch {await pause(100)}
  }
  throw Error('Local server did not start');
}
async function testGame(page,id) {
  const errors=[];
  const onError=e=>errors.push(e.message);
  page.on('pageerror',onError);
  try {
    const response=await page.goto('http://127.0.0.1:18765/games/play/'+id+'.html');
    assert.equal(response.status(),200);
    await page.getByRole('button',{name:/はじめる/}).click();
    for(let round=0;round<3;round++) {
      const count=(id==='tunnel-echo'||id==='delivery-map')?round+2:1;
      for(let step=0;step<count;step++) {
        await page.waitForFunction(()=>document.querySelector('#progress')?.textContent.includes('/ 3')&&document.querySelectorAll('#choices button').length>0);
        await pause(380);
        const old=await page.locator('#progress').textContent();
        let progressed=false;
        // Try choices until a correct selection advances the stage.
        const options=await page.locator('#choices button').allTextContents();
        for(const option of options) {
          const b=page.locator('#choices button').filter({hasText:option}).first();
          if(!await b.count())continue;
          await b.click();
          try {
            await page.waitForFunction(previous=>{
              const p=document.querySelector('#progress')?.textContent||'';
              return p!==previous || document.querySelector('#stage')?.textContent.includes('🎉');
            },old,{timeout:1800});
            progressed=true;break;
          } catch {await pause(350)}
        }
        assert.ok(progressed,id+' did not advance from '+old);
      }
    }
    await page.waitForFunction(()=>document.querySelector('#stage')?.textContent.includes('🎉'),null,{timeout:7000});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'horizontal overflow');
    await page.getByRole('button',{name:'もういちど'}).click();
    await page.waitForFunction(()=>document.querySelector('#progress')?.textContent.includes('1 / 3'),null,{timeout:7000});
    assert.deepEqual(errors,[]);
  } finally {page.off('pageerror',onError)}
}
async function main() {
  const server=spawn('python3',['-m','http.server','18765','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});
  let browser;const failures=[];
  try {
    await ready();
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox']});
    for(const viewport of [{width:320,height:568},{width:390,height:844},{width:768,height:1024}]) {
      const page=await browser.newPage({viewport,hasTouch:true,isMobile:true});
      await page.addInitScript(()=>{
        window.SpeechSynthesisUtterance=class {constructor(text){this.text=text}};
        window.speechSynthesis={cancel(){},speak(u){setTimeout(()=>u.onend?.(),5)},getVoices(){return []}};
      });
      for(const id of games) {
        try {await testGame(page,id);console.log('PASS',id,viewport.width+'x'+viewport.height)}
        catch(e){const msg=id+' '+viewport.width+'x'+viewport.height+': '+e.message;failures.push(msg);console.error('FAIL',msg)}
      }
      await page.close();
    }
  } finally {await browser?.close();server.kill()}
  if(failures.length){console.error(failures.join('\n'));process.exitCode=1}
}
main().catch(e=>{console.error(e);process.exitCode=1});
