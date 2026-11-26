let section="strength",query="",filters={};
const names={strength:"Musculação",stretch:"Alongar",plan:"Treino do dia",pilates:"Pilates",outdoor:"Sem ginásio"};
function training(){page.append(dayPicker(trainingDay,v=>{trainingDay=v;render()}),row(...Object.entries(names).map(([k,v])=>btn(v,()=>{section=k;filters={};query="";render()},k===section?"selected":""))));
 if(data.trainingEnd){const timer=el("strong","",displayTime(remaining(data.trainingEnd)));timer.id="trainingTime";page.append(card(heading(data.trainingLabel),timer,btn("Cancelar temporizador",()=>{data.trainingEnd=0;save(true);render()})))}
 if(section==="plan")return workoutPlan();
 const all=CONTENT.catalog.filter(x=>x.kind===section),search=input("search",query),list=el("div");
 function matches(x,k,v){return !v||[x[k]].flat().includes(v)}
 function show(){let found=all.filter(x=>x.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())&&Object.entries(filters).every(([k,v])=>matches(x,k,v)));list.replaceChildren(txt(found.length+" exercícios"),...found.map(x=>card(heading(x.name),txt(x.group+" · "+x.tags.join(" · ")),btn("Abrir ficha",()=>exercise(x)))))}
 search.oninput=()=>{query=search.value;show()};const tools=card(field("Pesquisar exercício",search));
 let details=el("details","",el("summary","","Filtros"));for(let [key,title] of [["group","Grupo"],["areas","Região"],["tags","Equipamento ou adaptação"],...(section==="stretch"?[["moment","Momento"]]:[])]){let options=["Todos",...new Set(all.flatMap(x=>x[key]||[]))],s=select(options,Math.max(0,options.indexOf(filters[key])));s.onchange=()=>{filters[key]=s.selectedIndex?options[s.selectedIndex]:"";show()};details.append(field(title,s))}tools.append(details);page.append(tools,list);show()}
function plan(){return (data.workouts??={})[trainingDay]??=[]}
function permittedLink(value,demo){if(!value)return true;try{let u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password&&!u.port&&(/(^|\.)youtube\.com$/.test(u.hostname)||u.hostname==="youtu.be"||!demo&&["spotify.com","open.spotify.com","music.apple.com"].includes(u.hostname))}catch{return false}}
function exercise(x){
 const personal=data.workoutSettings?.links?.[x.id]||{};
 const music=input("url",personal.music||"");
 const links=el("details","",el("summary","","Atalhos pessoais"),form([field("Playlist pessoal",music)],()=>{
   if(!permittedLink(music.value,false))return alert("Usa uma ligação HTTPS do YouTube, Spotify ou Apple Music.");
   const settings=data.workoutSettings??={};
   (settings.links??={})[x.id]={...personal,music:music.value};
   save();exercise(x);
 }));
 const detail=[["Preparação",x.start],["Postura",x.cue],["Respiração",x.breath],["Cadência",x.cadence],["Limites",x.limit]];
 sheet(x.name,txt(x.areas.join(" · ")),shortDemo(CONTENT.videos[x.id],x.name),
   ...detail.map(([k,v])=>el("div","",el("strong","",k),txt(v))),
   personal.music?link("Ouvir playlist pessoal",personal.music):null,links,
   btn("Adicionar ao treino de "+trainingDay,()=>{
     const p=plan();
     if(p.some(i=>i.exercise===x.id))return alert("Este exercício já faz parte do treino.");
     p.push({exercise:x.id,sets:x.sets,reps:x.reps,seconds:x.hold,rest:x.rest,load:x.tags.includes("Peso do corpo")?"Peso do corpo":"Por definir",done:[]});
     save();closeSheet();section="plan";render();
   },"primary"));
}
function editSet(x,e){let sets=num(e.sets,1,10),reps=num(e.reps,0,100),sec=num(e.seconds,0,3600),rest=num(e.rest,0,600),load=input("text",e.load,40);sheet(x.name,form([field("Séries",sets),field("Repetições",reps),field("Execução em segundos",sec),field("Descanso em segundos",rest),field("Carga",load)],()=>{if(!(+reps.value + +sec.value))return alert("Indica repetições ou tempo de execução.");Object.assign(e,{sets:+sets.value,reps:+reps.value,seconds:+sec.value,rest:+rest.value,load:load.value,done:e.done.slice(0,+sets.value)});save();closeSheet();render()}))}
function startTraining(label,seconds){if(!seconds)return;data.trainingLabel=label;data.trainingEnd=Date.now()+seconds*1000;save(true);render()}
function workoutPlan(){let p=plan(),source=input("date"),music=input("url",data.workoutSettings?.music||"");
 page.append(card(heading("Música para treinar"),row(link("YouTube","https://www.youtube.com/"),link("Spotify","https://open.spotify.com/"),link("Apple Music","https://music.apple.com/")),data.workoutSettings?.music?link("Playlist pessoal",data.workoutSettings.music):null,btn("Personalizar playlist",()=>sheet("Playlist pessoal",form([field("Ligação",music)],()=>{if(!permittedLink(music.value,false))return alert("Ligação musical inválida.");(data.workoutSettings??={}).music=music.value;save();closeSheet();render()})))),
 btn("Copiar treino de outra data",()=>sheet("Copiar treino",form([field("Data de origem",source)],()=>{let other=data.workouts[source.value];if(!other?.length||source.value===trainingDay)return alert("Escolhe outra data com treino.");if(p.length&&!confirm("Substituir o treino desta data?"))return;data.workouts[trainingDay]=other.map(e=>({...e,done:[]}));save();closeSheet();render()},"Copiar"))));
 if(!p.length)page.append(txt("Escolhe um exercício no catálogo e adiciona-o a este dia."));
 p.forEach((e,i)=>{let x=CONTENT.catalog.find(x=>x.id===e.exercise);function move(step){let j=i+step;if(j<0||j>=p.length)return;[p[i],p[j]]=[p[j],p[i]];save();render()}
 page.append(card(heading(x.name),txt(e.sets+" séries · "+e.reps+" repetições · "+e.seconds+" s · "+e.load),row(...Array.from({length:e.sets},(_,j)=>btn("Série "+(j+1),()=>{e.done=Array.from({length:e.sets},(_,k)=>k===j?!e.done[k]:!!e.done[k]);save();render()},e.done[j]?"selected":""))),row(btn("Ficha",()=>exercise(x)),btn("Ajustar",()=>editSet(x,e)),i>0?btn("Subir",()=>move(-1)):null,i<p.length-1?btn("Descer",()=>move(1)):null),row(e.seconds?btn("Executar · "+e.seconds+" s",()=>startTraining(x.name,e.seconds)):null,e.rest?btn("Descansar · "+e.rest+" s",()=>startTraining("Descanso",e.rest)):null,btn("Remover",()=>{p.splice(i,1);save();render()}))))})}
