// Draw fixed calendar cells so long titles never resize adjacent dates.
function drawMonthCalendar(snapshot,width=330,canvasHeight=320){
    const ctx=new DrawContext();ctx.size=new Size(width,canvasHeight);ctx.opaque=false;ctx.respectScreenScale=true;
    const {days,offset,weeks}=snapshot.calendar;
    const cell=width/7;
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
    function monthText(value,x,y,w,size,color,bold=false){
        ctx.setTextAlignedCenter();
        ctx.setTextColor(new Color(color));ctx.setFont(bold?Font.boldSystemFont(size):Font.systemFont(size));
        ctx.drawTextInRect(value,new Rect(x,y,w,Math.ceil(size*1.2)));
        ctx.setTextAlignedLeft();
    }
    function titleChars(value){
        if(typeof Intl.Segmenter==='function')return Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(String(value)),part=>part.segment);
        const chars=[];
        for(const char of Array.from(String(value))){
            const last=chars.length-1;
            if(last>=0&&(char==='\u200d'||chars[last].endsWith('\u200d')||/[\u0300-\u036f\ufe00-\ufe0f\u20e3\u{1f3fb}-\u{1f3ff}\u{e0020}-\u{e007f}]/u.test(char)
                ||(/^[\u{1f1e6}-\u{1f1ff}]$/u.test(chars[last])&&/^[\u{1f1e6}-\u{1f1ff}]$/u.test(char))))chars[last]+=char;
            else chars.push(char);
        }
        return chars;
    }
    function eventInk(color){
        const olive=[34,48,30];
        return '#'+[1,3,5].map((start,i)=>Math.round(parseInt(color.slice(start,start+2),16)*.38+olive[i]*.62).toString(16).padStart(2,'0')).join('');
    }
    function titleLines(value,w,size){
        const chars=titleChars(value),lines=[];
        let index=0;
        while(index<chars.length&&lines.length<2){
            let used=0,line='';
            while(index<chars.length){
                const char=chars[index],advance=(char.codePointAt(0)>255?1:.58)*size;
                if(used+advance>w)break;
                line+=char;used+=advance;index++;
            }
            lines.push(line);
            // Avoid sacrificing a fifth character to an ellipsis. Narrow phones use a second line.
            if(index>=Math.min(5,chars.length))break;
        }
        return lines;
    }
    const monthTop=18,monthHeight=(canvasHeight-monthTop)/weeks;
    ['M','T','W','T','F','S','S'].forEach((day,col)=>monthText(day,col*cell,0,cell,11,col===5?'#368ac5':col===6?'#c5596b':'#526344',true));
    for(let index=0;index<days.length;index++){
        const day=days[index],position=index+offset,col=position%7,row=Math.floor(position/7),x=col*cell,y=monthTop+row*monthHeight;
        const isToday=day.date===snapshot.day;
        if(isToday){ctx.setFillColor(new Color('#dfe8bb'));ctx.fillRect(new Rect(x,y,cell-.5,monthHeight-.5));}
        monthText(String(Number(day.date.slice(-2))),x,y,cell,11,col===5?'#368ac5':col===6?'#c5596b':'#30422a',true);
        let used=0,shown=0;
        for(const entry of day.entries){
            const size=entry.kind==='work'?7.5:9;
            const lines=titleLines(entry.title,cell-1,size),entryHeight=lines.length*11;
            if(15+used+entryHeight+2>monthHeight)break;
            const ey=y+15+used;
            ctx.setFillColor(new Color(entry.color,entry.completed?.10:.18));ctx.fillRect(new Rect(x+.25,ey+.25,cell-.5,entryHeight-.5));
            lines.forEach((line,lineIndex)=>{
                const ly=ey+lineIndex*11;
                monthText(line,x+.5,ly-.5,cell-1,size,entry.completed?'#4e5944':eventInk(entry.color),true);
                if(entry.completed){
                    const lineWidth=titleChars(line).reduce((sum,c)=>sum+(c.codePointAt(0)>255?1:.58)*size,0);
                    ctx.setFillColor(new Color('#4e5944',.45));ctx.fillRect(new Rect(x+(cell-lineWidth)/2,ly+5,lineWidth,.5));
                }
            });
            used+=entryHeight;shown++;
        }
        if(day.total>shown)monthText('+'+(day.total-shown),x+cell-13,y+1,13,8,'#69765c');
    }
    return ctx.getImage();
}
if(typeof module!=='undefined')module.exports=drawMonthCalendar;
