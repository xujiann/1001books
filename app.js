const BOOKS_PER_SHELF = 7;
const OPEN_LIBRARY_SEARCH = "https://openlibrary.org/search.json";
const OPEN_LIBRARY_COVER = "https://covers.openlibrary.org/b/id/";
const CACHE_KEY = "civilization-library-v2";

const categories = [
  category("神话与起源", "创世叙事、英雄传说、仪式歌辞与文明最早的想象力。", [
    ["创世神话", "creation mythology"], ["英雄史诗", "epic poetry"], ["祭仪文本", "ritual"], ["祖先传说", "folklore"], ["古代寓言", "fables"], ["神谱宇宙", "mythology"], ["萨满歌辞", "shamanism"], ["民间故事", "folk tales"], ["圣地传记", "pilgrimage"], ["神秘象征", "symbolism"], ["口传遗产", "oral tradition"],
  ]),
  category("哲学与思想", "关于存在、知识、伦理、自由、心灵与世界秩序的长谈。", [
    ["古典哲学", "ancient philosophy"], ["东方思想", "eastern philosophy"], ["伦理学", "ethics"], ["形而上学", "metaphysics"], ["认识论", "epistemology"], ["政治哲学", "political philosophy"], ["心灵哲学", "philosophy of mind"], ["逻辑学", "logic"], ["美学", "aesthetics"], ["存在主义", "existentialism"], ["现代思想", "modern philosophy"],
  ]),
  category("宗教与灵性", "信仰传统、修行经验、经典注释与灵魂生活的文献。", [
    ["佛教经典", "buddhism"], ["基督教传统", "christianity"], ["伊斯兰思想", "islam"], ["印度宗教", "hinduism"], ["犹太传统", "judaism"], ["道教经典", "taoism"], ["神秘主义", "mysticism"], ["修行手册", "meditation"], ["宗教史", "history of religion"], ["神学论辩", "theology"], ["灵性生活", "spiritual life"],
  ]),
  category("文学与诗歌", "小说、诗、戏剧与叙事艺术保存了人类感受世界的方式。", [
    ["古典诗歌", "classic poetry"], ["现代诗歌", "modern poetry"], ["长篇小说", "fiction"], ["短篇小说", "short stories"], ["戏剧", "drama"], ["散文", "essays"], ["游记", "travel writing"], ["书信", "letters"], ["文学批评", "literary criticism"], ["儿童文学", "children's literature"], ["世界名著", "classic literature"],
  ]),
  category("历史与记忆", "帝国、革命、迁徙、城市、人物与日常生活留下的证词。", [
    ["古代史", "ancient history"], ["中世纪史", "medieval history"], ["近代史", "early modern history"], ["现代史", "modern history"], ["全球史", "world history"], ["地方史", "local history"], ["传记", "biography"], ["回忆录", "memoirs"], ["战争史", "military history"], ["城市史", "urban history"], ["考古发现", "archaeology"],
  ]),
  category("科学与自然", "从星空到细胞，从数学证明到生态系统，记录可验证的好奇心。", [
    ["数学", "mathematics"], ["物理学", "physics"], ["化学", "chemistry"], ["天文学", "astronomy"], ["地球科学", "earth sciences"], ["生命科学", "biology"], ["医学", "medicine"], ["生态学", "ecology"], ["科学史", "history of science"], ["科学哲学", "philosophy of science"], ["科普经典", "popular science"],
  ]),
  category("技术与工程", "工具、机器、计算、制造、能源与基础设施塑造现代生活。", [
    ["建筑工程", "civil engineering"], ["机械工程", "mechanical engineering"], ["电气工程", "electrical engineering"], ["计算机", "computer science"], ["人工智能", "artificial intelligence"], ["材料科学", "materials science"], ["交通技术", "transportation"], ["能源技术", "energy technology"], ["农业技术", "agricultural technology"], ["设计制造", "manufacturing"], ["网络社会", "internet"],
  ]),
  category("社会与政治", "制度、权力、阶层、性别、法律与公共生活的分析地图。", [
    ["社会学", "sociology"], ["人类学", "anthropology"], ["政治制度", "political science"], ["国际关系", "international relations"], ["法学", "law"], ["公共政策", "public policy"], ["性别研究", "gender studies"], ["教育研究", "education"], ["传媒研究", "mass media"], ["民族研究", "ethnology"], ["城市社会", "urban sociology"],
  ]),
  category("经济与商业", "财富、劳动、贸易、组织、市场与企业实践的书架。", [
    ["经济理论", "economics"], ["金融", "finance"], ["管理", "management"], ["创业", "entrepreneurship"], ["营销", "marketing"], ["会计", "accounting"], ["商业史", "business history"], ["劳动研究", "labor economics"], ["发展经济", "development economics"], ["消费社会", "consumer behavior"], ["行为经济", "behavioral economics"],
  ]),
  category("艺术与审美", "图像、声音、空间、表演与手工艺构成感官文明。", [
    ["绘画", "painting"], ["雕塑", "sculpture"], ["音乐", "music"], ["电影", "film"], ["摄影", "photography"], ["舞蹈", "dance"], ["建筑史", "architecture"], ["设计", "design"], ["书法", "calligraphy"], ["工艺", "crafts"], ["艺术批评", "art criticism"],
  ]),
  category("生活与身体", "饮食、健康、家庭、运动、情感与日常智慧的实践之书。", [
    ["饮食", "cooking"], ["健康", "health"], ["运动", "sports"], ["家庭", "family"], ["情感", "love"], ["旅行", "travel"], ["园艺", "gardening"], ["服饰", "fashion"], ["居住", "home"], ["礼仪", "etiquette"], ["自我修养", "self help"],
  ]),
  category("语言与教育", "语言、文字、学习、翻译、修辞与知识传承的技艺。", [
    ["语言学", "linguistics"], ["文字史", "writing systems"], ["修辞", "rhetoric"], ["翻译", "translation"], ["词典", "dictionaries"], ["教育理论", "philosophy of education"], ["学习方法", "study skills"], ["阅读", "reading"], ["写作", "creative writing"], ["出版史", "publishing"], ["图书馆学", "library science"],
  ]),
  category("未来与想象", "乌托邦、科幻、灾变、未来伦理与尚未到来的文明可能。", [
    ["科幻经典", "science fiction"], ["乌托邦", "utopias"], ["反乌托邦", "dystopias"], ["未来学", "futurology"], ["太空文明", "space exploration"], ["生态未来", "climate change"], ["赛博文化", "cyberpunk"], ["后人类", "posthumanism"], ["灾变叙事", "apocalyptic fiction"], ["文明推演", "civilization"], ["时间想象", "time travel"],
  ]),
];

const libraryEl = document.querySelector("#library");
const categoryTemplate = document.querySelector("#categoryTemplate");
const shelfTemplate = document.querySelector("#shelfTemplate");
const bookTemplate = document.querySelector("#bookTemplate");
const navEl = document.querySelector("#categoryNav");
const selectEl = document.querySelector("#categorySelect");
const searchInput = document.querySelector("#searchInput");
const resetButton = document.querySelector("#resetButton");

let books = loadCachedBooks();

init();

async function init() {
  document.querySelector("#categoryCount").textContent = categories.length;
  document.querySelector("#subCategoryCount").textContent = categories.length * 11;
  document.querySelector("#bookCount").textContent = "1001";

  categories.forEach((item, index) => {
    const id = categoryId(index);
    const link = document.createElement("a");
    link.href = `#${id}`;
    link.textContent = `${String(index + 1).padStart(2, "0")} ${item.name}`;
    navEl.append(link);

    const option = document.createElement("option");
    option.value = item.name;
    option.textContent = item.name;
    selectEl.append(option);
  });

  searchInput.addEventListener("input", renderLibrary);
  selectEl.addEventListener("change", renderLibrary);
  resetButton.addEventListener("click", () => {
    searchInput.value = "";
    selectEl.value = "all";
    renderLibrary();
  });

  if (books.length === expectedBookCount()) {
    renderLibrary("已从本地缓存载入真实书目。");
    return;
  }

  renderLibrary("正在从 Open Library 读取真实书目和封面...");
  books = await fetchLibrary();
  saveCachedBooks(books);
  renderLibrary(`已载入 ${books.length} 本真实书目。`);
}

async function fetchLibrary() {
  const shelves = categories.flatMap((item, categoryIndex) =>
    item.subs.map((sub, subIndex) => ({ category: item.name, categoryIndex, subIndex, ...sub })),
  );

  const results = [];
  let number = 1;

  for (let index = 0; index < shelves.length; index += 5) {
    const chunk = shelves.slice(index, index + 5);
    const loaded = await Promise.all(chunk.map(fetchShelf));
    loaded.flat().forEach((book) => {
      results.push({ ...book, number });
      number += 1;
    });
    renderLibrary(`正在载入真实书目 ${Math.min(results.length, expectedBookCount())} / ${expectedBookCount()}...`, results);
  }

  return results.slice(0, expectedBookCount());
}

async function fetchShelf(shelf) {
  const params = new URLSearchParams({
    subject: shelf.subject,
    limit: "80",
    fields: "key,title,author_name,first_publish_year,cover_i",
  });

  try {
    const response = await fetch(`${OPEN_LIBRARY_SEARCH}?${params.toString()}`);
    if (!response.ok) throw new Error(`Open Library returned ${response.status}`);
    const data = await response.json();
    const seen = new Set();
    const docs = (data.docs || [])
      .filter((doc) => doc.title && doc.cover_i && !seen.has(doc.key) && seen.add(doc.key))
      .slice(0, BOOKS_PER_SHELF);

    return padShelf(docs, shelf).map((doc, slot) => normalizeBook(doc, shelf, slot));
  } catch (error) {
    return Array.from({ length: BOOKS_PER_SHELF }, (_, slot) => unavailableBook(shelf, slot));
  }
}

function normalizeBook(doc, shelf, slot) {
  const authors = Array.isArray(doc.author_name) && doc.author_name.length > 0 ? doc.author_name.slice(0, 2).join(" / ") : "佚名";
  return {
    category: shelf.category,
    categoryIndex: shelf.categoryIndex,
    sub: shelf.name,
    subIndex: shelf.subIndex,
    title: doc.title,
    author: doc.first_publish_year ? `${authors} · ${doc.first_publish_year}` : authors,
    coverId: doc.cover_i,
    workUrl: doc.key ? `https://openlibrary.org${doc.key}` : "https://openlibrary.org",
    isReal: Boolean(doc.cover_i),
    slot,
  };
}

function unavailableBook(shelf, slot) {
  return {
    category: shelf.category,
    categoryIndex: shelf.categoryIndex,
    sub: shelf.name,
    subIndex: shelf.subIndex,
    title: "等待 Open Library 数据",
    author: shelf.subject,
    coverId: null,
    workUrl: "https://openlibrary.org",
    isReal: false,
    slot,
  };
}

function padShelf(docs, shelf) {
  if (docs.length >= BOOKS_PER_SHELF) return docs;
  const padded = [...docs];
  while (padded.length < BOOKS_PER_SHELF) padded.push(unavailableBook(shelf, padded.length));
  return padded;
}

function renderLibrary(statusText = "", sourceBooks = books) {
  const term = searchInput.value.trim().toLowerCase();
  const selected = selectEl.value;
  libraryEl.replaceChildren();

  if (statusText) {
    const status = document.createElement("p");
    status.className = "status";
    status.textContent = statusText;
    libraryEl.append(status);
  }

  let visibleCategories = 0;

  categories.forEach((item, categoryIndex) => {
    if (selected !== "all" && selected !== item.name) return;

    const section = categoryTemplate.content.firstElementChild.cloneNode(true);
    section.id = categoryId(categoryIndex);
    section.querySelector(".category-index").textContent = `卷 ${String(categoryIndex + 1).padStart(2, "0")}`;
    section.querySelector("h2").textContent = item.name;
    section.querySelector(".category-description").textContent = item.description;

    const shelvesEl = section.querySelector(".shelves");
    let visibleShelves = 0;

    item.subs.forEach((sub, subIndex) => {
      const shelfBooks = sourceBooks.filter((book) => {
        const haystack = `${book.title} ${book.author} ${book.category} ${book.sub}`.toLowerCase();
        return book.category === item.name && book.sub === sub.name && (!term || haystack.includes(term));
      });

      if (shelfBooks.length === 0) return;

      const shelf = shelfTemplate.content.firstElementChild.cloneNode(true);
      shelf.querySelector(".shelf-number").textContent = `${String(categoryIndex + 1).padStart(2, "0")}.${String(subIndex + 1).padStart(2, "0")}`;
      shelf.querySelector("h3").textContent = sub.name;

      const booksEl = shelf.querySelector(".books");
      shelfBooks.slice(0, BOOKS_PER_SHELF).forEach((book) => booksEl.append(createBook(book)));
      shelvesEl.append(shelf);
      visibleShelves += 1;
    });

    if (visibleShelves > 0) {
      libraryEl.append(section);
      visibleCategories += 1;
    }
  });

  if (visibleCategories === 0 && !statusText) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "没有找到匹配的书目。";
    libraryEl.append(empty);
  }
}

function createBook(book) {
  const node = bookTemplate.content.firstElementChild.cloneNode(true);
  const link = node.querySelector(".cover");
  const img = node.querySelector(".cover-image");

  link.href = book.workUrl;
  link.setAttribute("aria-label", `在 Open Library 查看 ${book.title}`);
  link.classList.toggle("is-placeholder", !book.coverId);
  img.alt = `${book.title} 封面`;

  if (book.coverId) {
    img.src = `${OPEN_LIBRARY_COVER}${book.coverId}-M.jpg`;
    img.loading = "lazy";
  } else {
    img.remove();
  }

  node.querySelector(".book-number").textContent = String(book.number || book.slot + 1).padStart(4, "0");
  node.querySelector(".book-title").textContent = book.title;
  node.querySelector(".book-author").textContent = book.author;
  return node;
}

function category(name, description, subs) {
  return {
    name,
    description,
    subs: subs.map(([subName, subject]) => ({ name: subName, subject })),
  };
}

function categoryId(index) {
  return `category-${String(index + 1).padStart(2, "0")}`;
}

function expectedBookCount() {
  return categories.length * 11 * BOOKS_PER_SHELF;
}

function loadCachedBooks() {
  try {
    const value = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveCachedBooks(value) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    // The site still works without cache; it will fetch again next load.
  }
}
