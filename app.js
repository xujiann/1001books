const BOOKS_PER_SHELF = 7;
const OPEN_LIBRARY_SEARCH = "https://openlibrary.org/search.json";
const OPEN_LIBRARY_COVER = "https://covers.openlibrary.org/b/id/";

const ui = {
  en: {
    htmlLang: "en",
    title: "1001 Books | Library Atlas of Civilization",
    brand: "Library Atlas of Civilization",
    subtitle: "13 categories / 143 shelves / 1001 books",
    kicker: "A library atlas of civilization",
    heading: "1001 Books",
    intro: "A browsable atlas of 13 categories, 143 shelves, and 1001 real books. The English edition loads records and covers from Open Library.",
    source: 'Data and covers from <a href="https://openlibrary.org/developers/api" target="_blank" rel="noreferrer">Open Library API</a>.',
    stats: ["Categories", "Shelves", "Books"],
    search: "Search",
    searchPlaceholder: "Search title, author, category, or shelf",
    category: "Category",
    allCategories: "All categories",
    reset: "Reset",
    volume: "Vol.",
    loading: "Loading real books and covers from Open Library...",
    cached: "Loaded English books from local cache.",
    loaded: (count) => `Loaded ${count} real books.`,
    empty: "No matching books found.",
    coverAlt: (title) => `Cover of ${title}`,
    openLabel: (title) => `View ${title}`,
  },
  zh: {
    htmlLang: "zh-CN",
    title: "1001 本书 | 人类文明书目地图",
    brand: "人类文明书目地图",
    subtitle: "13 大类 / 143 小类 / 1001 本",
    kicker: "A library atlas of civilization",
    heading: "1001 本书",
    intro: "中文版按 13 个大类、143 个小类、1001 本组织。书目数据使用静态豆瓣数据文件，封面优先使用已下载到站内的豆瓣封面。",
    source: '中文版来源：<a href="https://book.douban.com/" target="_blank" rel="noreferrer">豆瓣读书</a>；英文版来源：Open Library。',
    stats: ["大类", "小类", "本书"],
    search: "搜索",
    searchPlaceholder: "输入书名、作者、大类或小类",
    category: "大类",
    allCategories: "全部大类",
    reset: "重置",
    volume: "卷",
    loading: "正在载入中文版书目...",
    cached: "已载入中文版书目。",
    loaded: (count) => `已载入 ${count} 本中文书目。`,
    empty: "没有找到匹配的书目。",
    coverAlt: (title) => `${title} 封面`,
    openLabel: (title) => `在豆瓣查看 ${title}`,
  },
};

const enCategories = [
  cat("Myth and Origins", "Creation stories, heroic epics, ritual texts, and the earliest maps of imagination.", [["Creation Myths", "creation mythology"], ["Heroic Epics", "epic poetry"], ["Ritual Texts", "ritual"], ["Ancestor Tales", "folklore"], ["Ancient Fables", "fables"], ["Divine Cosmologies", "mythology"], ["Shamanic Songs", "shamanism"], ["Folk Tales", "folk tales"], ["Sacred Places", "pilgrimage"], ["Mystic Symbols", "symbolism"], ["Oral Heritage", "oral tradition"]]),
  cat("Philosophy and Thought", "Long arguments about being, knowledge, ethics, freedom, mind, and world order.", [["Classical Philosophy", "ancient philosophy"], ["Eastern Thought", "eastern philosophy"], ["Ethics", "ethics"], ["Metaphysics", "metaphysics"], ["Epistemology", "epistemology"], ["Political Philosophy", "political philosophy"], ["Philosophy of Mind", "philosophy of mind"], ["Logic", "logic"], ["Aesthetics", "aesthetics"], ["Existentialism", "existentialism"], ["Modern Thought", "modern philosophy"]]),
  cat("Religion and Spirituality", "Scriptures, commentaries, practices, and the written life of faith.", [["Buddhism", "buddhism"], ["Christianity", "christianity"], ["Islam", "islam"], ["Hindu Traditions", "hinduism"], ["Judaism", "judaism"], ["Taoism", "taoism"], ["Mysticism", "mysticism"], ["Meditation", "meditation"], ["History of Religion", "history of religion"], ["Theology", "theology"], ["Spiritual Life", "spiritual life"]]),
  cat("Literature and Poetry", "Fiction, poetry, drama, and narrative arts that preserve human feeling.", [["Classical Poetry", "classic poetry"], ["Modern Poetry", "modern poetry"], ["Novels", "fiction"], ["Short Stories", "short stories"], ["Drama", "drama"], ["Essays", "essays"], ["Travel Writing", "travel writing"], ["Letters", "letters"], ["Literary Criticism", "literary criticism"], ["Children's Literature", "children's literature"], ["World Classics", "classic literature"]]),
  cat("History and Memory", "Empires, revolutions, migrations, cities, people, wars, and daily life.", [["Ancient History", "ancient history"], ["Medieval History", "medieval history"], ["Early Modern History", "early modern history"], ["Modern History", "modern history"], ["World History", "world history"], ["Local History", "local history"], ["Biography", "biography"], ["Memoirs", "memoirs"], ["Military History", "military history"], ["Urban History", "urban history"], ["Archaeology", "archaeology"]]),
  cat("Science and Nature", "From stars to cells, from proofs to ecosystems: verifiable curiosity.", [["Mathematics", "mathematics"], ["Physics", "physics"], ["Chemistry", "chemistry"], ["Astronomy", "astronomy"], ["Earth Sciences", "earth sciences"], ["Biology", "biology"], ["Medicine", "medicine"], ["Ecology", "ecology"], ["History of Science", "history of science"], ["Philosophy of Science", "philosophy of science"], ["Popular Science", "popular science"]]),
  cat("Technology and Engineering", "Tools, machines, computation, manufacturing, energy, and infrastructure.", [["Civil Engineering", "civil engineering"], ["Mechanical Engineering", "mechanical engineering"], ["Electrical Engineering", "electrical engineering"], ["Computer Science", "computer science"], ["Artificial Intelligence", "artificial intelligence"], ["Materials Science", "materials science"], ["Transportation", "transportation"], ["Energy Technology", "energy technology"], ["Agricultural Technology", "agricultural technology"], ["Manufacturing", "manufacturing"], ["Network Society", "internet"]]),
  cat("Society and Politics", "Institutions, power, class, gender, law, media, and public life.", [["Sociology", "sociology"], ["Anthropology", "anthropology"], ["Political Systems", "political science"], ["International Relations", "international relations"], ["Law", "law"], ["Public Policy", "public policy"], ["Gender Studies", "gender studies"], ["Education", "education"], ["Media Studies", "mass media"], ["Ethnology", "ethnology"], ["Urban Society", "urban sociology"]]),
  cat("Economics and Business", "Wealth, work, trade, organizations, markets, and enterprise.", [["Economic Theory", "economics"], ["Finance", "finance"], ["Management", "management"], ["Entrepreneurship", "entrepreneurship"], ["Marketing", "marketing"], ["Accounting", "accounting"], ["Business History", "business history"], ["Labor Economics", "labor economics"], ["Development Economics", "development economics"], ["Consumer Behavior", "consumer behavior"], ["Behavioral Economics", "behavioral economics"]]),
  cat("Arts and Aesthetics", "Images, sound, space, performance, craft, and criticism.", [["Painting", "painting"], ["Sculpture", "sculpture"], ["Music", "music"], ["Film", "film"], ["Photography", "photography"], ["Dance", "dance"], ["Architecture", "architecture"], ["Design", "design"], ["Calligraphy", "calligraphy"], ["Crafts", "crafts"], ["Art Criticism", "art criticism"]]),
  cat("Life and Body", "Food, health, family, movement, travel, affection, and daily wisdom.", [["Cooking", "cooking"], ["Health", "health"], ["Sports", "sports"], ["Family", "family"], ["Love", "love"], ["Travel", "travel"], ["Gardening", "gardening"], ["Fashion", "fashion"], ["Home", "home"], ["Etiquette", "etiquette"], ["Self Cultivation", "self help"]]),
  cat("Language and Education", "Language, writing, learning, translation, rhetoric, and transmission.", [["Linguistics", "linguistics"], ["Writing Systems", "writing systems"], ["Rhetoric", "rhetoric"], ["Translation", "translation"], ["Dictionaries", "dictionaries"], ["Education Theory", "philosophy of education"], ["Study Skills", "study skills"], ["Reading", "reading"], ["Writing", "creative writing"], ["Publishing", "publishing"], ["Library Science", "library science"]]),
  cat("Future and Imagination", "Utopia, science fiction, collapse, future ethics, and possible civilizations.", [["Science Fiction", "science fiction"], ["Utopias", "utopias"], ["Dystopias", "dystopias"], ["Futurology", "futurology"], ["Space Civilization", "space exploration"], ["Ecological Futures", "climate change"], ["Cyberculture", "cyberpunk"], ["Posthumanism", "posthumanism"], ["Apocalyptic Fiction", "apocalyptic fiction"], ["Civilization", "civilization"], ["Time Travel", "time travel"]]),
];

const zhCategories = [
  cat("神话与起源", "创世叙事、英雄传说、仪式歌辞与文明最早的想象力。", ["神话", "史诗", "民间故事", "传说", "寓言", "宗教", "民俗", "故事", "文化", "人类学", "古典"].map((x) => [x, x])),
  cat("哲学与思想", "关于存在、知识、伦理、自由、心灵与世界秩序的长谈。", ["哲学", "思想", "伦理学", "形而上学", "认识论", "政治哲学", "心理学", "逻辑学", "美学", "存在主义", "社会思想"].map((x) => [x, x])),
  cat("宗教与灵性", "信仰传统、修行经验、经典注释与灵魂生活的文献。", ["佛教", "基督教", "伊斯兰", "印度", "犹太", "道教", "神秘主义", "禅修", "宗教史", "神学", "灵修"].map((x) => [x, x])),
  cat("文学与诗歌", "小说、诗、戏剧与叙事艺术保存了人类感受世界的方式。", ["诗歌", "现代诗", "小说", "短篇小说", "戏剧", "散文", "游记", "书信", "文学评论", "儿童文学", "名著"].map((x) => [x, x])),
  cat("历史与记忆", "帝国、革命、迁徙、城市、人物与日常生活留下的证词。", ["古代史", "中世纪", "近代史", "现代史", "世界史", "地方史", "传记", "回忆录", "战争", "城市史", "考古"].map((x) => [x, x])),
  cat("科学与自然", "从星空到细胞，从数学证明到生态系统，记录可验证的好奇心。", ["数学", "物理", "化学", "天文", "地理", "生物", "医学", "生态", "科学史", "科学哲学", "科普"].map((x) => [x, x])),
  cat("技术与工程", "工具、机器、计算、制造、能源与基础设施塑造现代生活。", ["建筑", "机械", "电气", "计算机", "人工智能", "材料", "交通", "能源", "农业", "设计", "互联网"].map((x) => [x, x])),
  cat("社会与政治", "制度、权力、阶层、性别、法律与公共生活的分析地图。", ["社会学", "人类学", "政治", "国际关系", "法律", "公共政策", "女性主义", "教育", "传媒", "民族", "城市"].map((x) => [x, x])),
  cat("经济与商业", "财富、劳动、贸易、组织、市场与企业实践的书架。", ["经济学", "金融", "管理", "创业", "营销", "会计", "商业", "劳动", "发展经济学", "消费", "行为经济学"].map((x) => [x, x])),
  cat("艺术与审美", "图像、声音、空间、表演与手工艺构成感官文明。", ["绘画", "雕塑", "音乐", "电影", "摄影", "舞蹈", "建筑史", "设计", "书法", "工艺", "艺术史"].map((x) => [x, x])),
  cat("生活与身体", "饮食、健康、家庭、运动、情感与日常智慧的实践之书。", ["美食", "健康", "运动", "家庭", "爱情", "旅行", "园艺", "时尚", "家居", "礼仪", "自我管理"].map((x) => [x, x])),
  cat("语言与教育", "语言、文字、学习、翻译、修辞与知识传承的技艺。", ["语言学", "文字", "修辞", "翻译", "词典", "教育学", "学习", "阅读", "写作", "出版", "图书馆"].map((x) => [x, x])),
  cat("未来与想象", "乌托邦、科幻、灾变、未来伦理与尚未到来的文明可能。", ["科幻", "乌托邦", "反乌托邦", "未来", "太空", "气候", "赛博朋克", "后人类", "末世", "文明", "时间旅行"].map((x) => [x, x])),
];

const els = {
  library: document.querySelector("#library"),
  categoryTemplate: document.querySelector("#categoryTemplate"),
  shelfTemplate: document.querySelector("#shelfTemplate"),
  bookTemplate: document.querySelector("#bookTemplate"),
  nav: document.querySelector("#categoryNav"),
  select: document.querySelector("#categorySelect"),
  search: document.querySelector("#searchInput"),
  reset: document.querySelector("#resetButton"),
};

let lang = new URLSearchParams(location.search).get("lang") === "zh" ? "zh" : "en";
let categories = lang === "zh" ? zhCategories : enCategories;
let books = [];

init();

async function init() {
  bindEvents();
  await loadLanguage(lang);
}

function bindEvents() {
  document.querySelectorAll(".language-button").forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.lang;
      const url = new URL(location.href);
      url.searchParams.set("lang", next);
      history.pushState(null, "", `${url.pathname}${url.search}${location.hash}`);
      loadLanguage(next);
    });
  });
  els.search.addEventListener("input", () => renderLibrary());
  els.select.addEventListener("change", () => renderLibrary());
  els.reset.addEventListener("click", () => {
    els.search.value = "";
    els.select.value = "all";
    renderLibrary();
  });
}

async function loadLanguage(nextLang) {
  lang = nextLang;
  categories = lang === "zh" ? zhCategories : enCategories;
  books = [];
  applyText();
  renderShell();

  if (lang === "zh") {
    books = Array.isArray(window.ZH_BOOKS) && window.ZH_BOOKS.length === expectedBookCount() ? window.ZH_BOOKS : buildChinesePlaceholderBooks();
    renderLibrary(ui.zh.loaded(books.length));
    return;
  }

  const cached = loadCachedBooks();
  if (cached.length === expectedBookCount()) {
    books = cached;
    renderLibrary(ui.en.cached);
    return;
  }

  renderLibrary(ui.en.loading);
  books = await fetchEnglishLibrary();
  saveCachedBooks(books);
  renderLibrary(ui.en.loaded(books.length));
}

async function fetchEnglishLibrary() {
  const shelves = categories.flatMap((item, categoryIndex) =>
    item.subs.map((sub, subIndex) => ({ category: item.name, categoryIndex, subIndex, ...sub })),
  );
  const result = [];
  let number = 1;

  for (let index = 0; index < shelves.length; index += 5) {
    const chunk = shelves.slice(index, index + 5);
    const loaded = await Promise.all(chunk.map(fetchEnglishShelf));
    loaded.flat().forEach((book) => {
      result.push({ ...book, number });
      number += 1;
    });
    renderLibrary(`Loading ${Math.min(result.length, expectedBookCount())} / ${expectedBookCount()}...`, result);
  }
  return result.slice(0, expectedBookCount());
}

async function fetchEnglishShelf(shelf) {
  const params = new URLSearchParams({
    subject: shelf.subject,
    limit: "80",
    fields: "key,title,author_name,first_publish_year,cover_i",
  });
  try {
    const response = await fetch(`${OPEN_LIBRARY_SEARCH}?${params.toString()}`);
    if (!response.ok) throw new Error(response.status);
    const data = await response.json();
    const seen = new Set();
    const docs = (data.docs || []).filter((doc) => doc.title && doc.cover_i && !seen.has(doc.key) && seen.add(doc.key)).slice(0, BOOKS_PER_SHELF);
    while (docs.length < BOOKS_PER_SHELF) docs.push(null);
    return docs.map((doc, slot) => normalizeEnglishBook(doc, shelf, slot));
  } catch {
    return Array.from({ length: BOOKS_PER_SHELF }, (_, slot) => normalizeEnglishBook(null, shelf, slot));
  }
}

function normalizeEnglishBook(doc, shelf, slot) {
  if (!doc) {
    return {
      category: shelf.category,
      sub: shelf.name,
      title: `${shelf.name} Selection ${slot + 1}`,
      author: "Open Library",
      workUrl: "https://openlibrary.org",
      cover: "",
    };
  }
  const authors = Array.isArray(doc.author_name) && doc.author_name.length > 0 ? doc.author_name.slice(0, 2).join(" / ") : "Anonymous";
  return {
    category: shelf.category,
    sub: shelf.name,
    title: doc.title,
    author: doc.first_publish_year ? `${authors} · ${doc.first_publish_year}` : authors,
    cover: `${OPEN_LIBRARY_COVER}${doc.cover_i}-M.jpg`,
    workUrl: doc.key ? `https://openlibrary.org${doc.key}` : "https://openlibrary.org",
  };
}

function buildChinesePlaceholderBooks() {
  const result = [];
  let number = 1;
  zhCategories.forEach((category) => {
    category.subs.forEach((sub) => {
      for (let slot = 0; slot < BOOKS_PER_SHELF; slot += 1) {
        result.push({
          number,
          category: category.name,
          sub: sub.name,
          title: `${sub.name}书目 ${slot + 1}`,
          author: "豆瓣读书",
          cover: "",
          workUrl: `https://book.douban.com/tag/${encodeURIComponent(sub.name)}`,
        });
        number += 1;
      }
    });
  });
  const patches = Array.isArray(window.ZH_BOOK_PATCHES) ? window.ZH_BOOK_PATCHES : [];
  patches.forEach((patch) => {
    const index = result.findIndex((book) => book.category === patch.category && book.sub === patch.sub) + Number(patch.slot || 0);
    if (index >= 0 && result[index] && result[index].category === patch.category && result[index].sub === patch.sub) {
      result[index] = { ...result[index], ...patch, number: result[index].number };
    }
  });
  return result;
}

function applyText() {
  const t = ui[lang];
  document.documentElement.lang = t.htmlLang;
  document.title = t.title;
  document.querySelector(".brand strong").textContent = t.brand;
  document.querySelector(".brand small").textContent = t.subtitle;
  document.querySelector(".kicker").textContent = t.kicker;
  document.querySelector("#pageTitle").textContent = t.heading;
  document.querySelector(".hero-copy p:nth-of-type(2)").textContent = t.intro;
  document.querySelector(".source-note").innerHTML = t.source;
  document.querySelectorAll(".stats span").forEach((span, index) => {
    span.lastChild.textContent = ` ${t.stats[index]}`;
  });
  document.querySelector(".search span").textContent = t.search;
  els.search.placeholder = t.searchPlaceholder;
  document.querySelector(".select span").textContent = t.category;
  els.reset.textContent = t.reset;
  document.querySelectorAll(".language-button").forEach((button) => button.classList.toggle("is-active", button.dataset.lang === lang));
}

function renderShell() {
  els.nav.replaceChildren();
  els.select.replaceChildren(new Option(ui[lang].allCategories, "all"));
  document.querySelector("#categoryCount").textContent = categories.length;
  document.querySelector("#subCategoryCount").textContent = categories.length * 11;
  document.querySelector("#bookCount").textContent = expectedBookCount();

  categories.forEach((item, index) => {
    const id = categoryId(index);
    const link = document.createElement("a");
    link.href = `#${id}`;
    link.textContent = `${String(index + 1).padStart(2, "0")} ${item.name}`;
    els.nav.append(link);
    els.select.append(new Option(item.name, item.name));
  });
}

function renderLibrary(statusText = "", sourceBooks = books) {
  const t = ui[lang];
  const term = els.search.value.trim().toLowerCase();
  const selected = els.select.value;
  els.library.replaceChildren();

  if (statusText) {
    const status = document.createElement("p");
    status.className = "status";
    status.textContent = statusText;
    els.library.append(status);
  }

  let visible = 0;
  categories.forEach((item, categoryIndex) => {
    if (selected !== "all" && selected !== item.name) return;
    const section = els.categoryTemplate.content.firstElementChild.cloneNode(true);
    section.id = categoryId(categoryIndex);
    section.querySelector(".category-index").textContent = `${t.volume} ${String(categoryIndex + 1).padStart(2, "0")}`;
    section.querySelector("h2").textContent = item.name;
    section.querySelector(".category-description").textContent = item.description;

    const shelvesEl = section.querySelector(".shelves");
    let shelfCount = 0;
    item.subs.forEach((sub, subIndex) => {
      const shelfBooks = sourceBooks.filter((book) => {
        const haystack = `${book.title} ${book.author} ${book.category} ${book.sub}`.toLowerCase();
        return book.category === item.name && book.sub === sub.name && (!term || haystack.includes(term));
      });
      if (shelfBooks.length === 0) return;
      const shelf = els.shelfTemplate.content.firstElementChild.cloneNode(true);
      shelf.querySelector(".shelf-number").textContent = `${String(categoryIndex + 1).padStart(2, "0")}.${String(subIndex + 1).padStart(2, "0")}`;
      shelf.querySelector("h3").textContent = sub.name;
      shelfBooks.slice(0, BOOKS_PER_SHELF).forEach((book) => shelf.querySelector(".books").append(createBook(book)));
      shelvesEl.append(shelf);
      shelfCount += 1;
    });
    if (shelfCount > 0) {
      els.library.append(section);
      visible += 1;
    }
  });

  if (visible === 0 && !statusText) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = t.empty;
    els.library.append(empty);
  }
}

function createBook(book) {
  const t = ui[lang];
  const node = els.bookTemplate.content.firstElementChild.cloneNode(true);
  const link = node.querySelector(".cover");
  const img = node.querySelector(".cover-image");
  link.href = book.workUrl || "#";
  link.setAttribute("aria-label", t.openLabel(book.title));
  link.classList.toggle("is-placeholder", !book.cover);
  img.alt = t.coverAlt(book.title);
  if (book.cover) {
    img.src = book.cover;
    img.loading = "lazy";
  } else {
    img.remove();
  }
  node.querySelector(".book-number").textContent = String(book.number || "").padStart(4, "0");
  node.querySelector(".book-title").textContent = book.title;
  node.querySelector(".book-author").textContent = book.author || "";
  return node;
}

function cat(name, description, subs) {
  return { name, description, subs: subs.map(([subName, subject]) => ({ name: subName, subject })) };
}

function categoryId(index) {
  return `category-${String(index + 1).padStart(2, "0")}`;
}

function expectedBookCount() {
  return categories.length * 11 * BOOKS_PER_SHELF;
}

function cacheKey() {
  return "civilization-library-en-v3";
}

function loadCachedBooks() {
  try {
    const value = JSON.parse(localStorage.getItem(cacheKey()) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveCachedBooks(value) {
  try {
    localStorage.setItem(cacheKey(), JSON.stringify(value));
  } catch {
    // The site still works without cache.
  }
}
