# 1001 本书

一个静态网站：将人类文明图书整理为 13 个大类、143 个小类、1001 本书。页面通过 Open Library Search API 获取真实书目，通过 Open Library Covers API 显示真实封面。

## 本地预览

```powershell
node server.js
```

然后打开：

```text
http://127.0.0.1:5178/
```

## GitHub Pages

这个项目是纯静态站点，可以直接部署到 GitHub Pages。将仓库 Pages 来源设置为 `main` 分支根目录即可。

## 数据来源

- Open Library Search API: https://openlibrary.org/dev/docs/api/search
- Open Library Covers API: https://openlibrary.org/dev/docs/api/covers
