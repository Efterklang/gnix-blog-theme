const { Component, cacheComponent } = require("../../include/util/common");
const { THEME_OPTIONS } = require("../../include/util/theme");

class ThemeSelector extends Component {
  render() {
    return (
      <div id="theme-selector-popover" popover="auto" tabindex="-1">
        <div
          class="theme-selector-list"
          role="listbox"
          aria-label="Select theme"
        >
          {THEME_OPTIONS.map((theme, index) => (
            <button
              class="theme-option"
              type="submit"
              role="option"
              data-theme-option={theme.value}
              data-index={index}
              onclick={`window.selectThemeOption?.(${index})`}
            >
              {theme.label}
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
