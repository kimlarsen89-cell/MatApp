const firebaseConfig = {
   apiKey: "AIzaSyARFDCnZHgIPTtoUuKnhKVi6uyDDZpWXWk",
   authDomain: "matapp-4fbdd.firebaseapp.com",
   databaseURL: "https://matapp-4fbdd-default-rtdb.europe-west1.firebasedatabase.app/",
   projectId: "matapp-4fbdd",
   storageBucket: "matapp-4fbdd.appspot.com",
   messagingSenderId: "31086609157",
   appId: "1:31086609157:web:99b757ba8e81f5275fed6c"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
let sisteLagerListe = [];
let lastAction = null;

const kategorigrupper = {
   // Vi flytter tørrvarer opp slik at "ris" sjekkes før "is"
   tørrvarer: ["ris", "mel", "sukker", "pasta", "spagetti", "makaroni", "nudler", "havre", "gryn", "müsli", "cornflak", "nøtter", "frø", "olje", "eddik", "krydder", "salt", "pepper", "kaffe", "te", "kakao", "bakepulver", "boks", "hermetikk", "tomat", "bønner", "linser", "knekkebrød", "kjeks", "chips", "godteri", "sjokolade", "saft", "brus", "vann", "tortilla", "taco", "saus"],

   kjøleskap: ["melk", "ost", "cheese", "smør", "yoghurt", "rømme", "fløte", "kesam", "pålapp", "skinke", "salami", "leverpostei", "egg", "bacon", "pølse", "kjøtt", "deig", "kylling", "laks", "fisk", "torsk", "reker", "juice", "dressing", "ketchup", "sennep", "gjær", "pesto", "oliven", "feta", "biff"],

   // Vi endrer "is" til " iskrem" eller " is " for å unngå feil på "ris"
   fryser: ["frossen", "fryst", " iskrem", " pizza", "nuggets", "scampi", "fryse", "pommes", "frites", "erter", "mais", "bær", "skogsbær", "bringebær", "vårruller", "pai", "fiskepinner"],

   renhold: ["zalo", "vask", "oppvask", "vaskemiddel", "tøymykner", "papir", "tørk", "toalett", "dopapir", "søppel", "pose", "avfall", "klut", "svamp", "stålull", "skyllemiddel", "klor", "salmiakk", "sun"],

   pleie: ["shampoo", "sjampo", "balsam", "såpe", "dusjsåpe", "tann", "bind", "tampong", "bleie", "parfyme", "deodorant", "deo", "krem", "fuktighet", "ansikt", "hår", "voks", "sminke", "plaster", "paracet"]
};


const mineOppskrifter = [
   { navn: "Laks med brokkoli", krav: [{n: "laks", m: "300", e: "g"}, {n: "brokkoli", m: "1", e: "stk"}, {n: "ris", m: "2", e: "dl"}] },
   { navn: "Kyllingsalat", krav: [{n: "kylling", m: "200", e: "g"}, {n: "salat", m: "1", e: "pk"}, {n: "avokado", m: "1", e: "stk"}] },
   { navn: "Fullkorns-taco", krav: [{n: "karbonadedeig", m: "400", e: "g"}, {n: "fullkornslefser", m: "1", e: "pk"}] },
   { navn: "Omelett med spinat", krav: [{n: "egg", m: "3", e: "stk"}, {n: "spinat", m: "1", e: "pose"}] },
   { navn: "Torsk i ovn", krav: [{n: "torsk", m: "400", e: "g"}, {n: "gulrøtter", m: "3", e: "stk"}] },
   { navn: "Bali Kyllinggryte", krav: [{n: "kylling", m: "400", e: "g"}, {n: "baligryte", m: "1", e: "pk"}, {n: "fløte", m: "3", e: "dl"}] },
   { navn: "Havregrøt med bær", krav: [{n: "havregryn", m: "2", e: "dl"}, {n: "melk", m: "4", e: "dl"}, {n: "blåbær", m: "1", e: "neve"}] }
];

db.ref('/').on('value', snapshot => {
   visData(snapshot.val() || {});
});

function toggleList(id) {
   const el = document.getElementById(id);
   el.style.display = (el.style.display === "none" || el.style.display === "") ? "block" : "none";
}

function addItem() {
   const inputEl = document.getElementById("itemInput");
   const navn = inputEl.value.trim();
   const mengde = document.getElementById("amountInput").value;
   const enhet = document.getElementById("unitInput").value;
   const kategori = document.getElementById("categoryInput").value;
   if (!navn) return;
   db.ref('handleliste').push({ navn, mengde, enhet, kategori });
   inputEl.value = "";
   document.getElementById("categoryInput").value = "kjøleskap";
}

document.getElementById("itemInput").addEventListener("input", function(e) {
   const tekst = e.target.value.toLowerCase().trim();
   if (tekst.length < 2) return;
   const selector = document.getElementById("categoryInput");
   for (const [kategori, nøkkelord] of Object.entries(kategorigrupper)) {
       if (nøkkelord.some(ord => tekst.includes(ord))) {
           selector.value = kategori;
           break;
       }
   }
});

function moveToInventory(id, navn, mengde, enhet, kategori) {
   lastAction = { type: 'move', id, navn, mengde, enhet, kategori };
   document.getElementById("undoBtn").style.display = "block";
   db.ref('handleliste/' + id).remove();
   db.ref('beholdning').push({ navn, mengde, enhet, kategori });
   setTimeout(() => { document.getElementById("undoBtn").style.display = "none"; }, 10000);
}

function undoLastAction() {
   if (!lastAction) return;
   db.ref('beholdning').orderByChild('navn').equalTo(lastAction.navn).once('value', snapshot => {
       const updates = {};
       snapshot.forEach(child => { updates[child.key] = null; });
       db.ref('beholdning').update(updates);
       db.ref('handleliste').push({ navn: lastAction.navn, mengde: lastAction.mengde, enhet: lastAction.enhet, kategori: lastAction.kategori });
       lastAction = null;
       document.getElementById("undoBtn").style.display = "none";
   });
}

function visData(data) {
   const shopCatDiv = document.getElementById("shop-categories");
   shopCatDiv.innerHTML = "";
   const kategorier = {
       "kjøleskap": { navn: "❄️ Kjøleskap", items: [] },
       "fryser": { navn: "🧊 Fryser", items: [] },
       "tørrvarer": { navn: "🥫 Tørrvarer", items: [] },
       "renhold": { navn: "🧼 Hus & Renhold", items: [] },
       "pleie": { navn: "🧴 Personlig pleie", items: [] }
   };
   if (data.handleliste) {
       Object.keys(data.handleliste).forEach(id => {
           const v = data.handleliste[id];
           const kat = v.kategori || "tørrvarer";
           if (kategorier[kat]) kategorier[kat].items.push({id, ...v});
       });
   }
   Object.keys(kategorier).forEach(key => {
       const kat = kategorier[key];
       if (kat.items.length > 0) {
           let katHtml = `<div class="shop-cat-header" onclick="toggleList('shop-list-${key}')">${kat.navn} <span>↕️</span></div><ul id="shop-list-${key}">`;
           kat.items.forEach(v => {
               katHtml += `<li><div style="display:flex; align-items:center; gap:8px;"><input type="text" value="${v.mengde}${v.enhet}" onchange="oppdaterMengde('${v.id}', this.value)" style="width:70px; background:#333; border:1px solid #444; color:white; padding:4px; border-radius:5px; font-size:14px;"><span>${v.navn}</span></div><div style="display:flex; gap:5px;"><button class="check-btn" onclick="moveToInventory('${v.id}','${v.navn}','${v.mengde}','${v.enhet}','${v.kategori}')">✔</button><button class="del-btn" onclick="db.ref('handleliste/${v.id}').remove()">❌</button></div></li>`;
           });
           katHtml += `</ul>`;
           shopCatDiv.innerHTML += katHtml;
       }
   });

   ["kjøleskap", "fryser", "tørrvarer", "renhold", "pleie"].forEach(k => {
       const el = document.getElementById("inv-"+k);
       if(el) el.innerHTML = "";
   });
   sisteLagerListe = [];
   if (data.beholdning) {
       Object.keys(data.beholdning).forEach(id => {
           const v = data.beholdning[id];
           sisteLagerListe.push(v.navn.toLowerCase());
           const targetUl = document.getElementById("inv-"+v.kategori);
           if(targetUl) {
               targetUl.innerHTML += `<li><span>${v.mengde}${v.enhet} ${v.navn}</span><button class="del-btn" style="background:#444" onclick="db.ref('beholdning/${id}').remove()">Tomt</button></li>`;
           }
       });
   }

   const dash = document.getElementById("dashboardList");
   dash.innerHTML = "";
   mineOppskrifter.forEach(r => {
       const mangler = r.krav.filter(i => !sisteLagerListe.includes(i.n));
       const klar = mangler.length === 0;
       dash.innerHTML += `<div onclick="openRecipe('${r.navn}')" style="cursor:pointer; padding:15px; background:${klar ? '#1a3320' : '#252525'}; border-radius:12px; margin-bottom:10px; border:1px solid ${klar ? '#32d74b' : '#444'}; display:flex; justify-content:space-between; align-items:center;"><div><strong style="color:white;">${r.navn}</strong><br><small style="color:${klar ? '#32d74b' : '#aaa'}">${klar ? '✅ Alt på lager' : '🛒 Mangler ' + mangler.length + ' ting'}</small></div><span style="color:#666;">➔</span></div>`;
   });
}

function leggTilFraOppskrift(n, m, e) { db.ref('handleliste').push({ navn: n, mengde: m, enhet: e, kategori: "kjøleskap" }); }
function openRecipe(navn) {
   const r = mineOppskrifter.find(x => x.navn === navn);
   const modal = document.getElementById("recipeModal");
   document.getElementById("modalTitle").innerText = r.navn;
   let html = "<div style='margin-top:20px;'>";
   r.krav.forEach(i => {
       const har = sisteLagerListe.includes(i.n);
       html += `<div class="recipe-item"><span style="color:${har ? '#32d74b' : '#ff453a'}">${har ? '✅' : '❌'} ${i.m}${i.e} ${i.n}</span>${!har ? `<button class="recipe-btn" onclick="leggTilFraOppskrift('${i.n}','${i.m}','${i.e}')">+ Handle</button>` : '<span style="color:#aaa; font-size:12px;">I skapet</span>'}</div>`;
   });
   document.getElementById("modalContent").innerHTML = html + "</div>";
   modal.style.display = "block";
}
function closeRecipe() { document.getElementById("recipeModal").style.display = "none"; }
function oppdaterMengde(id, nyVerdi) {
   const mengde = nyVerdi.match(/\d+/g);
   const enhet = nyVerdi.match(/[a-zA-ZæøåÆØÅ]+/g);
   if (mengde) { db.ref('handleliste/' + id).update({ mengde: mengde[0], enhet: enhet ? enhet[0] : "" }); }
}