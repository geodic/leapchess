import {
	defineConfig,
	presetAttributify,
	presetUno,
	presetWind,
	presetWebFonts,
	presetTypography,
	presetIcons,
	transformerAttributifyJsx
} from 'unocss';
import extractorSvelte from '@unocss/extractor-svelte';

export default defineConfig({
	extractors: [extractorSvelte()],
	presets: [
		presetUno(),
		presetAttributify(),
		presetWind(),
		presetWebFonts({
			provider: 'bunny',
			fonts: {
				base: 'Inter:400,500,600,700,800,900'
			}
		}),
		presetTypography(),
		presetIcons()
	],
	transformers: [transformerAttributifyJsx()],
	theme: {
		colors: {
			primary: '#6259E3',
			text: '#050505',
			bg: '#F7F7F7'
		}
	},
	preflights: [
		{
			getCSS: ({ theme }) => {
				const t = theme as any;

				return `
                    body {
                        --c-primary: ${t.colors.primary};
                        --c-text: ${t.colors.text};
                        --c-bg: ${t.colors.bg};
                    }
                    html {
                        scroll-behavior: smooth;
                        height: 100%;
                    }
                `;
			}
		}
	]
});
