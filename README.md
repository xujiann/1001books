# 1001 本书

一个静态网站：将人类文明图书整理为 13 个大类、143 个小类、1001 本书。

- 英文版：从 Open Library 加载真实书目和封面。
- 中文版：使用站内 `zh-books.js` 静态数据，书目与封面来源于豆瓣读书条目。
- 如果豆瓣条目只有默认占位图，允许使用 Open Library 的真实封面作为兜底。

## 本地预览

```powershell
node server.js
```

打开：

```text
http://127.0.0.1:5178/
http://127.0.0.1:5178/?lang=zh
```

## 项目流程

根目录是工作区，`.deploy-main` 是 GitHub Pages 发布镜像。

日常修改先在根目录完成。发布前运行检查，确认数据完整、重复为零、发布镜像一致。

```powershell
node scripts\check-site.js
```

同步到发布镜像但不提交：

```powershell
node scripts\publish-site.js
```

同步、提交并推送：

```powershell
node scripts\publish-site.js --push --message "Publish site updates"
```

发布脚本会自动：

1. 更新资源缓存版本号。
2. 检查中文书目数量、书架数量、封面、链接和重复书名。
3. 复制核心文件到 `.deploy-main`。
4. 再次检查发布镜像。
5. 在传入 `--push` 时提交并推送 `main`。
6. 等待并核对 GitHub Pages 上的 `index.html`、`zh-books.js` 哈希。

注意：`.deploy-pages` 是历史发布目录，不再使用。当前只使用 `.deploy-main` 的 `main` 分支和 `.github/workflows/pages.yml` 发布。

## 中文书目质量

中文书目基础检查：

```powershell
node scripts\check-site.js --no-deploy
node scripts\audit-zh-covers.js
node scripts\audit-zh-version-duplicates.js
```

按大类导出精选审核清单：

```powershell
node scripts\review-zh-category.js 1
node scripts\review-zh-category.js 2
node scripts\review-zh-all.js
```

当豆瓣搜索接口不稳定，但已经人工核验好条目、作者、链接和封面时，可以直接替换某个槽位：

```powershell
node scripts\set-zh-slot.js 大类 小类 位置 书名 作者 豆瓣链接 封面链接
```

精选阶段的目标：

- 同作者同名只保留一种。
- 同书名、同豆瓣链接不重复。
- 低质量版本、导读、题库、教材化条目逐步替换。
- 每个小类 7 本尽量兼顾经典性、代表性、地域与时代平衡。

## 线上地址

https://xujiann.github.io/1001books/

## 数据来源

- Open Library: https://openlibrary.org/developers/api
- 豆瓣读书: https://book.douban.com/
