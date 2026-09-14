---
layout: post
title: "ixdzs8.com 正文加载机制分析总结"
date: 2026-09-10 15:15:00 +0800
categories: 技术探索
# 想加密就加下面这一行，不加密就不写
encrypted: true
---

- 分析日期：2026-09-09 下午
- 目标站点：https://ixdzs8.com/（小说阅读站）
- 目标书目：https://ixdzs8.com/read/617556/ （第 796 章前后，p796 页面）
- 素材文件：`ixdzs8.com.har`（点击"最新章节"加载正文时，浏览器 F12 抓包导出，共 28 个请求）
- 原始疑问：HAR 里看不到完整正文字符，但网页前端完整展示了正文 —— 正文到底在哪？

---

## 一、核心结论（TL;DR）

1. **正文确实是明文，且就在 HAR 里**，位于第 2 个 HTML 响应（下文 `entry[2]`），无需解密、无需额外请求。
2. "看不到正文"是**看漏了**：F12页面中，小说正文展示在一行中，，没往后拉着看，所以没看到。
3. 正文加载走了一个 **「无参请求 → 挑战(302/challenge) → 重定向后带放行状态再请求 → 返回正文」** 的流程，与正文本身无关，只决定"给不给正文"。
4. **验证放行状态不通过新增 Cookie 传递**（三个响应的 Set-Cookie 完全相同，且是删除指令），推测放行状态记录在**服务端**（PHPSESSID 对应 session，或 IP/UA 短期记录）。

---

## 二、与正文相关的关键请求（28 个 entry 中仅 3 个）

第一次点击某一章获取正文，F12捕捉到三个关键请求
| entry | 请求 | 响应 | 内容说明 |
|---|---|---|---|
| 0 | `GET /read/617556/p796.html` | 200 text/html，body 仅 **422 bytes** | 无正文，返回了一段JS，其中包含token及后续token在请求中要放的位置|
| 1 | `GET /read/617556/p796.html?challenge=<base64>` 请求路径中带上上一个响应中下发的token| **302**，body 0 | 带挑战参数的跳转，**响应头下发关键放行标记** |
| 2 | `GET /read/617556/p796.html` | 200 text/html，body 明文 | **真正的正文页**，正文明文 UTF-8 内嵌 |

可以看到第一个请求获取正文时，服务器没有直接返回正文，而是进行了一个验证流程，然后再进行一次请求获取正文，所以正文是放在第二个请求中返回的。
在这之后的几分钟内，再次尝试获取其他章节正文，没有进行验证流程，服务器直接返回正文


1. 第一个请求的响应
```
<script>
        let token = "MTc4ODkzMTA4ODpjNzRmNTM0ZTY3YzBmNDI3NzNkMDUxZmRiYzllNmM2YTFmYjZmOTY2ZDVmMWRiMTI5OTE5ZTg3YzNiNTExNzlj";
        window.location.href = location.pathname + "?challenge=" + encodeURIComponent(token);  
</script>
```
2. 第二个请求头中的路径path值
```
/read/617556/p796.html?challenge=MTc4ODkzMTA4ODpjNzRmNTM0ZTY3YzBmNDI3NzNkMDUxZmRiYzllNmM2YTFmYjZmOTY2ZDVmMWRiMTI5OTE5ZTg3YzNiNTExNzlj
```
可以看到第一个请求返回的token，按照第一个请求中国返回的使用方式加在了第二个请求的请求路径中，第三个请求直接自动重定向成功至正文

其余 entry 均为 CSS/JS/广告/统计请求（zepto、gtag、pubadx、a-ads 等），与正文无关。

3. 三个请求的cookie和set-cookie值都相同
```
cookie : _ga=GA1.1.1816263242.1788334152; PHPSESSID=cvt02h9nsmcdj5fusf6hkuf6kr; bookshelf-644399=1; bookshelf-551689=1; _ga_1NX8SQR9LJ=GS2.1.s1788931048$o3$g1$t1788931078$j30$l0$h0

setcookie : record-617556=796; expires=Fri, 01-Jan-1971 00:00:00 GMT; Max-Age=0; path=/
```

拆开看：

record-617556=796：名字是"record-书ID"，值是章节号 796。这是这个站的阅读进度标记（记录"你在读书 617556 的第 796 章"），通常用来支持"继续阅读/最近阅读"这类功能。
expires=Fri, 01-Jan-1971（1971 年，Unix 时间戳约 1） + Max-Age=0：这两个组合在一起是标准的**"删除 cookie"指令**。Max-Age=0 表示"立即过期"，配合 1971 的过期时间，作用是让浏览器把这个 cookie 删掉（如果存在的话）。
所以三个响应其实都在做同一件事：下发 → 立即删除同一个阅读进度 cookie。它不是"验证通过的新凭证"，而更像服务器在每次翻页时"登记/清理"一次阅读记录，cookie 状态在三个响应前后没有任何净变化——这与你观察到的"三个请求的 Cookie 完全一样"完全吻合。

| 观察项 | 事实 | 含义 |
|---|---|---|
| 三个请求的cookie | 完全一样(PHPSESSID等不变) |浏览器端身份没变 |
| 三个请求的set-cookie | 完全一样，且是删除指令 |没有新增任何凭证 |

如果验证是靠 cookie 传递的，你必然会看到某一个响应下发一个"新的、不同的"Set-Cookie（比如 verified=1 或一个会话 ticket）。但现实是：三次响应的 Set-Cookie 都是同一条、而且是删除语义。所以唯一合理的解释依然是：

"该客户端已通过验证"这个状态存在于服务器端（最可能是 PHPSESSID 对应的 PHP session 里，其次是服务器短期 IP/UA 记录）。PHPSESSID 只是个不变的"钥匙"，服务器在它指向的 session 数据里打上"已放行"标记，浏览器侧永远看不到、也不需要看到任何新东西。

### entry[2] 正文确认
- `<h1>`：`第46章 真假额娘46`
- 正文首句（去标签后）：`甄嬛抬眸，看向皇后，缓慢地挣扎起来作势要给皇后请安。……`
- 去标签后的可见正文约 8791 字符，正文完整、无缺漏。

---



## 三、挑战（challenge）机制分析

### 请求链形态
```
首次点击正文
   ↓
entry[0]  GET p796.html                → 200（422B，触发挑战）
   ↓ 浏览器自动执行
entry[1]  GET p796.html?challenge=XX   → 302（下发放行，跳回原页）
   ↓ 浏览器带新状态重定向
entry[2]  GET p796.html                → 200（正文全文）
```

### challenge 参数结构
`challenge` 值为 base64，解码后为：

```
1788931088:c74f534e67c0f42773d051fdbc9e6c6a1fb6f966d5f1db129919e87c3b51179c
```

- `:` 前是 **Unix 时间戳**：`1788931088` = 2026-09-09 13:18:08（与抓包时刻吻合，说明挑战**带时效**）
- `:` 后是一串 64 位 hex，形似基于时间戳等信息的**签名/散列**，用于服务端校验"挑战是否由真实浏览器计算得出"

### 放行状态在哪？——关键证据
- 用户在 F12 中观察到：**三个响应的 Set-Cookie 完全一致**，均为
  `record-617556=796; expires=Fri, 01-Jan-1971 00:00:00 GMT; Max-Age=0; path=/`
- 该 Set-Cookie 语义是 **「删除 cookie」指令**（`Max-Age=0` + 1971 过期时间），值是"阅读进度标记"(书 617556 / 第 796 章)，**不是**验证凭证，也不是"挑战通过"的新增标记。
- 三个请求的请求头 Cookie 也完全相同、无新增 → 挑战通过后**没有**下发新 Cookie 给浏览器。
- 因此推断：放行状态记录在**服务端**（最可能是 `PHPSESSID` 指向的 session；也可能是服务器按 IP/UA 的短期白名单）。`PHPSESSID` 只是不变的"钥匙"，钥匙指向的"房间"里被打上了放行标记。

> 补充：浏览器 F12 导出的 `.har` 会**剔除 Cookie / Set-Cookie 响应头**（隐私过滤），本次 HAR 文件中搜不到任何 set-cookie 头即因此。涉及 Cookie 分析必须以 **F12 实时视图**为准，HAR 不可信。

---


## 四、从该网站下载小说思路
- [ ] **爬取思路**：直接获取小说正文，如果未获取到，说明进入验证环节，服务器返回的是验证token，重新发起路径中带token的请求通过验证，服务器重定向到正文，然后继续爬就行
---

## 五、注意事项

1. **法律合规**：该站点为未授权转载的盗版书站，抓取其内容可能侵犯版权，仅供技术分析，请勿用于商业或大规模分发用途。
2. **HAR 陷阱**：导出时剔除 Cookie/Set-Cookie 头；分析 Cookie 用 F12 实时视图。
3. **挑战时效**：challenge 带时间戳，服务端会校验时效与签名，过期/伪造都会被拒。



![第一个请求跳转到验证](/Blogsss/assets/images/Snipaste_2026-09-10_15-18-25.png)



![第二个请求进行验证](/Blogsss/assets/images/Snipaste_2026-09-10_15-18-42.png)



![重定向到的小说正文](/Blogsss/assets/images/Snipaste_2026-09-10_15-20-22.png)