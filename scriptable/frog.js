// Small vector stamp based on the wide-smiling green frog mascot.
function frogStamp(tint='#a8c66a'){
    const c=new DrawContext();c.size=new Size(40,36);c.opaque=false;c.respectScreenScale=true;
    c.setFillColor(new Color(tint));
    c.fillEllipse(new Rect(2,9,36,26));c.fillEllipse(new Rect(3,1,12,17));c.fillEllipse(new Rect(25,1,12,17));
    c.setFillColor(new Color('#293721'));
    c.fillEllipse(new Rect(7,6,4,5));c.fillEllipse(new Rect(29,6,4,5));
    c.fillEllipse(new Rect(16,16,2.5,2.5));c.fillEllipse(new Rect(22,16,2.5,2.5));
    for(let i=0;i<=24;i++){const x=7+i,y=20+7*Math.sin(i/24*Math.PI);c.fillEllipse(new Rect(x,y,2,2));}
    return c.getImage();
}
if(typeof module!=='undefined')module.exports=frogStamp;
