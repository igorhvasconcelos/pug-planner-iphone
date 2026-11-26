const $=s=>document.querySelector(s);
function el(tag,cls,...kids){const n=document.createElement(tag);if(cls)n.className=cls;n.append(...kids.filter(k=>k!=null));return n}
const txt=s=>el("p","",s), heading=s=>el("h2","",s),card=(...kids)=>el("section","card",...kids),row=(...kids)=>el("div","row",...kids);
function btn(s,fn,cls=""){let b=el("button",cls,s);b.type="button";b.onclick=fn;return b}
function field(label,input){return el("label","",label,input)}
function input(type,value="",max){let i=el("input");i.type=type;i.value=value;if(max)i.maxLength=max;return i}
function num(v,min,max){let n=input("number",v);Object.assign(n,{min,max,required:true});return n}
function area(v,max){let i=el("textarea");i.value=v;i.maxLength=max;return i}
function select(options,current){let s=el("select");options.forEach((v,i)=>s.add(new Option(v,String(i))));s.selectedIndex=current;return s}
const dialog=$("dialog"),page=$("#page");function closeSheet(){dialog.close()}
function sheet(title,...items){$("#sheet").replaceChildren(el("div","row spread",heading(title),btn("Fechar",closeSheet)),...items.filter(x=>x!=null));if(!dialog.open)dialog.showModal();dialog.scrollTop=0}
function form(items,action,label="Guardar"){let f=el("form","",...items),b=el("button","primary",label);b.type="submit";f.append(b);f.onsubmit=e=>{e.preventDefault();action()};return f}
let noticeTimer;function notice(s){$("#toast").textContent=s;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$("#toast").textContent="",6500)}
const tabs=["Hoje","Agenda","Bem-estar","Fitness","Receitas","Meu pet","Hábitos","Foco","Pug"];let tab="Hoje",day=today(),devDay=today(),trainingDay=today(),lastDay=today();
function go(to){tab=to;render();window.scrollTo(0,0)}
function dayPicker(value,change){let i=input("date",value);i.onchange=()=>{if(validDay(i.value))change(i.value)};return row(field("Data",i),btn("Hoje",()=>change(today())))}
function pug(){
 const custom=validPugPhoto(data.pugPhoto);
 const i=el("img",custom?"pug wave pug-photo":"pug wave");
 i.src=custom?"data:image/jpeg;base64,"+data.pugPhoto:"pug.png";
 i.alt=custom?"Fotografia de "+data.name:data.name+" com bandana verde";
 if(!custom)i.style.filter=["none","grayscale(1)","sepia(.5)"][data.appearance||0];
 function play(){i.classList.remove("wave");void i.offsetWidth;i.classList.add("wave")}
 i.onclick=play;i.tabIndex=0;i.setAttribute("role","button");
 i.onkeydown=e=>{if(["Enter"," "].includes(e.key)){e.preventDefault();play()}};
 return i;
}
function progress(n,total){let p=el("progress");p.max=Math.max(total,1);p.value=n;p.setAttribute("aria-label",n+" de "+total);return p}
function render(){
 document.documentElement.classList.toggle("dark",!!data.dark);document.documentElement.dataset.theme=data.theme||0;
 $("nav").replaceChildren(...tabs.map((t,i)=>{let b=btn("",()=>go(t));b.dataset.tone=["sand","blue","clay","sage","clay","sand","sage","lilac","sand"][i];b.append(el("span","tile",tabIcon(i)),t);if(t===tab||t==="Bem-estar"&&["Meditação","Devocional"].includes(tab)||t==="Fitness"&&["Treinos","Calorias dos alimentos"].includes(tab))b.setAttribute("aria-current","page");return b}));
 page.replaceChildren(...(tab==="Hoje"?[]:[el("h1","",tab==="Pug"?"O meu Pug":tab==="Fitness"?"Fitness and Health":tab)]));
 const pages={"Hoje":home,"Agenda":agenda,"Hábitos":habits,"Foco":focus,"Bem-estar":wellbeing,"Pug":settings,"Meditação":meditation,"Devocional":devotional,"Treinos":training,"Fitness":fitness,"Receitas":recipes,"Meu pet":pets,"Calorias dos alimentos":food};pages[tab]();
}
function tasksFor(d){return data.tasks.filter(t=>occurs(t,d)).sort((a,b)=>a.time.localeCompare(b.time))}
function taskRows(d){let list=tasksFor(d);if(tab==="Hoje")list.sort((a,b)=>Number(!!a.done[d])-Number(!!b.done[d])||b.priority-a.priority);return list.length?list.map(t=>{let done=!!t.done[d];let b=btn(done?"✓":"○",()=>{t.done[d]=!done;save(true);render()});b.setAttribute("aria-label",(done?"Reabrir ":"Concluir ")+t.title);return row(b,btn(t.time+" · "+t.title,()=>taskForm(t),done?"item complete":"item"),el("small","",priorities[t.priority]))}):[txt("Ainda não tens tarefas para este dia.")]}
function home() {
 const now=new Date(),date=today(),tasks=tasksFor(date),n=tasks.filter(t=>t.done[date]).length;
 const hero=panel("sand",el("div","row spread",el("div","copy",
   el("h1","greeting",now.getHours()<12?"Bom dia!":now.getHours()<19?"Boa tarde!":"Boa noite!"),
   txt(now.toLocaleDateString("pt-PT",{weekday:"long",day:"numeric",month:"long"})),txt("Toca no Pug para uma saudação.")),el("div","pug-stage",pug())),
   el("strong","small",n+" de "+tasks.length+" tarefas concluídas"),progress(n,tasks.length));
 hero.classList.add("welcome");
 const weather=weatherCard();weather.dataset.tone="blue";
 const priorities=taskCard(date);priorities.dataset.tone="sage";
 const next=tasks.find(t=>!t.done[date]&&t.time>=pad(now.getHours())+":"+pad(now.getMinutes()));
 const overdue=data.tasks.filter(t=>t.date<date&&t.repeat===repeats[0]&&!t.done[t.date]);
 page.append(hero,weather,priorities,panel("sand",heading("A seguir"),next?btn(next.time+" · "+next.title,()=>taskForm(next)):txt("Sem mais tarefas agendadas para as próximas horas.")));
 if(overdue.length)page.append(panel("clay",heading("Por retomar"),...overdue.map(t=>row(btn("○",()=>{t.done[t.date]=true;save(true);render()}),btn(t.title,()=>taskForm(t),"item")))));
 page.append(panel("lilac",heading("Um momento para ti"),btn("Começar um foco",()=>go("Foco")),btn("Treinos · Musculação, alongamentos e Pilates",()=>workout("strength")),btn("Devocional · Reflexão do dia",()=>{devDay=date;go("Devocional")})));
}
function taskCard(d){return card(heading(tab==="Hoje"?"As tuas prioridades":"Tarefas"),...taskRows(d),row(btn("＋ Nova tarefa",()=>taskForm({date:d}),"primary"),btn("Criar lembrete por voz",()=>capture("voice")),btn("Criar a partir de imagem",()=>capture("photo"))))}

let calendarMonth=day.slice(0,7),habitDay=today();
function calendar(){
 const start=new Date(calendarMonth+"-01T12:00:00"), year=start.getFullYear(),month=start.getMonth();
 function shift(n){calendarMonth=dayKey(new Date(year,month+n,1,12)).slice(0,7);render()}
 const grid=el("div","calendar");
 for(const label of ["S","T","Q","Q","S","S","D"])grid.append(el("small","",label));
 for(let n=0;n<(start.getDay()+6)%7;n++)grid.append(el("span"));
 const last=new Date(year,month+1,0).getDate();
 for(let n=1;n<=last;n++){const stamp=calendarMonth+"-"+pad(n),has=data.tasks.some(t=>occurs(t,stamp));
 const b=btn(String(n),()=>{day=stamp;render()},stamp===day?"selected":"");if(has)b.classList.add("marked");b.setAttribute("aria-label",stamp+(has?", com tarefas":""));grid.append(b)}
 return card(el("div","row spread",btn("‹",()=>shift(-1)),heading(start.toLocaleDateString("pt-PT",{month:"long",year:"numeric"})),btn("›",()=>shift(1))),grid,btn("Ir para hoje",()=>{day=today();calendarMonth=day.slice(0,7);render()}));
}
function agenda(){page.append(calendar(),heading(new Date(day+"T12:00:00").toLocaleDateString("pt-PT",{weekday:"long",day:"numeric",month:"long"})),taskCard(day))}
function capture(kind){if(kind==="voice"){const i=area("",4000);sheet("Ditar lembrete",txt("Toca no microfone do teclado e diz a tarefa, a data e a hora."),field("O que queres lembrar?",i),btn("Rever lembrete",()=>{if(i.value.trim())taskForm(parseText(i.value))},"primary"));i.focus()}else{sheet("Imagem para lembrete",txt("O texto é reconhecido no iPhone. Revê os campos antes de guardar."),...["Fototeca","Câmara"].map((v,i)=>btn(v,()=>{if(native("photo",{camera:!!i}))closeSheet();else notice("A leitura da imagem está disponível na app para iPhone.")})))}}
window.recognized=text=>taskForm(parseText(text));

function taskForm(t={}){
 let title=input("text",t.title||"",160),notes=area(t.notes||"",4000),date=input("date",t.date??today()),time=input("time",t.time??"09:00"),p=select(priorities,t.priority??1),r=select(repeats,Math.max(0,repeats.indexOf(t.repeat))),offsets=[-1,0,10,30,60],rem=select(["Sem lembrete","Na hora","10 minutos antes","30 minutos antes","1 hora antes"],offsets.indexOf(t.reminder??0)),read=select(["Sim","Não"],t.readAloud===false?1:0);
 title.required=date.required=time.required=true;
 sheet(t.id?"Editar tarefa":t.source?"Rever lembrete":"Nova tarefa",t.source?card(txt(t.source),txt("Confirma o assunto, a data e a hora.")):null,form([field("O que vais fazer?",title),field("Notas",notes),field("Data",date),field("Hora",time),field("Prioridade",p),field("Repetir",r),field("Lembrete",rem),field("Ler em voz alta",read)],()=>{
 if(!title.value.trim())return title.focus();let reminder=offsets[rem.selectedIndex];if(!t.id&&r.selectedIndex===0&&reminder>=0&&new Date(date.value+"T"+time.value).getTime()-reminder*60000<=Date.now())return alert("Escolhe uma hora futura ou Sem lembrete.");
 let task={id:t.id||crypto.randomUUID(),title:title.value.trim(),notes:notes.value,date:date.value,time:time.value,priority:p.selectedIndex,repeat:repeats[r.selectedIndex],reminder,readAloud:!read.selectedIndex,done:t.done||{}};if(t.id)data.tasks[data.tasks.indexOf(t)]=task;else data.tasks.push(task);save(true);closeSheet();render()}),t.id?btn("Eliminar tarefa",()=>{if(confirm("Eliminar a tarefa e todas as suas repetições?")){data.tasks=data.tasks.filter(x=>x.id!==t.id);save(true);closeSheet();render()}}):null)
}
function habitCard(h){let d=tab==="Hábitos"?habitDay:today(),n=h.counts[d]||0;function change(delta){if(d>today()||delta>0&&n>=h.target)return;h.counts[d]=Math.max(0,Math.min(999,n+delta));save();render()}return card(el("div","row spread",heading(h.title),btn("Editar",()=>habitForm(h))),txt(n+" / "+h.target+" "+h.unit),progress(n,h.target),row(btn("−",()=>change(-1)),btn("＋",()=>change(1),"primary")))}
function habits(){page.append(dayPicker(habitDay,v=>{habitDay=v;render()}),btn("Novo hábito",()=>habitForm(),"primary"),...data.habits.map(habitCard))}
function habitForm(h){let name=input("text",h?.title||"",80),target=num(h?.target||1,1,999),unit=input("text",h?.unit||"vezes",30);name.required=true;sheet(h?"Editar hábito":"Novo hábito",form([field("Nome",name),field("Objetivo diário",target),field("Unidade",unit)],()=>{if(!name.value.trim())return name.focus();let obj=h||newHabit("",1,"");Object.assign(obj,{title:name.value.trim(),target:+target.value,unit:unit.value});if(!h)data.habits.push(obj);save();closeSheet();render()}),h?btn("Eliminar hábito",()=>{if(confirm("Eliminar este hábito e o seu histórico?")){data.habits=data.habits.filter(x=>x!==h);save();closeSheet();render()}}):null)}
function wellbeing(){let d=today(),check=(data.checkins??={})[d]??={},mode=select(modes,data.homeMode??2);mode.onchange=()=>{data.homeMode=mode.selectedIndex;save();render()};
 function choices(key,opts){return row(...opts.map((s,i)=>btn(s,()=>{check[key]=i;check.updated=Date.now();save();render()},check[key]===i?"selected":"")))}
 page.append(card(field("Como queres organizar o dia?",mode),heading("Como te sentes?"),choices("mood",["Muito em baixo","Em baixo","Razoável","Bem","Muito bem"]),heading("Energia"),choices("energy",["Baixa","Média","Alta"])),el("section","card peach",heading("Reflexão do dia"),txt(([["O teu ritmo também merece cuidado.", "Uma pausa pode ser o próximo passo.", "Hoje, reserva um pequeno momento para ti.", "Descansar também faz parte do caminho.", "Não precisas de fazer tudo para ter um bom dia.", "Escolhe um gesto de cuidado que caiba no teu dia.", "Começa por aquilo de que precisas agora."], ["Escolhe uma prioridade e dá-lhe espaço.", "Uma coisa de cada vez também é progresso.", "Um pequeno começo vale mais do que um plano perfeito.", "Deixa margem entre duas tarefas.", "Uma pausa pode ajudar a recuperar a atenção.", "Terminar uma etapa já conta.", "Define o próximo passo, não o caminho inteiro."], ["O dia tem espaço para fazer e para cuidar.", "O importante também inclui o teu bem-estar.", "Planeia com intenção e deixa espaço para a vida.", "Um passo pequeno continua a ser um passo.", "Podes ajustar o plano à energia de hoje.", "Fazer menos, com atenção, também conta.", "Entre uma tarefa e outra, lembra-te de ti."]])[data.homeMode??2][(dayNum(d)%7+7)%7]),txt(["Hoje, começa por um gesto de cuidado.","Escolhe uma tarefa essencial e um bloco de foco.","Equilibra uma prioridade com um momento para ti."][data.homeMode??2])),card(heading("Tempo para ti"),...["Treinos","Meditação","Devocional"].map(s=>btn(s,()=>go(s)))),heading("Hábitos essenciais"),...data.habits.filter(h=>/água|hidrata|pausa|descans|^ler$|leitura/i.test(h.title)).map(habitCard))}
function devotional(){let r=reading(devDay),note=area(data.devotional?.[devDay]||"",10000);note.oninput=()=>{(data.devotional??={})[devDay]=note.value;save()};page.append(dayPicker(devDay,v=>{devDay=v;render()}),card(heading(r[0]),...r[1].split("\n\n").map(txt)),el("section","card peach",heading("Oração ou intenção"),txt(r[2])),card(heading("Reflexão pessoal"),txt(r[3]),field("A tua nota",note),txt("Guardada automaticamente neste dispositivo.")))}
function link(label,url){let a=el("a","action",label);try{if(new URL(url).protocol!=="https:")throw Error();a.href=url;a.target="_blank";a.rel="noopener noreferrer";a.onclick=e=>{if(native("open",{url}))e.preventDefault()}}catch{a.removeAttribute("href")}return a}
function meditation(){
 const practices=[
   ["Como começar a meditar","Senta-te de forma confortável. Deixa os ombros soltos e repara na respiração. Sempre que te distraíres, volta com calma à sensação de respirar.","lilac"],
   ["Percorrer o corpo com atenção","Começa pelos pés e vai levando a atenção às pernas, ao tronco e à cabeça. Observa o que sentes em cada zona.","sand"],
   ["Atenção à respiração","Repara no ar a entrar e a sair. Deixa a respiração seguir ao seu ritmo. Quando a atenção se afastar, volta a reparar no ar.","blue"]
 ];
 for(const [title,guide,tone] of practices)page.append(panel(tone,heading(title),txt(guide)));
}
function remaining(end){return Math.max(0,Math.ceil((end-Date.now())/1000))}
function displayTime(sec){return pad(Math.floor(sec/60))+":"+pad(sec%60)}
function focus(){let minutes=num(data.focusMinutes||25,1,180);minutes.disabled=!!data.focusRunning;minutes.onchange=()=>{if(minutes.checkValidity()){data.focusMinutes=+minutes.value;resetFocus()}};
 let time=el("div","timer",displayTime(data.focusRunning?remaining(data.focusEnd):data.focusRemaining??1500));time.id="focusTime";
 let choices=["Foco livre",...data.tasks.map(t=>t.title)],choice=select(choices,1+data.tasks.findIndex(t=>t.id===data.focusTask));choice.onchange=()=>{data.focusTask=data.tasks[choice.selectedIndex-1]?.id||"";save()};page.append(card(field("Tarefa atual",choice)));
 page.append(card(heading(data.isBreak?"Pausa":"Sessão de foco"),time,row(btn(data.focusFinished?"Preparar "+(data.isBreak?"foco":"pausa"):data.focusRunning?"Pausar":"Começar",()=>{if(data.focusFinished){data.isBreak=!data.isBreak;data.focusRemaining=(data.isBreak?5:data.focusMinutes||25)*60;data.focusFinished=false}else if(data.focusRunning){data.focusRemaining=remaining(data.focusEnd);data.focusRunning=false}else{data.focusEnd=Date.now()+(data.focusRemaining??1500)*1000;data.focusRunning=true}save(true);render()},"primary"),btn("Repor",resetFocus)),field("Duração do foco em minutos",minutes)))}
function resetFocus(){Object.assign(data,{focusRunning:false,focusFinished:false,isBreak:false,focusRemaining:(data.focusMinutes||25)*60});save(true);render()}
function tick(){if(lastDay!==today()){lastDay=today();if(!dialog.open)render()}$("#clock").textContent=new Date().toLocaleTimeString("pt-PT",{hour:"2-digit",minute:"2-digit"});if(data.focusRunning){let s=remaining(data.focusEnd);if($("#focusTime"))$("#focusTime").textContent=displayTime(s);if(!s){data.focusRunning=false;data.focusFinished=true;data.focusRemaining=0;save();if(tab==="Foco")render()}}if(data.trainingEnd){let s=remaining(data.trainingEnd);if($("#trainingTime"))$("#trainingTime").textContent=displayTime(s);if(!s){data.trainingEnd=0;save();if(tab==="Treinos")render();notice("Temporizador de treino terminado.")}}}
save();
