/**
 * 共享的工具函数和常量
 */
const { Component, Fragment } = require("inferno");
const view = require("../hexo/view");
const crypto = require("node:crypto");
const { createElement } = require("inferno-create-element");

const cache = {};

// 列表日期的英文缩写月（Oct）：与扉页日期一样固定英文，不随站点语言切换
const shortMonthFormatter = new Intl.DateTimeFormat("en", { month: "short" });

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
  // 列表日期统一为「缩写月 + 日」，日补零到两位（Oct 04）：
  // 日期是一列数字，等宽等长才对得齐
  formatMonthDay: (d) => `${shortMonthFormatter.format(d)} ${String(d.getDate()).padStart(2, "0")}`,
  dateFormatters: {
    longMonth: new Intl.DateTimeFormat("en", { month: "long" }),
  },
};
