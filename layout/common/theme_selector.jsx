const { Component, cacheComponent } = require("../../include/util/common");
class ThemeSelector extends Component {
  render() {
    return (
      <div
        id="theme-selector-modal"
        onclick="window.handleThemeModalClick?.(event)"
      >
        <div class="theme-selector-backdrop"></div>
        <div class="theme-selector-content">
          <div class="theme-selector-header">
            <h3 class="theme-selector-title">Choose Theme</h3>
            <div class="theme-selector-hint">Shortcuts: ⌘ ⇧ P</div>
            <div class="theme-selector-hint">
              ↑↓ Navigate • 󰌑 Confirm • 󱊷 Close
            </div>
          </div>
          <div class="theme-selector-list">
            <div
              class="theme-option"
              data-theme-option="system"
              data-index="0"
              onclick="window.selectThemeOption?.(event, 0)"
            >
              <span class="theme-name">🖥️ System</span>
              <span class="theme-check">
                <iconify-icon icon="mingcute:check-fill"></iconify-icon>
              </span>
            </div>
            <div
              class="theme-option"
              data-theme-option="latte"
              data-index="1"
              onclick="window.selectThemeOption?.(event, 1)"
            >
              <span class="theme-name">🌻 Latte</span>
              <span class="theme-check">
                <iconify-icon icon="mingcute:check-fill"></iconify-icon>
              </span>
            </div>
            <div
              class="theme-option"
              data-theme-option="nord"
              data-index="2"
              onclick="window.selectThemeOption?.(event, 2)"
            >
              <span class="theme-name">🦭 Nord</span>
              <span class="theme-check">
                <iconify-icon icon="mingcute:check-fill"></iconify-icon>
              </span>
            </div>
            <div
              class="theme-option"
              data-theme-option="nord_night"
              data-index="3"
              onclick="window.selectThemeOption?.(event, 3)"
            >
              <span class="theme-name">🐻‍❄️ Nord Night</span>
              <span class="theme-check">
                <iconify-icon icon="mingcute:check-fill"></iconify-icon>
              </span>
            </div>
            <div
              class="theme-option"
              data-theme-option="rose_pine"
              data-index="4"
              onclick="window.selectThemeOption?.(event, 4)"
            >
              <span class="theme-name">🌹 Rose Pine</span>
              <span class="theme-check">
                <iconify-icon icon="mingcute:check-fill"></iconify-icon>
              </span>
            </div>
            <div
              class="theme-option"
              data-theme-option="mocha"
              data-index="5"
              onclick="window.selectThemeOption?.(event, 5)"
            >
              <span class="theme-name">🌿 Mocha</span>
              <span class="theme-check">
                <iconify-icon icon="mingcute:check-fill"></iconify-icon>
              </span>
            </div>
            <div
              class="theme-option"
              data-theme-option="tokyo_night"
              data-index="6"
              onclick="window.selectThemeOption?.(event, 6)"
            >
              <span class="theme-name">🏙 Tokyo Night</span>
              <span class="theme-check">
                <iconify-icon icon="mingcute:check-fill"></iconify-icon>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

module.exports = cacheComponent(ThemeSelector, "common.themeselector", () => {
  return {};
});
