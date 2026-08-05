/**
 * Side Note Custom Element
 *
 * Usage:
 * <side-note>
 *   Extra context that should sit in the article margin on wide screens.
 * </side-note>
 */

let styleSheetInjected = false;
let layoutFrame = null;
let layoutEventsBound = false;

const boundImages = new WeakSet();
const SIDE_NOTE_MEDIA = "(min-width: 1280px)";

const STYLES = `
  side-note {
    display: block;
    margin: 1.5rem 0;
    padding: 0.4rem 0 0.4rem 1rem;
    color: var(--subtext0);
    font-size: 0.875em;
    line-height: 1.55;
    border-left: 2px solid var(--surface1);
  }

  side-note > :first-child {
    margin-top: 0;
  }

  side-note > :last-child {
    margin-bottom: 0;
  }

  @media screen and (min-width: 1280px) {
    article.article > .content {
      overflow: visible;
      display: flow-root;
    }

    article.article > .content > side-note {
      float: right;
      clear: right;
      box-sizing: border-box;
      width: 11rem;
      margin: 0 -12.5rem 1rem 1.5rem;
      padding: 0 0 0 0.875rem;
      font-size: 0.8em;
    }

    article.article > .content.is-side-note-layout {
      position: relative;
    }

    article.article > .content.is-side-note-layout > side-note {
      float: none;
      clear: none;
      position: absolute;
      top: var(--side-note-top, 0);
      right: -12.5rem;
      margin: 0;
    }
  }
`;

function injectStyles() {
  if (styleSheetInjected) return;

  const styleEl = document.createElement("style");
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
  styleSheetInjected = true;
}

function getArticleContentBlocks() {
  return document.querySelectorAll("article.article > .content");
}

function getSideNotes(content) {
  return Array.from(content.children).filter((child) => child.tagName === "SIDE-NOTE");
}

function resetSideNoteLayout(content, sideNotes = getSideNotes(content)) {
  content.classList.remove("is-side-note-layout");
  content.style.removeProperty("min-height");
  sideNotes.forEach((sideNote) => {
    sideNote.style.removeProperty("--side-note-top");
  });
}

function getSideNoteAnchor(sideNote) {
  let anchor = sideNote.previousElementSibling;

  while (anchor && anchor.tagName === "SIDE-NOTE") {
    anchor = anchor.previousElementSibling;
  }

  return anchor || sideNote;
}

function getContentFlowBottom(content, sideNotes) {
  const sideNoteSet = new Set(sideNotes);
  let bottom = 0;

  Array.from(content.children).forEach((child) => {
    if (sideNoteSet.has(child)) return;
    bottom = Math.max(bottom, child.offsetTop + child.offsetHeight);
  });

  return bottom;
}

function layoutSideNotes() {
  const isWide = window.matchMedia(SIDE_NOTE_MEDIA).matches;

  getArticleContentBlocks().forEach((content) => {
    const sideNotes = getSideNotes(content);
    if (sideNotes.length === 0) return;

    if (!isWide) {
      resetSideNoteLayout(content, sideNotes);
      return;
    }

    content.style.removeProperty("min-height");
    sideNotes.forEach((sideNote) => {
      sideNote.style.removeProperty("--side-note-top");
    });
    content.classList.add("is-side-note-layout");

    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const gap = rootFontSize;
    let nextTop = 0;

    sideNotes.forEach((sideNote) => {
      const anchor = getSideNoteAnchor(sideNote);
      const targetTop = anchor.offsetTop;
      const top = Math.max(targetTop, nextTop);

      sideNote.style.setProperty("--side-note-top", `${Math.round(top)}px`);
      nextTop = top + sideNote.offsetHeight + gap;
    });

    const flowBottom = getContentFlowBottom(content, sideNotes);
    const sideNoteBottom = Math.max(0, nextTop - gap);
    content.style.minHeight = `${Math.ceil(Math.max(flowBottom, sideNoteBottom))}px`;
  });
}

function scheduleSideNoteLayout() {
  if (layoutFrame !== null) return;

  layoutFrame = window.requestAnimationFrame(() => {
    layoutFrame = null;
    layoutSideNotes();
  });
}

function bindImages(content) {
  if (!content) return;

  content.querySelectorAll("img").forEach((img) => {
    if (boundImages.has(img)) return;
    boundImages.add(img);
    img.addEventListener("load", scheduleSideNoteLayout);
    img.addEventListener("error", scheduleSideNoteLayout);
  });
}

function bindLayoutEvents() {
  if (layoutEventsBound) return;
  layoutEventsBound = true;

  window.addEventListener("resize", scheduleSideNoteLayout, { passive: true });
  window.addEventListener("gnix:article-font-settings-change", scheduleSideNoteLayout);

  if (document.fonts?.ready) {
    document.fonts.ready.then(scheduleSideNoteLayout).catch(() => {});
  }
}

class SideNote extends HTMLElement {
  connectedCallback() {
    injectStyles();
    this.unwrapMarkdownParagraph();
    bindLayoutEvents();
    bindImages(this.closest(".content"));
    scheduleSideNoteLayout();
  }

  unwrapMarkdownParagraph() {
    const parent = this.parentElement;
    if (parent?.tagName !== "P") return;

    const onlyContainsThisSideNote = Array.from(parent.childNodes).every((node) => {
      return node === this || (node.nodeType === Node.TEXT_NODE && node.textContent.trim() === "");
    });
    if (!onlyContainsThisSideNote) return;

    parent.parentNode.insertBefore(this, parent);
    parent.remove();
  }
}

if (!customElements.get("side-note")) {
  customElements.define("side-note", SideNote);
}

export { SideNote };
