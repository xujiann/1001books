window.ZH_BOOK_PATCHES = [
  {category:'神话与起源',sub:'神话',slot:0,title:'希腊古典神话',author:'古斯塔夫·施瓦布 / 译林出版社',workUrl:'https://book.douban.com/subject/4872918/',cover:''},
  {category:'神话与起源',sub:'神话',slot:1,title:'希腊神话（全三册）',author:'罗伯特·格雷夫斯 / 湖南文艺出版社',workUrl:'https://book.douban.com/subject/36084730/',cover:''},
  {category:'神话与起源',sub:'神话',slot:2,title:'山海经',author:'中华书局整理本',workUrl:'https://book.douban.com/subject/3651434/',cover:''},
  {category:'神话与起源',sub:'神话',slot:3,title:'山海經',author:'上海古籍出版社',workUrl:'https://book.douban.com/subject/1608873/',cover:''},
  {category:'神话与起源',sub:'神话',slot:4,title:'古希腊罗马神话',author:'托马斯·布尔芬奇',workUrl:'https://book.douban.com/subject/2026291/',cover:''},
  {category:'神话与起源',sub:'神话',slot:5,title:'希腊的神话和传说',author:'斯威布',workUrl:'https://book.douban.com/subject/1789805/',cover:''},
  {category:'神话与起源',sub:'神话',slot:6,title:'希腊人的神话和思想',author:'让-皮埃尔·维尔南',workUrl:'https://book.douban.com/subject/2062277/',cover:''},
  {category:'神话与起源',sub:'史诗',slot:0,title:'吉尔伽美什史诗',author:'拱玉书 译注 / 商务印书馆',workUrl:'https://book.douban.com/subject/35218215/',cover:''},
  {category:'神话与起源',sub:'史诗',slot:1,title:'伊利亚特',author:'荷马 / 人民文学出版社',workUrl:'https://book.douban.com/subject/4275056/',cover:''},
  {category:'神话与起源',sub:'史诗',slot:2,title:'奥德修纪',author:'荷马',workUrl:'https://book.douban.com/subject/1880333/',cover:''},
  {category:'神话与起源',sub:'史诗',slot:3,title:'罗摩衍那',author:'蚁垤 / 季羡林 译',workUrl:'https://book.douban.com/subject/26848525/',cover:''},
  {category:'神话与起源',sub:'史诗',slot:4,title:'摩诃婆罗多插话选',author:'金克木 编选 / 人民文学出版社',workUrl:'https://book.douban.com/subject/2033697/',cover:''},
  {category:'神话与起源',sub:'史诗',slot:5,title:'卡莱瓦拉',author:'伦洛特 / 张华文 译',workUrl:'https://book.douban.com/subject/33431974/',cover:''},
  {category:'神话与起源',sub:'史诗',slot:6,title:'尼伯龙根之歌',author:'曹乃云 译 / 广西师范大学出版社',workUrl:'https://book.douban.com/subject/27115984/',cover:''}
];
(function(){
  function applyChineseBookPatches(){
    if(new URLSearchParams(location.search).get('lang')!=='zh')return;
    const sections=[...document.querySelectorAll('.category-section')];
    if(!sections.length)return setTimeout(applyChineseBookPatches,300);
    window.ZH_BOOK_PATCHES.forEach(function(book){
      const section=sections.find(function(node){return node.querySelector('h2')&&node.querySelector('h2').textContent.trim()===book.category});
      if(!section)return;
      const shelf=[...section.querySelectorAll('.shelf')].find(function(node){return node.querySelector('h3')&&node.querySelector('h3').textContent.trim()===book.sub});
      if(!shelf)return;
      const card=shelf.querySelectorAll('.book')[book.slot];
      if(!card)return;
      const link=card.querySelector('.cover'),title=card.querySelector('.book-title'),author=card.querySelector('.book-author'),image=card.querySelector('.cover-image');
      if(link)link.href=book.workUrl;
      if(title)title.textContent=book.title;
      if(author)author.textContent=book.author;
      if(image&&book.cover)image.src=book.cover;
    });
  }
  setTimeout(applyChineseBookPatches,500);
  document.addEventListener('click',function(event){if(event.target&&event.target.matches('.language-button[data-lang="zh"]'))setTimeout(applyChineseBookPatches,700)});
})();
