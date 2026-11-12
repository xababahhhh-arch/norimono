'use strict';
// Runs the same 20-game browser fixture at four sizes. No paid service.
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const assert = require('node:assert/strict');
const pause = ms => new Promise(resolve => setTimeout(resolve,ms));
async function ready() {
  for(let i=0;i<60;i++) {
    try {await new Promise((resolve,reject)=>http.get('http://127.0.0.1:18765/index.html',r=>{r.resume();r.statusCode===200?resolve():reject(Error('HTTP '+r.statusCode))}).on('error',reject));return}
    catch {await pause(100)}
  }
  throw Error('Local server did not start');
}
async function main() {
  const server=spawn('python3',['-m','http.server','18765','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});
  let browser;const failures=[];
  try {
    await ready();
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox']});
    for(const size of ['small','phone','tablet','pc']) {
      const page=await browser.newPage();
      try {
        await page.goto('http://127.0.0.1:18765/tests/daily-quality-browser.html?size='+size);
        await page.getByRole('button',{name:'20本を検証'}).click();
        await page.waitForFunction(()=>['pass','fail'].includes(document.body.dataset.result),null,{timeout:240000});
        const report=await page.locator('#out').innerText();
        console.log(report);
        assert.equal(await page.locator('body').getAttribute('data-result'),'pass',report);
      } catch(e) { failures.push(size+': '+e.message); }
      finally { await page.close(); }
    }
  } finally {await browser?.close();server.kill()}
  if(failures.length){console.error(failures.join('\n'));process.exitCode=1}
}
main().catch(e=>{console.error(e);process.exitCode=1});
