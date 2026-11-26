"use strict";
const repeats=["Não repetir","Diariamente","Semanalmente"], priorities=["Baixa","Média","Alta"], modes=["Rotina e autocuidado","Produtividade e trabalho","Misto"];
const pad=n=>String(n).padStart(2,"0"), dayKey=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()), today=()=>dayKey(new Date()), dayNum=s=>Date.parse(s+"T00:00:00Z")/86400000;
const validDay=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(dayNum(s))&&new Date(dayNum(s)*86400000).toISOString().slice(0,10)===s;
const newHabit=(title,target,unit)=>({id:crypto.randomUUID(),title,target,unit,counts:{}});
function fresh(){return {version:1,name:"Biscoito",created:today(),tasks:[],habits:[newHabit("Beber água",8,"copos"),newHabit("Caminhar",20,"minutos"),newHabit("Ler",10,"páginas"),newHabit("Fazer pausas",3,"pausas")],homeMode:2}}
const map=o=>o!==null&&typeof o==="object"&&!Array.isArray(o);
const size=(s,min,max)=>typeof s==="string"&&s.trim().length>=min&&s.length<=max;
const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
const validPugPhoto=value=>typeof value==="string"&&value.length<=314028&&/^\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(value);
function validBackup(d){
 const dates=(obj,test)=>map(obj)&&Object.entries(obj).every(([key,v])=>validDay(key)&&test(v));
 const entries=(arr,max,test)=>Array.isArray(arr)&&arr.length<=max&&arr.every(t=>map(t)&&size(t.id,1,200)&&test(t))&&new Set(arr.map(t=>t.id)).size===arr.length;
 if(!map(d)||d.version!==1||!validDay(d.created)||!size(d.name,1,40))return false;
 if(d.pugPhoto!==undefined&&!validPugPhoto(d.pugPhoto))return false;
 if(!entries(d.tasks,10000,t=>size(t.title,1,160)&&size(t.notes??"",0,4000)&&validDay(t.date)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(t.time)&&repeats.includes(t.repeat)&&integer(t.priority,0,2)&&[-1,0,10,30,60].includes(t.reminder)&&dates(t.done,v=>typeof v==="boolean")))return false;
 if(!entries(d.habits,500,h=>size(h.title,1,80)&&integer(h.target,1,999)&&size(h.unit,0,30)&&dates(h.counts,v=>integer(v,0,999))))return false;
 if(!dates(d.devotional??{},v=>size(v,0,10000))||!dates(d.checkins??{},v=>map(v)&&(v.mood===undefined||integer(v.mood,0,4))&&(v.energy===undefined||integer(v.energy,0,2))))return false;
 if(!dates(d.workouts??{},p=>Array.isArray(p)&&p.length<=100&&new Set(p.map(x=>x.exercise)).size===p.length&&p.every(x=>CONTENT.catalog.some(e=>e.id===x.exercise)&&integer(x.sets,1,10)&&integer(x.reps,0,100)&&integer(x.seconds,0,3600)&&(x.reps+x.seconds)>0&&integer(x.rest,0,600)&&size(x.load,0,40)&&Array.isArray(x.done)&&x.done.length<=x.sets&&x.done.every(v=>typeof v==="boolean"))))return false;

 const settings=d.workoutSettings??{};
 if(!map(settings)||!permittedLink(settings.music??"",false)||!map(settings.links??{}))return false;
 if(!Object.entries(settings.links??{}).every(([id,links])=>CONTENT.catalog.some(x=>x.id===id)&&map(links)&&permittedLink(links.music??"",false)&&permittedLink(links.demo??"",true)))return false;
 if(d.weatherPlace!=null&&(!map(d.weatherPlace)||!size(d.weatherPlace.name,1,200)||!Number.isFinite(d.weatherPlace.latitude)||Math.abs(d.weatherPlace.latitude)>90||!Number.isFinite(d.weatherPlace.longitude)||Math.abs(d.weatherPlace.longitude)>180))return false;
 if(d.tasks.some(t=>t.readAloud!==undefined&&typeof t.readAloud!=="boolean"))return false;
 return integer(d.theme??0,0,2)&&integer(d.appearance??0,0,2)&&integer(d.homeMode??2,0,2)&&map(d.workoutSettings??{})&&map(d.workoutSettings?.links??{});
}
function occurs(t,day){const diff=dayNum(day)-dayNum(t.date);return diff===0||diff>0&&(t.repeat===repeats[1]||t.repeat===repeats[2]&&diff%7===0)}
function reading(day){let i=((dayNum(day)%372)+372)%372;const t=CONTENT.THEMES[i%31],f=CONTENT.FOCUSES[Math.floor(i/31)];return [t[0]+" · "+f[0],t[1]+"\n\n"+f[1],t[2]+" "+f[2],t[3]]}
const bridge=window.webkit?.messageHandlers?.planner;
function native(action,values={}){if(bridge){bridge.postMessage({action,...values});return true}return false}
const key="pt.pugplanner.v1";let data=JSON.parse(localStorage.getItem(key)||"null")||fresh();
function save(sync=false){const json=JSON.stringify(data);localStorage.setItem(key,json);native("persist",{json});if(sync)reschedule()}
function reschedule(){native("sync",{tasks:data.tasks,focus:data.focusRunning?data.focusEnd:0,training:data.trainingEnd||0,speech:data.speechEnabled!==false,locale:data.voiceLocale||"pt-PT"})}
function parseText(raw){
 const lines=raw.trim().split(/\n+/).map(s=>s.trim()).filter(Boolean);
 const plain=s=>s.toLowerCase().normalize("NFD").replace(/\p{M}/gu,"");
 let phrase=plain(lines.join(" ")),day="",time="",repeat=repeats[0];
 const now=new Date(),target=new Date(now);
 const units=["zero","um","dois","tres","quatro","cinco","seis","sete","oito","nove","dez","onze","doze","treze","catorze","quinze","dezasseis","dezassete","dezoito","dezanove"];
 const aliases={uma:1,duas:2,quatorze:14,dezesseis:16,dezessete:17,dezenove:19,vinte:20,trinta:30,quarenta:40,cinquenta:50};
 const number=s=>aliases[s]??(units.includes(s)?units.indexOf(s):Number(s));
 phrase=phrase.replace(/\b(vinte|trinta|quarenta|cinquenta) e (um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove)\b/g,(_,t,u)=>String(number(t)+number(u))).replace(new RegExp("\\b("+[...units,...Object.keys(aliases)].join("|")+")\\b","g"),m=>String(number(m)));
 let m=phrase.match(/\b(?:daqui a|em)\s+(\d+|meia)\s+(minutos?|horas?)\b/);
 if(m){let minutes=m[1]==="meia"?30:+m[1]*(m[2].startsWith("hora")?60:1);if(minutes>0&&minutes<=10080){const when=new Date(Math.ceil((Date.now()+minutes*60000)/60000)*60000);day=dayKey(when);time=pad(when.getHours())+":"+pad(when.getMinutes())}}
 else{
 let date=phrase.match(/\b([0-3]?\d)[/. -]([01]?\d)[/. -](\d{4})\b/),iso=phrase.match(/\b\d{4}-\d{2}-\d{2}\b/);
 if(date){let candidate=date[3]+"-"+pad(date[2])+"-"+pad(date[1]);if(validDay(candidate))day=candidate}
 else if(iso&&validDay(iso[0]))day=iso[0];
 else if(/\b(hoje|amanha)\b/.test(phrase)){target.setDate(target.getDate()+(/depois de amanha/.test(phrase)?2:/amanha/.test(phrase)?1:0));day=dayKey(target)}
 else{const weekdays=["domingo","segunda","terca","quarta","quinta","sexta","sabado"],w=weekdays.findIndex(v=>new RegExp("\\b"+v+"\\b").test(phrase));if(w>=0){target.setDate(target.getDate()+((w-target.getDay()+7)%7||7));day=dayKey(target)}}
 m=phrase.match(/(?:\bas?\s+|\bpelas\s+)([01]?\d|2[0-3])(?:\s*(?:horas?\s+e|h|:|e)\s*([0-5]?\d|meia|um quarto))?\b/)||phrase.match(/\b([01]?\d|2[0-3])[:h]([0-5]\d)\b/);
 if(m){let h=+m[1];if(/da tarde|da noite/.test(phrase)&&h<12)h+=12;time=pad(h)+":"+pad(m[2]==="meia"?30:m[2]==="um quarto"?15:m[2]||0)}
 }
 if(/todos os dias|diariamente|todas as manhas/.test(phrase))repeat=repeats[1];else if(/semanalmente|todas as semanas/.test(phrase))repeat=repeats[2];
 const title=(lines.find(s=>/[a-zÀ-ÿ]{3}/i.test(s)&&!/^(data|hora)\s*:/i.test(s))||"").replace(/^(?:lembra-me de|lembrar de)\s+/i,"").replace(/\s+(?:depois de amanhã|amanhã|hoje|às|pelas|daqui a|todos os dias|diariamente|semanalmente)(?=\s|$).*$/i,"").slice(0,160);
 return {title,date:day,time,repeat,source:raw};
}
