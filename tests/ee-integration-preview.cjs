// Build an isolated preview overlay; never write to either source worktree.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),original=process.env.LEDGER_ORIGINAL_WORKTREE;
if(!original)throw Error('Set LEDGER_ORIGINAL_WORKTREE to the untouched existing worktree.');
const output=fs.mkdtempSync(path.join(os.tmpdir(),'4309-ee-preview-'));
for(const entry of fs.readdirSync(root,{withFileTypes:true})){
 if(entry.name.startsWith('.')||['ledger.html','ledger.js','polish.css','tests','ios','node_modules'].includes(entry.name))continue;
 fs.symlinkSync(path.join(root,entry.name),path.join(output,entry.name));
}
fs.symlinkSync(path.join(original,'polish.css'),path.join(output,'polish.css'));
fs.symlinkSync(path.join(original,'ledger-export.js'),path.join(output,'ledger-export.js'));
const ancestor=execFileSync('git',['merge-base','main','feature/ee-subcategories'],{cwd:root,encoding:'utf8'}).trim();
for(const name of ['ledger.html','ledger.js']){
 const base=execFileSync('git',['show',ancestor+':'+name],{cwd:root,encoding:'utf8'}),feature=fs.readFileSync(path.join(root,name),'utf8');
 let pending=fs.readFileSync(path.join(original,name),'utf8'),exportScript='';
 // Resolve only the cache-busting script-version overlap, preserving both sets of scripts.
 if(name==='ledger.html'){
  exportScript=pending.match(/<script src="ledger-export\.js[^\"]*"><\/script>/)?.[0]||'';
  pending=pending.replace(/^[ \t]*<script src="ledger-export\.js[^\"]*"><\/script>\r?\n/m,'').replace(/<script src="ledger\.js[^\"]*"><\/script>/,base.match(/<script src="ledger\.js[^\"]*"><\/script>/)[0]);
 }
 const files=[feature,base,pending].map((value,index)=>{const filename=path.join(output,'.merge-'+name+'-'+index);fs.writeFileSync(filename,value);return filename;});
 let merged;
 try{merged=execFileSync('git',['merge-file','-p',...files],{encoding:'utf8'});}catch(error){fs.writeFileSync(path.join(output,'.conflict-'+name),error.stdout||'');throw Error('Preview merge conflict in '+name+'; original source worktrees were not changed.');}
 if(exportScript)merged=merged.replace('<script src="ee-model.js',exportScript+'\n    <script src="ee-model.js');
 fs.writeFileSync(path.join(output,name),merged);files.forEach(filename=>fs.unlinkSync(filename));
}
console.log(output);
