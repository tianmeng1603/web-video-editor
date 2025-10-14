/**
 * 字体管理器 - 基于本地字体文件
 * 字体文件存放在: public/fonts/
 * 字体配置文件: src/mock/fontConfig.json
 */

export interface FontVariant {
  weight: string;
  style: string;
  file: string;
}

export interface FontFamily {
  family: string;
  displayName: string;
  type?: 'variable' | 'static';
  variants: FontVariant[];
}

export interface FontConfig {
  fonts: FontFamily[];
}

class FontManager {
  private fonts: FontFamily[] = [];
  private loadedFonts: Set<string> = new Set();
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const mockData = await import('../../../mock/fontConfig.json');
      const config = mockData.default as FontConfig;
      
      this.fonts = config.fonts;
      console.log('✅ 字体配置加载完成:', this.fonts.length, '个字体家族');
      
      this.isInitialized = true;
      await this.loadAllFonts();
    } catch (error) {
      console.error('❌ 字体配置加载失败:', error);
      throw error;
    }
  }

  private async loadAllFonts(): Promise<void> {
    const loadPromises: Promise<void>[] = [];

    for (const fontFamily of this.fonts) {
      for (const variant of fontFamily.variants) {
        loadPromises.push(this.loadFontVariant(fontFamily.family, variant));
      }
    }

    await Promise.all(loadPromises);
    console.log('✅ 所有字体加载完成');
  }

  private async loadFontVariant(family: string, variant: FontVariant): Promise<void> {
    const fontKey = `${family}-${variant.weight}-${variant.style}`;
    
    if (this.loadedFonts.has(fontKey)) {
      return;
    }

    try {
      const fontUrl = `/fonts/${variant.file}`;
      const fontFace = new FontFace(family, `url(${fontUrl})`, {
        weight: variant.weight,
        style: variant.style,
      });

      const loadedFace = await fontFace.load();
      document.fonts.add(loadedFace);
      
      this.loadedFonts.add(fontKey);
      console.log(`✅ 字体加载成功: ${family} ${variant.weight} ${variant.style}`);
    } catch (error) {
      console.error(`❌ 字体加载失败: ${family} ${variant.weight}`, error);
    }
  }

  getFontFamilies(): FontFamily[] {
    return this.fonts;
  }

  getFontWeights(family: string): string[] {
    const fontFamily = this.fonts.find(f => f.family === family);
    if (!fontFamily) {
      return ['400'];
    }

    const weights = fontFamily.variants.map(v => {
      if (v.weight.includes('-')) {
        return ['100', '200', '300', '400', '500', '600', '700', '800', '900'];
      }
      return [v.weight];
    }).flat();

    return Array.from(new Set(weights)).sort((a, b) => parseInt(a) - parseInt(b));
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

export const fontManager = new FontManager();
