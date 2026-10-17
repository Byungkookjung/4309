const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const moduleText=(name,file)=>`const ${name}=(()=>{const module={exports:{}};\n${fs.readFileSync(path.join(root,file),'utf8')}\nreturn module.exports;})();\n`;
let source='// Pocket Paws: install this ONE file in Scriptable.\n// Widget parameter: todo-month (Large) or work-week (Medium). Run inside the app to connect.\n';
for(const [name,file] of [['WorkWidgetData','widget-data.js'],['PlannerModel','mobile/planner-model.js'],['MobileModel','mobile/model.js'],['Core','scriptable/core.js'],['pairCrypto','scriptable/pairing.js'],['drawMonthCalendar','scriptable/calendar.js'],['frogStamp','scriptable/frog.js']])source+=moduleText(name,file);
source+=fs.readFileSync(path.join(__dirname,'runtime.js'),'utf8');
fs.writeFileSync(path.join(__dirname,'Pocket Paws.js'),source);
