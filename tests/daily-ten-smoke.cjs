'use strict';
const {chromium}=require('playwright');const {spawn}=require('node:child_process');const http=require('node:http');const path=require('node:path');const assert=require('node:assert/strict');
const ids=['count-ferry-seats','shape-bridge-fit','color-tram-lamps','memory-airport-gates','sound-train-rhythm','direction-tugboat','order-bus-trip','observation-construction','cause-balloon-burner','operation-snow-truck'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(){for(let i=0;i<100;i++){try{await new Promise((ok,no)=>http.get('http://127.0.0.1:18765/index.html',r=>{r.resume();r.statusCode===200?ok():no(Error('HTTP '+r.statusCode))}).on('error',no));return}catch{await sleep(100)}}throw Error('HTTP server not ready')}
async function main(){const server=spawn('python3',['-m','http.server','18765','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});let browser;const failures=[];
try{await ready();browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox']});
for(const width of [320,390,768])for(const id of ids){const page=await browser.newPage({viewport:{width,height:width===768?1024:700}}),errors=[];page.on('pageerror',e=>errors.push(e.message));try{
await page.addInitScript(()=>{window.speechSynthesis={cancel(){},speak(u){u.onend?.()},getVoices(){return[]}};window.SpeechSynthesisUtterance=class{constructor(t){this.text=t}}});
const response=await page.goto('http://127.0.0.1:18765/games/play/daily-20261122.html?id='+id);assert.equal(response.status(),200);await page.getByRole('button',{name:'▶️ はじめる'}).click();
for(let round=0;round<3;round++){await page.waitForFunction(n=>document.querySelector('#progress')?.textContent.startsWith((n+1)+' / 3'),round);
let rememberedGate='';let nextBus=0;for(let attempts=0;attempts<24;attempts++){const p=await page.locator('#progress').textContent();if(!p.startsWith((round+1)+' / 3'))break;const buttons=await page.locator('#choices button').allTextContents();assert.ok(buttons.length,'choices exist');
let choice=buttons[0];if(id==='memory-airport-gates'){choice=buttons.includes('👀 おぼえた')?(rememberedGate=(await page.locator('#visual').textContent()).match(/✈️([ＡＢＣ])/)?.[1]||'Ａ','👀 おぼえた'):rememberedGate}
if(id==='sound-train-rhythm')choice='🔔 たたく';
if(id==='direction-tugboat')choice=buttons[attempts%buttons.length];
if(id==='order-bus-trip')choice=buttons.find(x=>x.includes(['のる','しめる','しゅっぱつ'][nextBus]))||buttons[0];
if(id==='operation-snow-truck')choice='🚛 すすむ';
if(id==='cause-balloon-burner')choice=['🔥 つよく','❄️ よわく','✋ そのまま'][round];
if(id==='shape-bridge-fit')choice=['●','▲','■'][round];
if(id==='color-tram-lamps')choice=['🔴','🟡','🟢'][round];
if(id==='count-ferry-seats')choice=String((await page.locator('#visual').textContent()).split('🐶').length-1);
if(id==='observation-construction')choice=['🔨','🪣','🧱'][round];
const before=await page.locator('#visual').textContent();await page.locator('#choices button').filter({hasText:choice}).first().click();await page.waitForTimeout(900);if(id==='order-bus-trip'&&(await page.locator('#visual').textContent())!==before)nextBus=Math.min(2,nextBus+1)}
assert.notEqual((await page.locator('#progress').textContent()).startsWith((round+1)+' / 3'),true,'stage advanced')}
await page.getByRole('button',{name:'🔁 もういちど'}).waitFor({timeout:10000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.deepEqual(errors,[]);await page.getByRole('button',{name:'🔁 もういちど'}).click();await page.getByRole('button',{name:'▶️ はじめる'}).waitFor();console.log('PASS',width,id);
}catch(e){failures.push(width+' '+id+': '+e.message);console.error('FAIL',width,id,e.message)}finally{await page.close()}}
}finally{await browser?.close();server.kill()}if(failures.length){console.error(failures.join('\n'));process.exitCode=1}}
main().catch(e=>{console.error(e);process.exitCode=1});