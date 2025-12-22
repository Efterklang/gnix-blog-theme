/**
 * 共享的工具函数和常量
 */
const { Component, Fragment } = require("inferno");
const view = require("../hexo/view");
const { cacheComponent } = require("../../util/cache");

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
