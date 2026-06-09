import { Link } from 'react-router-dom';
import { ArrowRight, Clapperboard, Gamepad2, ImageIcon, Palette, ScanSearch } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { copy } from '@/data/appData';
import { useAppStore } from '@/store/appStore';

const quickRoutes = [
  { to: '/image', key: 'image', icon: ImageIcon },
  { to: '/video', key: 'video', icon: Clapperboard },
  { to: '/color', key: 'color', icon: Palette },
  { to: '/contrast', key: 'contrast', icon: ScanSearch },
  { to: '/games', key: 'games', icon: Gamepad2 },
] as const;

const awarenessRows = {
  zh: [
    ['红色盲', '1%-1.3%', '0.02%'],
    ['绿色盲', '1%-1.3%', '0.01%'],
    ['蓝色盲', '0.001%', '0.03%'],
    ['红色弱', '1.3%', '0.02%'],
    ['绿色弱', '5%', '0.35%'],
    ['蓝色弱', '0.0001%', '0.0001%'],
  ],
  en: [
    ['Protanopia', '1%-1.3%', '0.02%'],
    ['Deuteranopia', '1%-1.3%', '0.01%'],
    ['Tritanopia', '0.001%', '0.03%'],
    ['Protanomaly', '1.3%', '0.02%'],
    ['Deuteranomaly', '5%', '0.35%'],
    ['Tritanomaly', '0.0001%', '0.0001%'],
  ],
} as const;

export default function Home() {
  const language = useAppStore((state) => state.language);
  const text = copy[language];
  const awarenessContent =
    language === 'zh'
      ? {
          title: '关注色觉障碍者',
          intro:
            '世界上大约有 8% 的男性人口拥有某种形式的色盲，女性约 0.5%，也就是说，在10个人中可能就有1个有色觉缺陷者。',
          statText:
            '人眼球内的视锥细胞大致可分为 3 组，共计 6-7 百万个，用来感知不同波长的可见光，分别对应黄绿色（L 细胞）、绿色（M 细胞）和蓝紫色（S 细胞）。这些视锥细胞们对不同颜色的响应，辅助我们的大脑描绘出眼前五彩缤纷的世界。色盲就是某一种或一种以上的锥细胞出现了问题，从而使患者能感应到的颜色少了一些。',
          headers: ['色盲类型', '男性占比', '女性占比'],
        }
      : {
          title: 'Attention To Color Vision Deficiency',
          intro:
            'Around 8% of men and about 0.5% of women worldwide live with some form of color vision deficiency — roughly 1 in 10 people may be affected.',
          statText:
            'The human eye contains roughly 6 to 7 million cone cells, commonly grouped into three types for long, medium, and short wavelengths. When one or more cone types do not function normally, the range of colors a person can perceive becomes reduced.',
          headers: ['Type', 'Male', 'Female'],
        };

  const bslImageUrl = new URL('../../assets/img/bsl.png', import.meta.url).href;
  const rec01ImageUrl = new URL('../../assets/img/01.png', import.meta.url).href;
  const rec02ImageUrl = new URL('../../assets/img/02.png', import.meta.url).href;
  const rec03ImageUrl = new URL('../../assets/img/03.png', import.meta.url).href;
  const rec04ImageUrl = new URL('../../assets/img/04.png', import.meta.url).href;
  const rec05ImageUrl = new URL('../../assets/img/05.png', import.meta.url).href;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Overview" title={text.heroTitle} body={text.heroBody} aside={text.heroTip} />

      <section className="theme-card bg-transparent p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="theme-kicker">Route Map</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-stone-950">{text.home.quickTitle}</h2>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-5">
          {quickRoutes.map(({ to, key, icon: Icon }, index) => (
            <Link
              key={to}
              to={to}
              className="group border theme-card-border bg-transparent p-5 transition hover:-translate-y-0.5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-none bg-[#f4efe7] text-[#d6643e]">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-stone-900">{text.home.cards[index]?.title}</h3>
              <p className="mt-3 text-sm leading-7 text-stone-600">{text.home.cards[index]?.body}</p>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-stone-900">
                <span>{language === 'zh' ? '打开' : 'Open'}</span>
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="theme-card bg-transparent p-6">
        <p className="theme-kicker">COLORBLIND</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-stone-950">{awarenessContent.title}</h2>
        <p className="mt-4 text-sm leading-8 text-stone-600">{awarenessContent.intro}</p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b theme-card-border">
                {awarenessContent.headers.map((header) => (
                  <th key={header} className="px-4 py-3 text-sm font-semibold text-stone-900">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {awarenessRows[language].map(([type, male, female]) => (
                <tr key={type} className="border-b theme-card-border">
                  <td className="px-4 py-3 text-sm text-stone-700">{type}</td>
                  <td className="px-4 py-3 text-sm text-stone-700">{male}</td>
                  <td className="px-4 py-3 text-sm text-stone-700">{female}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-sm leading-8 text-stone-600">{awarenessContent.statText}</p>

        <div className="mt-6 flex justify-center">
          <img src={bslImageUrl} alt="Color vision illustration" className="max-w-full rounded-none" />
        </div>
      </section>

      <section className="theme-card bg-transparent p-6">
        <p className="theme-kicker">DESIGN SUGGESTIONS</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-stone-950">
          {language === 'zh' ? '无障碍设计建议' : 'Accessibility Design Recommendations'}
        </h2>
        <div className="mt-6 space-y-8">
          {(language === 'zh'
            ? [
                {
                  title: '1. 工具模拟检查',
                  body: '模拟查看不同视觉缺陷的用户看到的实际效果，合理利用当前平台工具，检验设计方案的可行性',
                },
                {
                  title: '2. 颜色与图形结合',
                  body: '通过图标/图形+颜色表达，在设计中应尽量避免单独使用颜色来表示特定的意义，尝试在颜色基础上叠加形状或图标的形式',
                },
                {
                  title: '3. 颜色与文字结合',
                  body: '通过颜色+文本表达，尽量避免仅用图片素材表达类型，当无法正确分辨颜色时通过文字说明帮助色盲用户能顺利完成操作',
                },
                {
                  title: '4. 使用安全色谱',
                  body: '避免使用低饱和度和低明度的配色，使用尽量少的颜色搭配，配色时，避免使用红&绿、绿&棕、蓝&紫、蓝&绿等对于色盲用户来说难以区分的配色组合',
                },
                {
                  title: '5. 提供色盲模式',
                  body: '特殊产品要为用户提供色盲模式，这样我们在设计中可以尽情发挥，又能通过色盲模式来保障这小部分群体使用体验',
                },
              ]
            : [
                {
                  title: '1. Simulation Tools Check',
                  body: 'Make proper use of current platform tools to verify the feasibility of your design solution.',
                },
                {
                  title: '2. Combine Color with Shape',
                  body: 'Avoid relying solely on color to convey meaning in designs. Try to combine shapes or icons with color for clarity.',
                },
                {
                  title: '3. Combine Color with Text',
                  body: 'Provide text-based auxiliary descriptions so users who cannot distinguish colors can still complete their tasks through text cues.',
                },
                {
                  title: '4. Use a Safe Color Palette',
                  body: 'Avoid low-saturation and low-brightness color combinations. Use fewer color pairs and avoid combinations that are hard to distinguish for color-vision users, such as red & green, green & brown, blue & purple, blue & green.',
                },
                {
                  title: '5. Provide a Color-Blind Mode',
                  body: 'Offer multiple modes to users — alongside the normal design, support a color-blind mode or even a customizable mode. This way designers can explore freely without being restricted to safe colors, while still ensuring this small group can use the product without barriers through the color-blind mode.',
                },
              ]
          ).map((item) => {
            let imgSrc: string | undefined;
            if (item.title.startsWith('1.')) imgSrc = rec01ImageUrl;
            else if (item.title.startsWith('2.')) imgSrc = rec02ImageUrl;
            else if (item.title.startsWith('3.')) imgSrc = rec03ImageUrl;
            else if (item.title.startsWith('4.')) imgSrc = rec04ImageUrl;
            else if (item.title.startsWith('5.')) imgSrc = rec05ImageUrl;
            return (
              <div key={item.title} className="space-y-3">
                <h3 className="text-xl font-semibold text-stone-900">{item.title}</h3>
                <p className="text-sm leading-8 text-stone-600">{item.body}</p>
                {imgSrc && (
                  <div className="mt-2 flex justify-center">
                    <img src={imgSrc} alt="" className="max-w-full rounded-none" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
