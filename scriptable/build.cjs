const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const moduleText=(name,file)=>`const ${name}=(()=>{const module={exports:{}};\n${name==='MobileBudget'?"const require=id=>{if(id==='../ee-model.js')return ExpectedBudget;if(id==='./model.js')return MobileModel;throw Error('Unknown bundled dependency');};\n":''}${fs.readFileSync(path.join(root,file),'utf8')}\nreturn module.exports;})();\n`;
let source='// Pocket Paws: install this ONE file in Scriptable.\n// Medium: budget-month, work-week. Large: todo-month. Run in app to connect.\n';
for(const [name,file] of [['WorkProfile','work-profile.js'],['WorkWidgetData','widget-data.js'],['PlannerModel','mobile/planner-model.js'],['MobileModel','mobile/model.js'],['ExpectedBudget','ee-model.js'],['MobileBudget','mobile/budget-summary.js'],['Core','scriptable/core.js'],['pairCrypto','scriptable/pairing.js'],['drawMonthCalendar','scriptable/calendar.js'],['frogStamp','scriptable/frog.js'],['drawMoneyWidget','scriptable/money.js']])source+=moduleText(name,file);
source+=fs.readFileSync(path.join(__dirname,'runtime.js'),'utf8');
fs.writeFileSync(path.join(__dirname,'Pocket Paws.js'),source);
