'use strict';
// Free local Playwright smoke test for the ten November 17 games.
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const http=require('node:http');
const path=require('node:path');
const assert=require('node:assert/strict');
const ids=["count-wheel-pairs","shape-window-puzzle","color-signal-mix","memory-boat-passenger","sound-boat-horn","direction-drone-landing","order-rescue-tools","observation-bus-mirror","cause-sail-angle","operation-bulldozer"];
const answers={"count-wheel-pairs":[["2"],["3"],["4"]],"shape-window-puzzle":[["●"],["▲"],["■"]],"color-signal-mix":[["🔴"],["🔵"],["🟡"]],"memory-boat-passenger":[["🐶"],["🐱"],["🐰"]],"sound-boat-horn":[["2"],["3"],["4"]],"direction-drone-landing":[["⬅️"],["⬆️"],["➡️"]],"order-rescue-tools":[["🎒","🩹","🚑"],["🎒","🩹","🚑"],["🎒","🩹","🚑"]],"observation-bus-mirror":[["🐶"],["🐱"],["🐰"]],"cause-sail-angle":[["ひらく"],["すこし"],["とじる"]],"operation-bulldozer":[["おす","おす"],["おす","おす","おす"],["おす","おす","おす","おす"]]};
const sleep=t=>new Promise(r=>setTimeout(r,t));
async function ready(){for(let i=0;i<80;i++){try{await new Promise((ok,no)=>http.get('http://127.0.0.1:18765/index.html',r=>{r.resume();r.statusCode===200?ok():no(Error('HTTP '+r.statusCode))}).on('error',no));return}catch{await sleep(100)}}throw Error('Local HTTP server not ready')}
async function main(){const server=spawn('python3',['-m','http.server','18765','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});let browser;const failures=[];
try{await ready();browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox']});
for(const width of [320,390,768])for(const id of ids){const page=await browser.newPage({viewport:{width,height:width===768?1024:700}});const errors=[];page.on('pageerror',e=>errors.push(e.message));try{
await page.addInitScript(()=>{window.speechSynthesis={cancel(){},speak(u){setTimeout(()=>u.onend?.(),0)},getVoices(){return[]}};window.SpeechSynthesisUtterance=class{constructor(text){this.text=text}}});
const response=await page.goto('http://127.0.0.1:18765/games/play/daily-20261117.html?id='+id);assert.equal(response.status(),200);
await page.getByRole('button',{name:'▶️ はじめる'}).click();
for(let round=0;round<3;round++){const seq=answers[id][round];await page.waitForFunction(n=>document.querySelector('#progress')?.textContent.startsWith((n+1)+' / 3'),round);
await page.waitForFunction(()=>document.body.dataset.speaking==='false');if(id==='sound-boat-horn')await page.waitForTimeout(2600);
const wrong=await page.locator('#choices button').allTextContents();const bad=wrong.find(x=>x!==seq[0]);if(bad){await page.locator('#choices button').filter({hasText:bad}).first().click();await page.waitForFunction(()=>document.querySelector('#hint')?.textContent.includes('これは'));await page.waitForTimeout(id==='sound-boat-horn'?2800:300)}
for(const answer of seq){await page.locator('#choices button').filter({hasText:answer}).first().click();await page.waitForTimeout(700)}
}
await page.getByRole('button',{name:'🔁 もういちど'}).waitFor({timeout:12000});
const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);assert.equal(overflow,false,'horizontal overflow');
assert.deepEqual(errors,[],'JavaScript errors');
await page.getByRole('button',{name:'🔁 もういちど'}).click();await page.getByRole('button',{name:'▶️ はじめる'}).waitFor();
console.log('PASS',width,id);
}catch(e){failures.push(width+' '+id+': '+e.message);console.error('FAIL',width,id,e.message)}finally{await page.close()}}
}finally{await browser?.close();server.kill()}
if(failures.length){console.error(failures.join('\n'));process.exitCode=1}
}
main().catch(e=>{console.error(e);process.exitCode=1});