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
      <div id="theme-selector-popover" popover="auto" tabindex="-1">
        <div class="theme-selector-list" role="listbox" aria-label="Select theme">
          {themes.map((theme, index) => (
            <button class="theme-option" type="submit" data-theme-option={theme.value} data-index={index} onclick={`window.selectThemeOption?.(${index})`}>
              {theme.name}
            </button>
          ))}
        </div>
      </div>
    );
  }
}

module.exports = cacheComponent(ThemeSelector, "common.themeselector", () => {
  return {};
});
