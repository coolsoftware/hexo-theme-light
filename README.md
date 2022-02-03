# Light

A simple theme for [Hexo].

It has been forked from https://github.com/hexojs/hexo-theme-light

For basic installation and configuration instructions please refer to original repository.

## New Widgets

3 widgets has been added: `archive`, `favoriteposts`, `githublink`. You can turn them on and configure in theme config:

``` yaml
widgets:
- archive
- favoriteposts
- githublink

githublink: https://github.com/coolsoftware/

favorite_posts:
-
  name: Useful Links
  url: tags/useful-links/
```

## Title Image

You can use image in the blog title. Placee your image file (e.g, `title-image.png`) into `source/images` folder and add to `_config.yml`:

``` yaml  
title:
  image: images/title-image.png
```

## Archives Navigation

Blog archive navigation menu has been added. You can choose year and month:

![blog-archive-navigation](https://user-images.githubusercontent.com/1533483/152324256-978c2cbe-05e8-480c-8a34-75107d5125f4.png)

