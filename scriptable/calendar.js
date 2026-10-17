// Draw fixed calendar cells so long titles never resize adjacent dates.
function drawMonthCalendar(snapshot,width=330,canvasHeight=320){
    const ctx=new DrawContext();ctx.size=new Size(width,canvasHeight);ctx.opaque=false;ctx.respectScreenScale=true;
    const {days,offset,weeks}=snapshot.calendar;
    const cell=width/7,top=20,height=(canvasHeight-top)/weeks;
    function ink(value,x,y,width,size,color,bold=false){
        ctx.setTextColor(new Color(color));ctx.setFont(bold?Font.boldSystemFont(size):Font.systemFont(size));
        ctx.drawTextInRect(value,new Rect(x,y,width,size+4));
    }
    function shorten(value,width,size){
        let used=0,out='';const chars=Array.from(String(value));
        if(chars.reduce((sum,c)=>sum+(c.codePointAt(0)>255?1:.58)*size,0)<=width)return String(value);
        const max=width-size;
        for(const c of chars){const step=(c.codePointAt(0)>255?1:.58)*size;if(used+step>max)return out+'…';used+=step;out+=c;}
        return out;
    }
    const reference=snapshot.calendar.period==='week';
    if(reference){
        const weekly=snapshot.calendar.period==='week';
        const heading=30,weekdaysY=heading+2,gridTop=heading+21;
        const rowHeight=(canvasHeight-gridTop)/(weekly?1:weeks);
        function pill(x,y,w,h,color){
            const r=Math.min(4,h/2);ctx.setFillColor(new Color(color));
            ctx.fillRect(new Rect(x+r,y,w-2*r,h));ctx.fillRect(new Rect(x,y+r,w,h-2*r));
            for(const [cx,cy] of [[x,y],[x+w-2*r,y],[x,y+h-2*r],[x+w-2*r,y+h-2*r]])ctx.fillEllipse(new Rect(cx,cy,2*r,2*r));
        }
        function centered(value,x,y,w,size,color,bold=true){
            ctx.setTextAlignedCenter();ink(value,x,y,w,size,color,bold);ctx.setTextAlignedLeft();
        }
        const monthLabel=Number(snapshot.day.slice(5,7))+'월 '+Number(snapshot.day.slice(-2))+'일';
        centered(monthLabel,0,0,width,19,'#304b32');
        // A small pond-green mark keeps the calendar tied to the frog theme.
        pill(3,5,14,12,'#b5ce82');ctx.setFillColor(new Color('#b5ce82'));
        ctx.fillEllipse(new Rect(3,2,6,6));ctx.fillEllipse(new Rect(11,2,6,6));
        ctx.setFillColor(new Color('#172019'));ctx.fillEllipse(new Rect(5,4,2,2));ctx.fillEllipse(new Rect(13,4,2,2));
        const weekday=day=>new Date(day.date+'T12:00:00Z').getUTCDay();
        const dayColor=day=>weekday(day)===6?'#368ac5':weekday(day)===0?'#c5596b':'#526a49';
        days.forEach((day,col)=>centered(['일','월','화','수','목','금','토'][weekday(day)],col*cell,weekdaysY,cell,10,dayColor(day)));
        days.forEach((day,index)=>{
            const position=weekly?index:index+offset,col=position%7,row=weekly?0:Math.floor(position/7),x=col*cell,y=gridTop+row*rowHeight;
            const active=day.date===snapshot.day;
            if(active)pill(x+1,y-2,cell-2,rowHeight+1,'#dae8bc');
            if(active)pill(x+2,y,cell-4,15,'#5d7d3e');
            centered(String(Number(day.date.slice(-2))),x,y,cell,12,active?'#ffffff':dayColor(day));
            const entryHeight=snapshot.calendar.kind==='work'?27:12,entryGap=2,start=y+18;
            const slots=Math.max(1,Math.floor((rowHeight-18+entryGap)/(entryHeight+entryGap)));
            const shown=day.entries.slice(0,day.total>slots?Math.max(0,slots-1):slots);
            shown.forEach((entry,n)=>{
                const ey=start+n*(entryHeight+entryGap),color=entry.completed?'#55575b':entry.color;
                pill(x+1,ey,cell-2,entryHeight,color);
                const hex=color.replace('#',''),rgb=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));
                const foreground=entry.completed?'#c8c8cc':(.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]>155?'#18221b':'#ffffff');
                if(entry.kind==='work'){
                    const times=entry.title.split('–');
                    // Repeat the suffix so each time is readable on its own line.
                    if(times.length===2&&!/[ap]$/.test(times[0]))times[0]+=times[1].slice(-1);
                    times.slice(0,2).forEach((time,i)=>centered(shorten(time,cell-5,10),x+2,ey+i*12,cell-4,10,foreground));
                }else ink(shorten(entry.title,cell-6,9),x+3,ey,cell-6,9,foreground,true);
            });
            if(day.total>shown.length)ink('+'+(day.total-shown.length),x+3,start+shown.length*(entryHeight+entryGap),cell-5,9,'#69765c');
        });
        return ctx.getImage();
    }
    ['M','T','W','T','F','S','S'].forEach((day,col)=>ink(day,col*cell+4,0,cell-6,11,col===5?'#368ac5':col===6?'#c5596b':'#69765c',true));
    for(let index=0;index<days.length;index++){
        const day=days[index],position=index+offset,col=position%7,row=Math.floor(position/7),x=col*cell,y=top+row*height;
        const isToday=day.date===snapshot.day;
        if(isToday){ctx.setFillColor(new Color('#e7edcb'));ctx.fillRect(new Rect(x,y,cell-2,height-2));}
        ink(String(Number(day.date.slice(-2))),x+3,y,cell-6,11,col===5?'#368ac5':col===6?'#c5596b':'#30422a',true);
        const slots=Math.max(1,Math.floor((height-17)/11));
        const shown=day.entries.slice(0,day.total>slots?slots-1:slots);
        shown.forEach((entry,n)=>{
            const ey=y+15+n*11;
            ctx.setFillColor(new Color(entry.color,entry.completed?.06:.15));ctx.fillRect(new Rect(x+1,ey,cell-3,10));
            ctx.setFillColor(new Color(entry.color));ctx.fillRect(new Rect(x+1,ey,2,10));
            const size=entry.kind==='work'?7.5:9;
            ink(entry.kind==='work'?entry.title:shorten(entry.title,cell-8,size),x+4,ey-1,cell-6,size,entry.completed?'#7b8790':entry.color);
            if(entry.completed){ctx.setFillColor(new Color('#7b8790',.5));ctx.fillRect(new Rect(x+5,ey+5,cell-11,.5));}
        });
        if(day.total>shown.length)ink('+'+(day.total-shown.length),x+4,y+15+shown.length*11,cell-8,9,'#69765c');
    }
    return ctx.getImage();
}
if(typeof module!=='undefined')module.exports=drawMonthCalendar;
