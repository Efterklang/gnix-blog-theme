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

  // dev 热更新用：缓存元素引用着旧组件类，清 require 缓存时须一并清空
  clearComponentCache: () => {
    for (const key of Object.keys(cache)) {
      delete cache[key];
    }
  },

  // 通用的组件加载函数
  loadComponent: (componentPath, fallback = null) => {
    try {
      const Widget = view.require(componentPath);
      return Widget.Cacheable ? Widget.Cacheable : Widget;
    } catch (_) {
      return fallback;
    }
  },

  handleWidgetError: (name) => {
    console.warn(`[gnix-theme] Failed to load widget: ${name}`);
  },

  isValidDate: (val) => val instanceof Date && !Number.isNaN(val.getTime()),
  parseISO: (str) => new Date(str),
  // 列表日期统一为纯数字 mm.dd（05.13）：数据注脚的最低调形态，
  // 与季节标签、年份轴的数字语汇一致，也没有大小写强调问题
  formatMonthDay: (d) => {
    const pad2 = (n) => String(n).padStart(2, "0");
    return `${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`;
  },
  dateFormatters: {
    longMonth: new Intl.DateTimeFormat("en", { month: "long" }),
  },
};
