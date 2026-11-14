const { Component, cacheComponent } = require("../../include/util/common");

const STORAGE_KEY = "gnix:cookie-consent";
const LEGACY_STORAGE_KEY = "cookieconsent_status";

const COOKIE_CONSENT_STYLE = `
.gnix-cookie-consent {
  position: fixed;
  bottom: max(1rem, env(safe-area-inset-bottom));
  left: max(1rem, env(safe-area-inset-left));
  z-index: 140;
  display: flex;
  align-items: baseline;
  gap: 1.5rem;
  max-width: calc(100vw - 2rem);
  padding: 0.875rem 1rem;
  background: var(--base);
  border-top: 1px solid var(--title-text-color);
  color: var(--sub-text-color);
  font: 0.8125rem/1.5 var(--font-sans-serif);
  opacity: 0;
  transition: opacity 0.18s ease;
}

.gnix-cookie-consent.is-visible { opacity: 1; }
.gnix-cookie-consent.is-hiding { opacity: 0; pointer-events: none; }
.gnix-cookie-consent.is-static { position: static; margin: 1rem auto; }

.gnix-cookie-consent__message { margin: 0; }

.gnix-cookie-consent__link {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.gnix-cookie-consent__button {
  flex: none;
  padding: 0;
  border: 0;
  background: none;
  color: var(--title-text-color);
  cursor: pointer;
  font: 600 0.75rem/1.5 var(--font-mono, monospace);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.gnix-cookie-consent__button:hover { text-decoration: underline; text-underline-offset: 3px; }
.gnix-cookie-consent__button:focus-visible { outline: 1px solid var(--title-text-color); outline-offset: 3px; }

@media (max-width: 768px) {
  /* 手机端导航条固定在屏幕底部，横幅抬到它上方 */
  .gnix-cookie-consent {
    bottom: calc(62px + env(safe-area-inset-bottom) + 0.75rem);
    right: max(1rem, env(safe-area-inset-right));
    justify-content: space-between;
  }
}
`;

function stringifyScriptData(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

class CookieConsent extends Component {
  render() {
    const { head } = this.props;

    if (head) {
      return <style id="gnix-cookie-consent-style" dangerouslySetInnerHTML={{ __html: COOKIE_CONSENT_STYLE }} />;
    }

    const options = {
      storageKey: STORAGE_KEY,
      legacyStorageKey: LEGACY_STORAGE_KEY,
      policyLink: this.props.policyLink,
      isStatic: this.props.isStatic,
    };

    return (
      <script
        dangerouslySetInnerHTML={{
          __html: `
          (function() {
            var options = ${stringifyScriptData(options)};
            var rootSelector = "[data-gnix-cookie-consent]";

            function readStoredConsent() {
              try {
                var stored = window.localStorage && (localStorage.getItem(options.storageKey) || localStorage.getItem(options.legacyStorageKey));
                if (stored) return stored;
              } catch (_) {}

              var match = document.cookie.match(/(?:^|; )cookieconsent_status=([^;]+)/);
              return match ? decodeURIComponent(match[1]) : "";
            }

            function writeConsent(status) {
              try {
                localStorage.setItem(options.storageKey, status);
                localStorage.setItem(options.legacyStorageKey, status);
              } catch (_) {}

              document.cookie = "cookieconsent_status=" + encodeURIComponent(status) + "; path=/; max-age=31536000; SameSite=Lax";
              window.gnixCookieConsent = { status: status };

              try {
                window.dispatchEvent(new CustomEvent("gnix:cookie-consent", { detail: { status: status } }));
              } catch (_) {}
            }

            function createButton(label, action) {
              var button = document.createElement("button");
              button.type = "button";
              button.className = "gnix-cookie-consent__button";
              button.textContent = label;
              button.setAttribute("data-cookie-consent-action", action);
              return button;
            }

            function closeConsent(root, status) {
              writeConsent(status);
              root.classList.remove("is-visible");
              root.classList.add("is-hiding");
              window.setTimeout(function() {
                if (root.parentNode) root.parentNode.removeChild(root);
              }, 180);
            }

            function initCookieConsent() {
              if (readStoredConsent() || document.querySelector(rootSelector)) return;

              var root = document.createElement("aside");
              root.className = "gnix-cookie-consent" + (options.isStatic ? " is-static" : "");
              root.setAttribute("data-gnix-cookie-consent", "");
              root.setAttribute("role", "dialog");
              root.setAttribute("aria-live", "polite");
              root.setAttribute("aria-label", "Cookie notice");

              var message = document.createElement("p");
              message.className = "gnix-cookie-consent__message";
              message.appendChild(document.createTextNode("This site uses cookies."));

              if (options.policyLink) {
                var link = document.createElement("a");
                link.className = "gnix-cookie-consent__link";
                link.href = options.policyLink;
                link.target = "_blank";
                link.rel = "noopener";
                link.textContent = "Learn more";
                message.appendChild(document.createTextNode(" "));
                message.appendChild(link);
              }

              // 还没有禁用 Cookie 的实现，所以只给一个 Accept
              var accept = createButton("Accept", "allow");
              accept.addEventListener("click", function() {
                closeConsent(root, "allow");
              });

              root.appendChild(message);
              root.appendChild(accept);
              document.body.appendChild(root);
              window.requestAnimationFrame(function() {
                root.classList.add("is-visible");
              });
            }

            function runWhenActivated(callback) {
              (window.__gnixPrerender?.runWhenActivated || function(fn) { fn(); })(callback);
            }

            if (document.readyState === "loading") {
              document.addEventListener("DOMContentLoaded", function() {
                runWhenActivated(initCookieConsent);
              }, { once: true });
            } else {
              runWhenActivated(initCookieConsent);
            }
          })();
        `,
        }}
      />
    );
  }
}

CookieConsent.Cacheable = cacheComponent(CookieConsent, "plugin.cookieconsent", (props) => {
  const { head, plugin } = props;

  return {
    head,
    policyLink: plugin.policyLink || "https://www.cookiesandyou.com/",
    isStatic: plugin.static || false,
  };
});

module.exports = CookieConsent;
