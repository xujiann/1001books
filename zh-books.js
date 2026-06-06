window.ZH_BOOK_PATCHES = [
  ["神话与起源","神话",0,"希腊古典神话","古斯塔夫·施瓦布 / 译林出版社","https://book.douban.com/subject/4872918/","https://img1.doubanio.com/view/subject/l/public/s4505790.jpg"],
  ["神话与起源","史诗",0,"吉尔伽美什史诗","拱玉书 译注 / 商务印书馆","https://book.douban.com/subject/35218215/","https://img3.doubanio.com/view/subject/l/public/s33803872.jpg"]
].map(([category,sub,slot,title,author,workUrl,cover])=>({category,sub,slot,title,author,workUrl,cover}));

window.ZH_AUTOFILL_QUERIES = {
  "神话与起源|神话": ["希腊古典神话","希腊神话","山海经","古希腊罗马神话","北欧神话","中国神话","神话学"],
  "神话与起源|史诗": ["吉尔伽美什史诗","伊利亚特","奥德修纪","罗摩衍那","摩诃婆罗多","卡莱瓦拉","尼伯龙根之歌"],
  "文学与诗歌|小说": ["红楼梦","百年孤独","战争与和平","卡拉马佐夫兄弟","追忆似水年华","堂吉诃德","尤利西斯"],
  "文学与诗歌|名著": ["红楼梦","三国演义","水浒传","西游记","悲惨世界","简爱","傲慢与偏见"],
  "未来与想象|科幻": ["三体","基地","沙丘","银河帝国","海伯利安","神经漫游者","科幻"],
  "*": ["红楼梦","百年孤独","人类简史","乡土中国","万历十五年","艺术的故事","时间简史","如何阅读一本书","小王子","三体","苏菲的世界","全球通史","美的历程","社会学的想象力","经济学原理","设计心理学","最好的告别","语言本能","未来简史","金枝"]
};

(function(){
  const CACHE_KEY="zh-douban-autofill-v1";
  const proxy=url=>"https://api.allorigins.win/raw?url="+encodeURIComponent(url);
  const norm=pic=>String(pic||"").replace(/\\\//g,"/").replace("/s/","/l/");

  function applyPatch(book){
    const sections=[...document.querySelectorAll(".category-section")];
    const section=sections.find(n=>n.querySelector("h2")?.textContent.trim()===book.category);
    if(!section)return false;
    const shelf=[...section.querySelectorAll(".shelf")].find(n=>n.querySelector("h3")?.textContent.trim()===book.sub);
    if(!shelf)return false;
    const card=shelf.querySelectorAll(".book")[book.slot];
    if(!card)return false;
    const link=card.querySelector(".cover"),title=card.querySelector(".book-title"),author=card.querySelector(".book-author");
    let image=card.querySelector(".cover-image");
    if(link){link.href=book.workUrl;if(book.cover)link.classList.remove("is-placeholder")}
    if(title)title.textContent=book.title;
    if(author)author.textContent=book.author;
    if(book.cover){
      if(!image&&link){image=document.createElement("img");image.className="cover-image";image.loading="lazy";link.prepend(image)}
      if(image){image.src=book.cover;image.alt=book.title+" 封面"}
    }
    return true;
  }

  function applyAll(){
    if(new URLSearchParams(location.search).get("lang")!=="zh")return;
    if(!document.querySelector(".category-section"))return setTimeout(applyAll,300);
    const cached=JSON.parse(localStorage.getItem(CACHE_KEY)||"[]");
    [...window.ZH_BOOK_PATCHES,...cached].forEach(applyPatch);
    if(!cached.length) autofill();
  }

  async function suggest(q){
    try{
      const url=proxy("https://book.douban.com/j/subject_suggest?q="+encodeURIComponent(q));
      const r=await fetch(url);
      if(!r.ok)return [];
      return (await r.json()).filter(x=>x.type==="b"&&x.id);
    }catch{return []}
  }

  async function autofill(){
    const used=new Set(window.ZH_BOOK_PATCHES.map(b=>b.workUrl));
    const patches=[...window.ZH_BOOK_PATCHES];
    const shelves=[];
    document.querySelectorAll(".category-section").forEach(section=>{
      const category=section.querySelector("h2")?.textContent.trim();
      section.querySelectorAll(".shelf").forEach(shelf=>{
        const sub=shelf.querySelector("h3")?.textContent.trim();
        if(category&&sub)shelves.push({category,sub});
      });
    });
    for(const shelf of shelves){
      let slot=0;
      const existing=patches.filter(b=>b.category===shelf.category&&b.sub===shelf.sub);
      existing.forEach(b=>{slot=Math.max(slot,b.slot+1)});
      const queries=[...(window.ZH_AUTOFILL_QUERIES[shelf.category+"|"+shelf.sub]||[]),shelf.sub,...window.ZH_AUTOFILL_QUERIES["*"]];
      for(const q of queries){
        if(slot>=7)break;
        for(const item of await suggest(q)){
          if(slot>=7)break;
          const workUrl=item.url||("https://book.douban.com/subject/"+item.id+"/");
          if(used.has(workUrl))continue;
          used.add(workUrl);
          const book={category:shelf.category,sub:shelf.sub,slot,title:item.title||q,author:[item.author_name,item.year].filter(Boolean).join(" / ")||"豆瓣读书",workUrl,cover:norm(item.pic)};
          patches.push(book);
          applyPatch(book);
          slot++;
        }
      }
      localStorage.setItem(CACHE_KEY,JSON.stringify(patches));
    }
  }

  setTimeout(applyAll,500);
  document.addEventListener("click",e=>{if(e.target?.matches('.language-button[data-lang="zh"]'))setTimeout(applyAll,700)});
})();
