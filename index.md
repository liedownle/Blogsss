---
layout: default
title: 首页
---

<section class="hero">
  <span class="hero-logo">🦢</span>
  <h1 class="hero-title">{{ site.title }}</h1>
  <p class="hero-desc">{{ site.description }}</p>
</section>

<h2 class="section-title">最新文章</h2>

<ul class="post-list">
  {% for post in site.posts %}
  <li>
    <a class="post-card" href="{{ post.url | relative_url }}">
      <span class="post-title-link">
        {% if post.encrypted %}<span class="lock-icon">🔒</span>{% endif %}
        {{ post.title }}
      </span>
      <span class="post-date">{{ post.date | date: "%Y-%m-%d" }}</span>
    </a>
  </li>
  {% endfor %}
</ul>
