/**
 * 共享的工具函数和常量
 */
const { Component, Fragment } = require("inferno");
const view = require("../hexo/view");
const crypto = require("node:crypto");
const { createElement } = require("inferno-create-element");

const cache = {};

function computeHash(props) {
  return crypto.createHash("md5").update(JSON.stringify(props)).digest("hex");
}

function cacheComponent(type, prefix, transform) {
  return (props) => {
    const targetProps = transform(props);
    if (targetProps === null || typeof targetProps !== "object") {
      return null;
    }
    const cacheId = `${prefix}-${computeHash(targetProps)}`;
    if (!cache[cacheId]) {
      cache[cacheId] = createElement(type, targetProps);
    }
    return cache[cacheId];
  };
}

function lazy_load_css(href) {
  script_str = `var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '${href}';
  document.getElementsByTagName('head')[0].appendChild(link);`;
  return script_str;
}

module.exports = {
  // 导出常用的依赖
  Component,
  Fragment,
  view,
  lazy_load_css,
  cacheComponent,

  // 通用的组件加载函数
  loadComponent: (componentPath, fallback = null) => {
    try {
      const Widget = view.require(componentPath);
      return Widget.Cacheable ? Widget.Cacheable : Widget;
    } catch (_) {
      return fallback;
    }
  },
};
