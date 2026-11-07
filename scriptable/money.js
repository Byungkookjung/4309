// Fixed drawing bounds keep the expense budget widget readable at the Medium size.
function drawMoneyWidget(kind,snapshot,width,height,error){
    const ctx=new DrawContext();ctx.size=new Size(width,height);ctx.opaque=false;ctx.respectScreenScale=true;
    const sx=width/318,sy=height/138,scale=Math.min(sx,sy),state=snapshot.finance;
    const rect=(x,y,w,h)=>new Rect(x*sx,y*sy,w*sx,h*sy);
    const money=value=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',currencyDisplay:'narrowSymbol'}).format(value);
    function label(value,x,y,w,size,color='#30422a',bold=false){
        value=String(value);
        const fitted=Math.min(size,w/Math.max(1,Array.from(value).reduce((sum,c)=>sum+(c.codePointAt(0)>255?1:.66),0)));
        ctx.setTextAlignedLeft();ctx.setTextColor(new Color(color));ctx.setFont(bold?Font.boldSystemFont(fitted*scale):Font.systemFont(fitted*scale));
        ctx.drawTextInRect(value,rect(x,y,w,size+4));
    }
    function tile(x,y,w,h,color){
        const r=7;ctx.setFillColor(new Color(color));
        ctx.fillRect(rect(x+r,y,w-2*r,h));ctx.fillRect(rect(x,y+r,w,h-2*r));
        for(const [a,b] of [[x,y],[x+w-2*r,y],[x,y+h-2*r],[x+w-2*r,y+h-2*r]])ctx.fillEllipse(rect(a,b,2*r,2*r));
    }
    label('고정 + 예상 지출',0,0,260,14,'#405d2d',true);
    label(state.month+' · CAD',0,21,260,9,'#69765c');
    ctx.drawImageInRect(frogStamp(),rect(293,0,24,22));
    const ink=state.remaining<0?'#ae4e50':'#405d2d';
    label(state.remaining<0?'이번 달 초과 지출':'이번 달 남은 예산',0,40,132,10,'#69765c',true);
    label(money(Math.abs(state.remaining)),0,59,132,28,ink,true);
    label('사용 '+money(state.spent),0,99,132,9,'#69765c');
    label('예산 '+money(state.budget),0,113,132,9,'#69765c');
    state.groups.forEach((group,index)=>{
        const y=37+index*45,x=145,w=173,color=group.remaining<0?'#ae4e50':'#587b38';
        tile(x,y,w,40,'#ffffff');
        label(group.type==='fixed'?'고정':'예상',x+9,y+5,33,10,'#30422a',true);
        label('사용 '+money(group.spent),x+46,y+4,w-55,12,'#30422a',true);
        label(money(Math.abs(group.remaining))+(group.remaining<0?' 초과':' 남음'),x+9,y+21,w-18,9,color);
        ctx.setFillColor(new Color('#e3ead5'));ctx.fillRect(rect(x+9,y+35,w-18,3));
        if(group.ratio>0){ctx.setFillColor(new Color(color));ctx.fillRect(rect(x+9,y+35,(w-18)*group.ratio,3));}
    });
    const updated=new Intl.DateTimeFormat('en-CA',{timeZone:MobileModel.zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(snapshot.updated));
    label(error?'오프라인 · '+updated+' 기준':updated+' 업데이트 · 월예산 기준',0,125,318,8,error?'#946319':'#69765c');
    return ctx.getImage();
}
if(typeof module!=='undefined')module.exports=drawMoneyWidget;
