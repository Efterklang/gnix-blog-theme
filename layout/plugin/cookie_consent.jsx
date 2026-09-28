const { Component, cacheComponent } = require("../../include/util/common");

const STORAGE_KEY = "gnix:cookie-consent";
const LEGACY_STORAGE_KEY = "cookieconsent_status";

const COOKIE_CONSENT_STYLE = `
.gnix-cookie-consent {
  --cookie-consent-x: 0;
  --cookie-consent-y: 0.5rem;
  position: fixed;
  bottom: max(1rem, env(safe-area-inset-bottom));
  left: max(1rem, env(safe-area-inset-left));
  z-index: 140;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.875rem 1rem;
  width: min(32rem, calc(100vw - 2rem));
  padding: 1rem;
  /* 玻璃卡片：内边距 16px + 按钮圆角 10px → 卡片圆角 26px（同心）；描边高光走 inset 阴影 */
  border: none;
  border-radius: 26px;
  background: var(--glass-fill-strong, var(--mantle));
  color: var(--text);
  box-shadow:
    0 0 0 0.5px var(--glass-edge, transparent),
    inset 0 1px 0 var(--glass-rim-lo, transparent),
    inset 0 0 0 1px var(--glass-rim-mid, transparent),
    var(--glass-shadow-lg, 0 20px 60px -32px rgba(0, 0, 0, 0.58));
  -webkit-backdrop-filter: blur(20px) saturate(var(--glass-saturate, 1.2)) brightness(var(--glass-brightness, 1));
  backdrop-filter: blur(20px) saturate(var(--glass-saturate, 1.2)) brightness(var(--glass-brightness, 1));
  font-family: var(--font-sans-serif);
  line-height: 1.55;
  opacity: 0;
  transform: translate3d(var(--cookie-consent-x), var(--cookie-consent-y), 0);
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.gnix-cookie-consent.is-visible {
  --cookie-consent-y: 0;
  opacity: 1;
}

.gnix-cookie-consent.is-hiding {
  --cookie-consent-y: 0.5rem;
  opacity: 0;
  pointer-events: none;
}

.gnix-cookie-consent.is-static {
  position: static;
  width: min(42rem, calc(100% - 2rem));
  margin: 1rem auto;
}

.gnix-cookie-consent__message {
  min-width: 0;
  margin: 0;
  color: var(--subtext1);
  font-size: 0.9rem;
}

.gnix-cookie-consent__link {
  color: var(--lavender);
  text-decoration: none;
  white-space: nowrap;
}

.gnix-cookie-consent__link:hover {
  text-decoration: underline;
}

.gnix-cookie-consent__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.gnix-cookie-consent__button {
  min-height: 2.25rem;
  padding: 0.55rem 0.9rem;
  border: none;
  border-radius: 10px;
  background: var(--glass-hover, hsl(from var(--surface0) h s l / 0.24));
  box-shadow: inset 0 0 0 0.5px var(--glass-edge, var(--surface0));
  color: var(--text);
  cursor: pointer;
  font: 600 0.78rem/1 var(--font-sans-serif);
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    scale 0.15s ease-out;
}

.gnix-cookie-consent__button:hover {
  background: color-mix(in oklab, var(--text) 13%, transparent);
}

.gnix-cookie-consent__button:active {
  scale: 0.96;
}

.gnix-cookie-consent__button:focus-visible {
  outline: 2px solid var(--lavender);
  outline-offset: 2px;
}

.gnix-cookie-consent__button--primary {
  background: var(--lavender);
  box-shadow: none;
  color: var(--base);
}

.gnix-cookie-consent__button--primary:hover {
  background: var(--mauve);
  color: var(--base);
}

@media (max-width: 640px) {
  .gnix-cookie-consent {
    left: max(0.75rem, env(safe-area-inset-left));
    grid-template-columns: 1fr;
    width: auto;
    padding: 0.875rem;
    --cookie-consent-x: 0;
  }

  .gnix-cookie-consent__actions {
    justify-content: stretch;
  }

  .gnix-cookie-consent__button {
    flex: 1 1 auto;
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

            function createButton(label, action, variant) {
              var button = document.createElement("button");
              button.type = "button";
              button.className = "gnix-cookie-consent__button" + (variant ? " gnix-cookie-consent__button--" + variant : "");
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
              message.appendChild(document.createTextNode("This website uses cookies to improve your experience."));

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

              var actions = document.createElement("div");
              actions.className = "gnix-cookie-consent__actions";
              actions.appendChild(createButton("Decline", "deny"));
              actions.appendChild(createButton("Accept", "allow", "primary"));

              actions.addEventListener("click", function(event) {
                var button = event.target.closest("[data-cookie-consent-action]");
                if (!button) return;
                closeConsent(root, button.getAttribute("data-cookie-consent-action"));
              });

              root.appendChild(message);
              root.appendChild(actions);
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
