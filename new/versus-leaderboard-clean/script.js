const data = [
  ["1","change","@change","blue","∞","+$1,912,048.27",["🥷","🐺","₿"],"8"],
  ["2","frank","@frankdegods","photo","👩🏻","+$1,067,272.97",["🧑🏼","≡","🌙"],"3+"],
  ["3","logjam","@_logjam","photo","🪵","+$943,134.90",["🌙","🐚","✌️"],"12+"],
  ["4","PoorGoat","@PoorGoat_","dark","👹","+$800,062.61",["🐲","🌐","🟧"],"19+"],
  ["5","Vee","@theveeman","dark","🗡️","+$626,839.09",["🐲","🕊","🌖"],"2+"],
  ["6","DumbCrayonEater","@DumbCrayonEater","cyan","∞","+$617,239.05",["🐲","👻","🌙"],"18+"],
  ["7","techquant","@techquant","photo","🐸","+$469,052.27",["🐲","≡","🟤"],""],
  ["8","dark 🦄","@darkuwu","photo","🦄","+$454,282.35",["🦄","🛕"],"6"],
  ["9","Pixel 🦄","@Pixel_","photo","😈","+$449,650.63",["🦄","🌀"],""],
  ["10","remus 🐐🀄","@remusofmars","photo","🐶","+$446,965.88",["🌐","🌙","🔵"],"40+"],
  ["11","lesabre","@lesabre","photo","🚗","+$416,841.70",["☣","🟩","≡"],"3+"],
  ["12","mk4","@boosted","dark","♛","+$381,767.96",["🧿","☘"],"3"],
  ["13","fibs","@fibs","photo","🤖","+$369,275.99",["🌜","🌊","🌐"],"32+"],
  ["14","Pingu Charts","@pingucharts","photo","🐧","+$361,857.79",["👻","🌘","🏆"],"4+"],
  ["15","smol intern 💡","@smol_intern","photo","🐱","+$355,709.00",["🌊","🌀","🌙"],"24+"],
  ["16","Thokani 🕊","@Thokani","photo","🧸","+$353,632.09",["🌊","🌐","🦄"],""],
  ["17","needledger","@needledger","green","∞","+$323,678.17",["🐲","🧑🏽","≡"],""],
  ["18","surveillor","@surveillor","photo","🧙","+$303,212.49",["🐲","🌊","≡"],"2+"],
];

const rows = document.getElementById("rows");

function medal(n){
  if(n==="1") return `<div class="medal"><span>1</span></div>`;
  if(n==="2") return `<div class="medal silver"><span>2</span></div>`;
  if(n==="3") return `<div class="medal bronze"><span>3</span></div>`;
  return `<div class="place">${n}.</div>`;
}

function avatar(type, icon){
  const cls = type === "blue" ? "blue" : type === "cyan" ? "cyan" : type === "green" ? "green" : "";
  return `<div class="avatar ${cls}">${icon}</div>`;
}

data.forEach(([rank,name,handle,type,icon,pnl,badges,more])=>{
  const row = document.createElement("div");
  row.className = "row";
  row.innerHTML = `
    ${medal(rank)}
    ${avatar(type, icon)}
    <div class="user"><strong>${name}</strong><small>${handle}</small></div>
    <div class="right">
      <div class="pnl">${pnl}</div>
      <div class="badges">
        ${badges.map(b=>`<span class="badge">${b}</span>`).join("")}
        ${more ? `<span class="more">${more}</span>` : ""}
      </div>
    </div>
  `;
  rows.appendChild(row);
});
