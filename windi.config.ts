import { defineConfig } from 'windicss/helpers'

export default defineConfig({
  preflight: false,
  prefixer: false,
  darkMode: 'class',
  safelist: '',
  theme: {
    extend: {
      fontSize: {},
      spacing: {},
      borderRadius: {},
      colors: {},
      backgroundImage: {}
    }
  },
  extract: {
    exclude: ['node_modules', '.git', 'dist']
  },
  corePlugins: {
    container: false
  },
  alias: {},
  plugins: []
})
