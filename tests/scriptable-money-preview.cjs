// Canvas approximation only. Real iPhone rendering must still be checked in Scriptable.
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),fs=require('fs'),assert=require('assert/strict');
(async()=>{
 for(const [name,engine] of [['Chrome',chromium],['WebKit',webkit]]){
  const browser=await engine.launch(name==='Chrome'?{channel:'chrome',headless:true}:{headless:true});
  try{
   const page=await browser.newPage({viewport:{width:390,height:470},deviceScaleFactor:2});
   await page.setContent('<style>body{margin:0;padding:20px;background:#e6edd2;font-family:Georgia,serif}p{font-size:12px;color:#405d2d;margin:0 0 8px}img{display:block;width:338px;height:158px;border-radius:23px;margin-bottom:22px;background:linear-gradient(120deg,#fffef6,#edf1d9)}</style><p>고정 + 예상 지출 · Medium</p><img id="budget">');
   await page.evaluate(()=>{
    window.Size=class{constructor(width,height){Object.assign(this,{width,height});}};
    window.Rect=class{constructor(x,y,width,height){Object.assign(this,{x,y,width,height});}};
    window.Color=class{constructor(hex){this.value=hex;}};
    window.Font={systemFont:size=>({size,bold:false}),boldSystemFont:size=>({size,bold:true})};
    window.DrawContext=class{
     set size(value){this.canvas=document.createElement('canvas');this.canvas.width=value.width*2;this.canvas.height=value.height*2;this.ctx=this.canvas.getContext('2d');this.ctx.scale(2,2);}
     setFillColor(color){this.ctx.fillStyle=color.value;}setTextColor(color){this.ctx.fillStyle=color.value;}
     setFont(font){this.ctx.font=(font.bold?'700 ':'400 ')+font.size+'px "Trebuchet MS",sans-serif';}
     setTextAlignedLeft(){this.ctx.textAlign='left';}
     fillRect(r){this.ctx.fillRect(r.x,r.y,r.width,r.height);}
     fillEllipse(r){this.ctx.beginPath();this.ctx.ellipse(r.x+r.width/2,r.y+r.height/2,r.width/2,r.height/2,0,0,2*Math.PI);this.ctx.fill();}
     drawImageInRect(image,r){this.ctx.drawImage(image,r.x,r.y,r.width,r.height);}
     drawTextInRect(value,r){this.ctx.textBaseline='top';this.ctx.fillText(value,r.x,r.y,r.width);}
     getImage(){return this.canvas;}
    };
    window.MobileModel={zone:'America/Edmonton'};
   });
   await page.addScriptTag({content:fs.readFileSync(require.resolve('../scriptable/frog.js'),'utf8')});
   await page.addScriptTag({content:fs.readFileSync(require.resolve('../scriptable/money.js'),'utf8')});
   await page.evaluate(()=>{
    const finance={month:'2026-11',spent:1010,earned:1500,budget:1400,remaining:390,groups:[{type:'fixed',spent:900,budget:900,remaining:0,ratio:1},{type:'expected',spent:110,budget:500,remaining:390,ratio:.22}]};
    for(const [id,kind] of [['budget','budget-month']]){
     const canvas=document.createElement('canvas');canvas.width=676;canvas.height=316;const context=canvas.getContext('2d');context.drawImage(drawMoneyWidget(kind,{finance,updated:Date.parse('2026-11-07T18:00:00Z')},318,138),20,20,636,276);document.getElementById(id).src=canvas.toDataURL();
    }
   });
   await page.locator('#budget').evaluate(image=>image.decode());assert.equal(await page.locator('img').count(),1);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:'/tmp/medium-money-widgets-'+name+'.png',fullPage:true});
   console.log(name+': Medium finance widget canvas approximation rendered');
  }finally{await browser.close();}
 }
})().catch(error=>{console.error(error);process.exit(1)});
