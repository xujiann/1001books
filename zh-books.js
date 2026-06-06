window.ZH_BOOK_PATCHES=[
{category:'神话与起源',sub:'神话',slot:0,title:'希腊古典神话',author:'古斯塔夫·施瓦布 / 译林出版社',workUrl:'https://book.douban.com/subject/4872918/',cover:''},
{category:'神话与起源',sub:'神话',slot:1,title:'希腊神话（全三册）',author:'罗伯特·格雷夫斯 / 湖南文艺出版社',workUrl:'https://book.douban.com/subject/36084730/',cover:''},
{category:'神话与起源',sub:'神话',slot:2,title:'山海经',author:'中华书局整理本',workUrl:'https://book.douban.com/subject/3651434/',cover:''},
{category:'神话与起源',sub:'神话',slot:3,title:'山海經',author:'上海古籍出版社',workUrl:'https://book.douban.com/subject/1608873/',cover:''},
{category:'神话与起源',sub:'神话',slot:4,title:'古希腊罗马神话',author:'托马斯·布尔芬奇',workUrl:'https://book.douban.com/subject/2026291/',cover:''},
{category:'神话与起源',sub:'神话',slot:5,title:'希腊的神话和传说',author:'斯威布',workUrl:'https://book.douban.com/subject/1789805/',cover:''},
{category:'神话与起源',sub:'神话',slot:6,title:'希腊人的神话和思想',author:'让-皮埃尔·维尔南',workUrl:'https://book.douban.com/subject/2062277/',cover:''}
];
(function(){
  function apply(){
    if(new URLSearchParams(location.search).get('lang')!=='zh')return;
    const shelf=document.querySelector('#category-01 .shelf');
    if(!shelf)return setTimeout(apply,300);
    const cards=[...shelf.querySelectorAll('.book')];
    window.ZH_BOOK_PATCHES.forEach(function(book){
      const card=cards[book.slot]; if(!card)return;
      const link=card.querySelector('.cover');
      const title=card.querySelector('.book-title');
      const author=card.querySelector('.book-author');
      if(link)link.href=book.workUrl;
      if(title)title.textContent=book.title;
      if(author)author.textContent=book.author;
    });
  }
  setTimeout(apply,500);
  document.addEventListener('click',function(event){
    if(event.target && event.target.matches('.language-button[data-lang="zh"]'))setTimeout(apply,700);
  });
})();
