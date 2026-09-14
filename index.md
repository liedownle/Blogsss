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
      <div class="post-card-head">
        <span class="post-title-link">
          {% if post.encrypted %}<span class="lock-icon">🔒</span>{% endif %}
          {{ post.title }}
        </span>
      </div>

      {% if post.categories %}
      <div class="post-tags">
        {% for cat in post.categories %}
        <span class="tag">{{ cat }}</span>
        {% endfor %}
      </div>
      {% endif %}

      {% if post.excerpt %}
      <p class="post-excerpt">{{ post.excerpt | markdownify | strip_html | strip_newlines | truncate: 90 }}</p>
      {% endif %}

      <div class="post-card-meta">
        <span class="post-date">{{ post.date | date: "%Y-%m-%d" }}</span>
        {% if post.encrypted %}<span class="badge">🔒 加密</span>{% endif %}
      </div>
    </a>
  </li>
  {% endfor %}
</ul>
