---
layout: default
title: 首页
---

<h1>{{ site.title }}</h1>
<p>{{ site.description }}</p>

<hr>

<h2>最新文章</h2>

<ul class="post-list">
  {% for post in site.posts %}
  <li>
    <a href="{{ post.url | relative_url }}">
      {% if post.encrypted %}<span class="lock-icon">🔒</span>{% endif %}
      {{ post.title }}
    </a>
    <span class="post-date">{{ post.date | date: "%Y-%m-%d" }}</span>
    {% if post.encrypted %}<span class="badge">加密文章</span>{% endif %}
  </li>
  {% endfor %}
</ul>
