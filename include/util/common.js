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

module.exports = {
  // 导出常用的依赖
  Component,
  Fragment,
  view,
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

  isValidDate: (val) => val instanceof Date && !Number.isNaN(val.getTime()),
  parseISO: (str) => new Date(str),
  dateFormatters: {
    shortDay: new Intl.DateTimeFormat("en", { month: "short", day: "2-digit" }),
    longMonth: new Intl.DateTimeFormat("en", { month: "long" }),
  },
};
