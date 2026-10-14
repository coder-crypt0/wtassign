export const identifier = s => /^[A-Za-z_$][\w$]*$/.test(s) && !['class','interface','enum','public','private','void','new','return','extends','implements','package'].includes(s);
export function generateJava(c, classes, relationships, pkg='com.example.library') {
 const outgoing = relationships.filter(r=>r.from===c.id);
 const parent = outgoing.find(r=>r.type==='Inheritance');
 const interfaces = outgoing.filter(r=>r.type==='Implementation').map(r=>classes.find(x=>x.id===r.to)?.name).filter(Boolean);
 const associations=outgoing.filter(r=>['Association','Aggregation','Composition'].includes(r.type));
 const imports = c.attributes.some(a=>/List|Map|Set/.test(a.type)) ? 'import java.util.*;\n\n' : '';
 const fields=c.attributes.map(a=>`    ${c.kind==='Interface'?'public static final':a.visibility} ${a.type} ${a.name}${c.kind==='Interface'?' = '+defaultValue(a.type):''};`);
 associations.forEach(r=>{const target=classes.find(x=>x.id===r.to); if(target && !c.attributes.some(a=>a.type===target.name)) fields.push(`    private ${target.name} ${target.name[0].toLowerCase()+target.name.slice(1)};`);});
 const methods=c.methods.map(m=>`    ${c.kind==='Interface'?'public':m.visibility} ${m.type} ${m.name}(${m.params || ''})${c.kind==='Interface'?';':` {\n        ${m.type==='void'?'// TODO: implement '+m.name:`return ${defaultValue(m.type)};`}\n    }`}`);
 return `package ${pkg};\n\n${imports}/**\n * ${c.name} — generated with Classcraft.\n */\npublic ${c.kind==='Abstract'?'abstract class':c.kind==='Interface'?'interface':'class'} ${c.name}${parent?' extends '+classes.find(x=>x.id===parent.to)?.name:''}${interfaces.length?' '+(c.kind==='Interface'?'extends':'implements')+' '+interfaces.join(', '):''} {\n${fields.join('\n')}${fields.length&&methods.length?'\n\n':''}${methods.join('\n\n')}\n}\n`;
}
function defaultValue(t){return t==='boolean'?'false':['int','long','short','byte','float','double'].includes(t)?'0':t==='char'?"'\\0'":'null';}
export const initial = {classes:[
{id:'member',name:'Member',kind:'Class',x:74,y:95,attributes:[{name:'memberId',type:'String',visibility:'private'},{name:'name',type:'String',visibility:'private'},{name:'email',type:'String',visibility:'private'}],methods:[{name:'borrowBook',type:'void',params:'Book book',visibility:'public'},{name:'returnBook',type:'void',params:'Book book',visibility:'public'}]},
{id:'book',name:'Book',kind:'Class',x:420,y:95,attributes:[{name:'isbn',type:'String',visibility:'private'},{name:'title',type:'String',visibility:'private'},{name:'available',type:'boolean',visibility:'private'}],methods:[{name:'checkout',type:'void',params:'',visibility:'public'},{name:'checkin',type:'void',params:'',visibility:'public'}]},
{id:'loan',name:'Loan',kind:'Class',x:74,y:413,attributes:[{name:'loanId',type:'String',visibility:'private'},{name:'dueDate',type:'String',visibility:'private'}],methods:[{name:'isOverdue',type:'boolean',params:'',visibility:'public'}]},
{id:'library',name:'Library',kind:'Class',x:420,y:413,attributes:[{name:'name',type:'String',visibility:'private'},{name:'books',type:'List<Book>',visibility:'private'}],methods:[{name:'addBook',type:'void',params:'Book book',visibility:'public'},{name:'findBook',type:'Book',params:'String isbn',visibility:'public'}]}
],relationships:[{id:'r1',from:'member',to:'book',type:'Association',label:'borrows'},{id:'r2',from:'member',to:'loan',type:'Association',label:'has'},{id:'r3',from:'library',to:'book',type:'Aggregation',label:'contains'},{id:'r4',from:'loan',to:'library',type:'Association',label:'registered at'}]};
