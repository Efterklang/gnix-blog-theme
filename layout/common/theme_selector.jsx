const { Component, cacheComponent } = require("../../include/util/common");

const themes = [
  { name: "🖥️ SYSTEM", value: "system" },
  { name: "🌻 LATTE", value: "latte" },
  { name: "🦭 NORD", value: "nord" },
  { name: "🐻‍❄️ NORD NIGHT", value: "nord_night" },
  { name: "🌹 ROSE PINE", value: "rose_pine" },
  { name: "🌿 MOCHA", value: "mocha" },
  { name: "🏙 TOKYO NIGHT", value: "tokyo_night" },
];

class ThemeSelector extends Component {
  render() {
    return (
      <div id="theme-selector-modal" onclick="window.handleThemeModalClick?.(event)">
        <div class="theme-selector-backdrop"></div>
        <div class="theme-selector-list">
          {themes.map((theme, index) => (
            <div class="theme-option" data-theme-option={theme.value} data-index={index} onclick={`window.selectThemeOption?.(event, ${index})`}>
              <span class="theme-name">{theme.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

module.exports = cacheComponent(ThemeSelector, "common.themeselector", () => {
  return {};
});
