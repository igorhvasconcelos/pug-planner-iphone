function panel(tone,...items) {
 const result=card(...items);
 result.dataset.tone=tone;
 return result;
}
function tabIcon(index) {
 const icon=el("canvas","nav-icon");
 icon.width=48;icon.height=48;icon.setAttribute("aria-hidden","true");
 const g=icon.getContext("2d");g.scale(2,2);
 const shapes=[
   "M3 10 L12 2 L21 10 M5 9 V21 H10 V15 H14 V21 H19 V9",
   "M3 8 Q3 5 6 5 H18 Q21 5 21 8 V19 Q21 22 18 22 H6 Q3 22 3 19 Z M3 10 H21 M8 2 V7 M16 2 V7",
   "M12 21 C8 17 2 13 2 8 C2 2 9 1 12 6 C15 1 22 2 22 8 C22 13 16 17 12 21 Z",
   "M7 12 H17 M4 7 Q4 6 5 6 H6 Q7 6 7 7 V17 Q7 18 6 18 H5 Q4 18 4 17 Z M17 7 Q17 6 18 6 H19 Q20 6 20 7 V17 Q20 18 19 18 H18 Q17 18 17 17 Z M2 9 V15 M22 9 V15",
   "M4 6 Q4 3 7 3 H17 Q20 3 20 6 V18 Q20 21 17 21 H7 Q4 21 4 18 Z M8 3 V21 M11 9 H17 M11 13 H16",
   null,"M5 20 V13 M12 20 V5 M19 20 V9","M22 12 A10 10 0 1 1 2 12 A10 10 0 1 1 22 12 M17 12 A5 5 0 1 1 7 12 A5 5 0 1 1 17 12",null
 ];
 if(shapes[index]){
   g.lineWidth=1.7;g.lineCap="round";g.lineJoin="round";
   g.stroke(new Path2D(shapes[index]));
 }else{
   for(const [x,y,w,h] of [[7,12,10,10],[2,7,5,6],[7,2,4,7],[13,2,4,7],[18,7,5,6]]){
     g.beginPath();g.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);g.fill();
   }
 }
 return icon;
}
function videoCard(label,url,source) {
 const anchor=link(label,url);
 const host=new URL(url).hostname;
 const videoId=host==="youtu.be"?new URL(url).pathname.slice(1):host.endsWith("youtube.com")?new URL(url).searchParams.get("v"):null;
 if(videoId&&/^[\w-]{11}$/.test(videoId)){
   const image=el("img","video-cover");
   image.src="https://i.ytimg.com/vi/"+videoId+"/hqdefault.jpg";
   image.alt="";
   image.loading="lazy";
   image.onerror=()=>image.remove();
   anchor.prepend(image);
 }
 return el("div","stack",anchor,txt(source));
}
function workout(sectionName,date=today(),group="") {
 section=sectionName;
 trainingDay=date;
 query="";
 filters=group?{group}:{};
 go("Treinos");
}
function fitness(){
 const saved=Object.keys(data.workouts||{}).filter(d=>data.workouts[d]?.length).sort().reverse();
 page.append(txt("Treinos e alimentação"),
   panel("sage",heading("Os teus treinos"),btn("Treino de hoje",()=>workout("plan"),"primary"),
     btn("Treinos guardados",()=>sheet("Treinos guardados",...(saved.length?saved.map(d=>btn(d,()=>{closeSheet();workout("plan",d)})):[txt("Ainda não tens treinos guardados.")])))),
   panel("blue",heading("Catálogo de treinos"),btn("Musculação",()=>workout("strength")),btn("Alongamentos",()=>workout("stretch")),btn("Pilates",()=>workout("pilates"))),
   panel("clay",heading("Calorias dos alimentos"),txt("Pesquisa um alimento ou começa com uma fotografia."),btn("Abrir calculadora de calorias",()=>go("Calorias dos alimentos"),"primary")),
   panel("sand",heading("Treino sem ginásio"),...["Corrida","Tai Chi","Calistenia","Caminhada","Ciclismo"].map(g=>btn(g,()=>workout("outdoor",today(),g))),btn("Ver todas as modalidades",()=>workout("outdoor"))));
}
function normalized(s){return String(s).normalize("NFD").replace(/\p{M}/gu,"").toLowerCase()}
const recipeCategories=["Sem categoria","Tradicional","Saudável"];
function recipes(){
 const search=input("search"),category=select(recipeCategories,0),saved=el("div","stack"),sites=el("div","stack");
 function update(){
   const q=search.value.trim(),cat=category.selectedIndex,terms=[q||"receitas",cat?recipeCategories[cat].toLowerCase():""].filter(Boolean).join(" ");
   sites.replaceChildren(link("YouTube","https://www.youtube.com/results?search_query="+encodeURIComponent((q?"receita ":"")+terms+" português")),
     link("Teleculinária","https://teleculinaria.pt/?s="+encodeURIComponent(terms)),link("Cozinha Continente","https://cozinha.continente.pt/pesquisa?search="+encodeURIComponent(terms)));
   const list=Object.values(data.recipes||{}).filter(r=>map(r)&&(!cat||r.category===cat)&&normalized(r.title+" "+r.ingredients).includes(normalized(q))).sort((a,b)=>b.updated-a.updated);
   saved.replaceChildren(...(list.length?list.map(r=>btn(r.title,()=>recipeEditor(r))):[txt("Nenhuma receita encontrada.")]));
 }
 search.oninput=category.onchange=update;
 page.append(txt("Guarda as tuas receitas e procura novas ideias."),panel("clay",heading("O que queres cozinhar?"),field("Pesquisar receita",search),field("Categoria",category),sites),
   panel("sand",heading("Receitas guardadas"),btn("Nova receita",()=>recipeEditor(),"primary"),btn("Receita a partir de imagem",()=>pickImage("recipe")),saved));
 update();
}
function recipeEditor(r={},source=""){
 const title=input("text",r.title||"",160), ingredients=area(r.ingredients||"",12000), preparation=area(r.preparation||"",12000), category=select(recipeCategories,r.category||0);
 title.required=true;
 sheet(r.id?"Editar receita":"Nova receita",source?txt("Revê o texto reconhecido e separa os ingredientes da preparação."):null,
   form([field("Nome da receita",title),field("Categoria",category),field("Ingredientes",ingredients),field("Preparação",preparation)],()=>{
     if(!title.value.trim())return;
     const id=r.id||crypto.randomUUID();
     (data.recipes??={})[id]={id,title:title.value.trim(),ingredients:ingredients.value,preparation:preparation.value,category:category.selectedIndex,updated:Date.now()};
     save();closeSheet();go("Receitas");
   }),r.id?btn("Eliminar receita",()=>{if(confirm("Eliminar esta receita?")){delete data.recipes[r.id];save();closeSheet();render()}}):null);
}
function pickImage(mode){
 sheet("Escolher imagem",...["Fototeca","Câmara"].map((label,i)=>btn(label,()=>{
   if(!native("photo",{mode,camera:!!i})){notice("Abre a aplicação no iPhone para escolher a imagem.");return}
   closeSheet();
 })));
}
let meal=[];
function food(initial="",suggestedEnergy=null){
 const q=input("search",initial),g=num(100,1,10000),energy=num(suggestedEnergy??0,0,1000),unit=select(["g","ml"],0),results=el("div","stack"),entries=el("div","stack"),estimate=el("strong"),total=el("strong");
 energy.step="any";g.step="any";
 const kcal=()=>Math.round(Number(energy.value)*Number(g.value)/100);
 function drawMeal(){
   total.textContent=meal.reduce((sum,item)=>sum+item.kcal,0)+" kcal no total";
   entries.replaceChildren(...meal.map((item,i)=>row(txt(item.title+" · "+item.portion+" · "+item.kcal+" kcal"),btn("Remover",()=>{meal.splice(i,1);drawMeal()}))));
 }
 function list(){
   const matches=CONTENT.foods.filter(f=>normalized(f.name).includes(normalized(q.value.trim())));
   results.replaceChildren(...(matches.length?matches.map(f=>btn(f.name+" · "+f.kcal+" kcal / 100 g",()=>{
     q.value=f.name;energy.value=f.kcal;unit.selectedIndex=0;list();
   })):[txt("Nenhum alimento coincide. Experimenta outro nome.")]));
   estimate.textContent=kcal()+" kcal na porção";
 }
 q.oninput=g.oninput=energy.oninput=list;
 page.append(panel("blue",heading("Fotografia do alimento ou rótulo"),btn("Começar com uma fotografia",()=>pickImage("food"))),
   panel("sand",heading("Alimento e porção"),form([field("Nome do alimento",q),field("Energia (kcal por 100 g ou 100 ml)",energy),field("Quantidade da porção",g),field("Unidade",unit),estimate],()=>{
     if(!q.value.trim()){q.focus();return}
     meal.push({title:q.value.trim(),portion:g.value+" "+unit.options[unit.selectedIndex].text,kcal:kcal()});drawMeal();
   },"Adicionar à refeição"),el("details","",el("summary","","Pesquisar no catálogo"),results)),panel("clay",heading("Refeição"),total,entries),txt("Fonte: INSA / PortFIR · v7.1"));
 list();drawMeal();
}
let petKind="pet",petDay=today(),vaccineDraft=null;
const petFields=[["name","Nome do pet"],["species","Espécie e raça"],["chip","Número do microchip"],["clinic","Veterinário ou clínica"],["phone","Contacto da clínica"],["notes","Alergias, medicação e notas importantes"]];
function pets(){
 const key=petKind,dog=key==="pet",pet=(data[key]??={}),profile=(pet.profile??={}),routine=(pet.routine??={}),vaccines=(pet.vaccines??=[]);
 const labels=dog?["Dar a refeição","Renovar a água","Passear ou brincar","Fazer os cuidados de higiene"]:["Dar a refeição","Renovar a água","Brincar ou explorar","Limpar a caixa de areia"];
 page.append(row(...[["pet","Meu pug"],["cat","Meu cat"]].map(([k,label])=>btn(label,()=>{petKind=k;render()},k===key?"selected":""))),
   panel("sand",dog?pug():null,heading(profile.name||(dog?"Meu pug":"Meu cat")),profile.species?txt(profile.species):null,btn("Editar perfil",()=>{
     const fields=petFields.map(([k,label])=>[k,label,k==="notes"?area(profile[k]||"",5000):input("text",profile[k]||"",160)]);
     sheet("Editar perfil",form(fields.map(([,label,i])=>field(label,i)),()=>{for(const [k,,i] of fields)profile[k]=i.value;save();closeSheet();render()}));
   })),
   panel("sage",heading("Rotina de cuidados"),dayPicker(petDay,v=>{petDay=v;render()}),...labels.map((label,i)=>{
     const flag=1<<i,done=!!(routine[petDay]&flag),b=btn((done?"✓ ":"○ ")+label,()=>{routine[petDay]=(routine[petDay]||0)^flag;save();render()},done?"selected":"");
     b.setAttribute("aria-pressed",done);return b;
   })),
   panel("blue",heading("Vacinas"),btn("Registar vacina",()=>vaccineEditor(pet,{}),"primary"),...vaccines.map(v=>btn(v.title+(v.date?" · "+v.date:""),()=>vaccineEditor(pet,v)))),
   panel("lilac",heading("Melhores comportamentos do pet"),...CONTENT.petLessons.slice(dog?0:3,dog?3:5).map(([title,description,label,id])=>
     el("section","stack",heading(title),txt(description),videoCard(label,"https://www.youtube.com/watch?v="+id,"YouTube")))),
   panel("sand",heading("Dicas de cuidado"),...CONTENT.petTips.slice(dog?0:16,dog?16:27).map(([title,description])=>el("details","",el("summary","",title),txt(description)))));
}
function vaccineEditor(pet,v,original=v){
 vaccineDraft={pet,v,original};
 const fields=[["title","Vacina","text"],["date","Data da vacina","date"],["next","Próxima dose","date"],["lot","Lote","text"],["clinic","Clínica","text"],["notes","Notas","text"]].map(([k,label,type])=>[k,label,input(type,v[k]||"",k==="notes"?5000:160)]);
 fields[0][2].required=true;
 const photo=typeof v.photo==="string"&&/^[A-Za-z0-9+/=\r\n]+$/.test(v.photo)?el("img","record-photo"):null;
 if(photo){photo.src="data:image/jpeg;base64,"+v.photo;photo.alt="Fotografia do boletim de vacinação"}
 sheet("Registo de vacina",photo,btn("Fotografar ou escolher boletim",()=>{
   for(const [k,,i] of fields)vaccineDraft.v={...vaccineDraft.v,[k]:i.value};
   pickImage("vaccine");
 }),form(fields.map(([,label,i])=>field(label,i)),()=>{
   const title=fields[0][2].value.trim();if(!title)return;
   const record={...v,id:original.id||crypto.randomUUID(),...Object.fromEntries(fields.map(([k,,i])=>[k,i.value.trim()]))};
   const index=pet.vaccines.indexOf(original);
   if(index<0)pet.vaccines.push(record);else pet.vaccines[index]=record;
   save();closeSheet();render();
 }),original.id?btn("Eliminar registo",()=>{if(confirm("Eliminar este registo de vacina?")){pet.vaccines=pet.vaccines.filter(x=>x!==original);save();closeSheet();render()}}):null);
}
function recipeFromText(result){
 const [title="",...lines]=result.trim().split(/\r?\n/);
 const ingredients=[],preparation=[];
 let target=ingredients;
 for(const line of lines){
   const plain=normalized(line).trim();
   const section=plain.match(/^(ingredientes|modo de preparacao|modo de preparo|preparacao|preparo|instrucoes|passo a passo)\b/);
   if(section){
     target=section[1]==="ingredientes"?ingredients:preparation;
     const rest=line.trim().slice(section[0].length).replace(/^[:\s–-]+/,"");
     if(rest)target.push(rest);
   }else if(line.trim())target.push(line.trim());
 }
 return {title:title.replace(/^receita\s*:\s*/i,"").slice(0,160),ingredients:ingredients.join("\n"),preparation:preparation.join("\n")};
}
window.mediaResult=(kind,result)=>{
 if(kind==="recipe"){
   recipeEditor(recipeFromText(result),result);
 }else if(kind==="vaccine"&&vaccineDraft){
   const {pet,v,original}=vaccineDraft;vaccineEditor(pet,{...v,photo:result},original);
 }else if(kind==="food"){
   let {labels:rawLabels,text}=JSON.parse(result);
   const label=text.match(/(?:100\s*(?:g|ml)[\s\S]{0,160}?)(\d{1,4}(?:[.,]\d+)?)\s*kcal/i);
   const foods={avocado:"Abacate",rice:"Arroz",apple:"Maçã",banana:"Banana",orange:"Laranja",bread:"Pão",pizza:"Pizza",hamburger:"Hambúrguer",pasta:"Massa",egg:"Ovo",chicken:"Frango",salmon:"Salmão",tuna:"Atum",potato:"Batata",carrot:"Cenoura",tomato:"Tomate",strawberry:"Morango",cheese:"Queijo",chocolate:"Chocolate",cookie:"Bolacha",soup:"Sopa",broccoli:"Brócolos",grape:"Uva",sushi:"Sushi"};
   const labels=rawLabels.toLowerCase().split(/[^a-z]+/);
   const suggestions=[...new Set(labels.map(label=>foods[label]).filter(name=>name&&CONTENT.foods.some(f=>normalized(f.name).includes(normalized(name)))))].slice(0,6);
   go("Calorias dos alimentos");
   sheet("Sugestões da fotografia",txt(suggestions.length||label?"Confirma o alimento e, se fotografaste um rótulo, verifica o valor por 100 g ou 100 ml.":"Não foi possível sugerir um alimento do catálogo."),
     label?btn("Usar "+label[1]+" kcal do rótulo",()=>{closeSheet();page.replaceChildren(el("h1","","Calorias dos alimentos"));food("",Number(label[1].replace(",",".")))}):null,
     ...suggestions.map(s=>btn(s,()=>{closeSheet();page.replaceChildren(el("h1","","Calorias dos alimentos"));food(s)})),
     btn("Pesquisar manualmente",closeSheet));
 }
};
