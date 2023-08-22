import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import checker from 'vite-plugin-checker'
import vueJsx from '@vitejs/plugin-vue-jsx'
import legacy from '@vitejs/plugin-legacy'
// import conditionalCompile from 'vite-plugin-conditional-compiler'
import { viteMockServe } from 'vite-plugin-mock'
import components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import autoImport from 'unplugin-auto-import/vite'
import WindiCss from 'vite-plugin-windicss'
import emitReflectMetadata from './build/plugins/emit-reflect-metadata'

// @ts-ignore
import * as AntdComponents from './src/components/antd'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    emitReflectMetadata({ include: 'src/**/*.ts', disableCache: process.env.NODE_ENV !== 'development' }),
    checker({
      overlay: { initialIsOpen: false },
      eslint: {
        lintCommand:
          'eslint --cache --max-warnings 0 --cache-location "node_modules/.cache/eslint/" "src/**/*.{vue,ts,tsx,js}"'
      }
    }),
    vueJsx(),
    legacy({
      targets: ['defaults', 'not IE 11']
    }),
    // not necessary for now
    // conditionalCompile(),
    viteMockServe({
      mockPath: 'src/mock',
      enable: true,
      logger: true,
      watchFiles: true,
      ignore: /(utils|data)\/.*/
    }),
    components({
      resolvers: [AntDesignVueResolver()],
      dts: 'src/components.d.ts',
      dirs: undefined,
      types: [
        { from: 'ant-design-vue', names: Object.keys(AntdComponents) },
        { from: '@form-create/ant-design-vue', names: ['form-create'] }
      ]
    }),
    autoImport({
      eslintrc: { enabled: false, filepath: '.eslintrc-auto-import.json' },
      include: [
        /\.[tj]sx?$/, // .ts, .tsx, .js, .jsx
        /\.vue$/,
        /\.vue\?vue/,
        /\.md$/ // .md
      ],
      imports: ['vue', 'vue-router'],
      dts: 'src/auto-imports.d.ts'
    }),
    WindiCss()
  ],
  resolve: {
    alias: [{ find: '@', replacement: '/src' }]
  },
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true
      }
    }
  }
})
