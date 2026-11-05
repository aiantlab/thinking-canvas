import type { Edge } from '@xyflow/react'
import { DEFAULT_MODEL, DEFAULT_SIZE } from './models'
import type {
  AspectRatio,
  BaseType,
  CanvasNode,
  DesignDomain,
  LightingPreset,
  ScenePreset,
  StylePreset,
  ToolMode,
  ViewAngle,
  WeatherPreset,
} from './types'

export type TemplateCategory = 'facade' | 'interior' | 'landscape' | 'aerial' | 'plan'

/** Extra feature cards that make each template graph distinct */
export type TemplateFeature =
  | {
      kind: 'styleref'
      note: string
      /** Prefer another template's render as mood board */
      imageUrl?: string
      label?: string
    }
  | {
      kind: 'colorzones'
      active: string
      used: string[]
      label?: string
    }
  | {
      kind: 'inpaint'
      prompt: string
      label?: string
    }
  | {
      kind: 'tool'
      mode: ToolMode
      weather?: WeatherPreset
      prompt?: string
      label?: string
      /** Second upload used as material / object ref for migrate|replace */
      refUrl?: string
      refLabel?: string
    }

export type TemplateDef = {
  id: string
  titleZh: string
  titleEn: string
  blurbZh: string
  blurbEn: string
  category: TemplateCategory
  thumbUrl: string
  sketchUrl: string
  resultUrl: string
  prompt: string
  negative: string
  preset: ScenePreset
  domain: DesignDomain
  baseType: BaseType
  adherence: number
  view: ViewAngle
  style: StylePreset
  lighting: LightingPreset
  weather: WeatherPreset
  aspect: AspectRatio
  materialLock?: boolean
  /** Feature cards wired into the canvas — must differ across templates */
  features: TemplateFeature[]
}

const NEG_FACADE =
  '模糊，低分辨率，畸变，文字水印，人物过多，偏离线稿体量，杂乱构图，卡通感'
const NEG_INTERIOR =
  '杂乱，低清，透视错误，夸张滤镜，文字水印，人物过多，家具漂浮'
const NEG_LAND =
  '荒芜，垃圾，低清，夸张透视，文字水印，人物过多，植物糊成一团'
const NEG_PLAN =
  '模糊，低分辨率，文字水印，偏离平面几何，杂乱标注，卡通感'

export const TEMPLATES: TemplateDef[] = [
  // ── Facade ──────────────────────────────────────────────
  {
    id: 'villa',
    titleZh: '山坡别墅·夜景与细节',
    titleEn: 'Hillside villa · night + detail',
    blurbZh: '金色时光线稿 → 生成 → 夜景转换 + 材质细节增强',
    blurbEn: 'Golden-hour sketch → gen → night convert + detail enhance',
    category: 'facade',
    thumbUrl: '/templates/villa_thumb.webp',
    sketchUrl: '/templates/villa_sketch.webp',
    resultUrl: '/templates/villa_render.webp',
    prompt:
      '山坡现代三层别墅建筑效果图，悬挑白墙体量、竖向木格栅、落地玻璃与无边泳池，金色时光侧光与暖色室内灯光，林间台地草坪。严格保持线稿开窗与体块关系，写实建筑表现，无人，无文字，无水印。',
    negative: NEG_FACADE,
    preset: 'facade',
    domain: 'architecture',
    baseType: 'line',
    adherence: 70,
    view: 'eye',
    style: 'modern',
    lighting: 'golden',
    weather: 'clear',
    aspect: '16:9',
    features: [
      { kind: 'tool', mode: 'night', label: '转夜景' },
      { kind: 'tool', mode: 'detail', label: '细节增强' },
    ],
  },
  {
    id: 'facade_glass',
    titleZh: '玻璃木饰别墅·色块+多视角',
    titleEn: 'Glass-wood villa · zones + multiview',
    blurbZh: '幕墙/木饰色块分区 → 生成 → 正侧鸟瞰三视角',
    blurbEn: 'Glass/wood color zones → gen → elevation/side/bird views',
    category: 'facade',
    thumbUrl: '/templates/facade_glass_thumb.webp',
    sketchUrl: '/templates/facade_glass_sketch.webp',
    resultUrl: '/templates/facade_glass_render.webp',
    prompt:
      '当代两层别墅外立面，竖向深色木饰面、黑色框落地玻璃幕墙、白色体量与木甲板露台，蓝调暮光与室内暖光，前景草坪与中心大树。按色块落实幕墙与实墙材质，严格对齐线稿开洞与体块，专业立面表现，无人，无文字，无水印。',
    negative: NEG_FACADE,
    preset: 'facade',
    domain: 'architecture',
    baseType: 'line',
    adherence: 78,
    view: 'corner',
    style: 'modern',
    lighting: 'night',
    weather: 'clear',
    aspect: '16:9',
    features: [
      {
        kind: 'colorzones',
        active: 'glass',
        used: ['glass', 'wall', 'window', 'vegetation'],
        label: '幕墙色块',
      },
      { kind: 'tool', mode: 'multiview', label: '多视角' },
    ],
  },
  {
    id: 'facade_white',
    titleZh: '极白泳池别墅·分区+局部重绘',
    titleEn: 'White pool villa · zones + inpaint',
    blurbZh: '墙/窗色块控形 → 生成 → 局部重绘窗洞与阴影',
    blurbEn: 'Wall/window zones → gen → inpaint reveals & shadows',
    category: 'facade',
    thumbUrl: '/templates/facade_white_thumb.webp',
    sketchUrl: '/templates/facade_white_sketch.webp',
    resultUrl: '/templates/facade_white_render.webp',
    prompt:
      '极简白色别墅外立面与泳池庭院，白墙深色窗框、玻璃栏杆二层阳台、浅灰铺装与碧蓝泳池，晴空日景硬阴影，棕榈点缀。严格保持线稿构图与开窗比例，奢华住宅立面表现，无人，无文字，无水印。',
    negative: NEG_FACADE,
    preset: 'facade',
    domain: 'architecture',
    baseType: 'line',
    adherence: 82,
    view: 'elevation',
    style: 'minimal',
    lighting: 'day',
    weather: 'clear',
    aspect: '16:9',
    materialLock: true,
    features: [
      {
        kind: 'colorzones',
        active: 'wall',
        used: ['wall', 'window', 'door'],
        label: '立面分区',
      },
      {
        kind: 'inpaint',
        prompt: '加深窗洞与挑檐阴影层次，保持白色体量干净，不改开窗位置',
        label: '局部重绘窗洞',
      },
    ],
  },
  {
    id: 'facade_brick',
    titleZh: '砖石郊墅·材质迁移',
    titleEn: 'Brick suburban · material migrate',
    blurbZh: '风格参考 + 砖材质迁移 → 郊区别墅写实表现',
    blurbEn: 'Style ref + brick material migrate → suburban house',
    category: 'facade',
    thumbUrl: '/templates/facade_brick_thumb.webp',
    sketchUrl: '/templates/facade_brick_sketch.webp',
    resultUrl: '/templates/facade_brick_render.webp',
    prompt:
      '北美郊区两层砖石别墅外立面，浅棕多色砖墙、石材拱券车库门、深色坡屋顶、白色窗套与前院草坪，晴朗日景。保持线稿开洞与体量，人文尺度住宅表现，无人，无文字，无水印。',
    negative: NEG_FACADE,
    preset: 'facade',
    domain: 'architecture',
    baseType: 'line',
    adherence: 72,
    view: 'eye',
    style: 'modern',
    lighting: 'day',
    weather: 'clear',
    aspect: '4:3',
    features: [
      {
        kind: 'styleref',
        note: '暖色黏土砖与石材拱券肌理，郊区尺度',
        imageUrl: '/templates/facade_brick_render.webp',
        label: '砖石风格参考',
      },
      {
        kind: 'tool',
        mode: 'materialMigrate',
        prompt: '迁移黏土砖与石材贴面到立面，保留体量与开窗车库比例',
        label: '材质迁移',
        refUrl: '/templates/facade_brick_render.webp',
        refLabel: '砖材质参考',
      },
    ],
  },
  {
    id: 'facade_night',
    titleZh: '塔楼夜景·雨夜多视角',
    titleEn: 'Tower night · rain + multiview',
    blurbZh: '仰视幕墙夜景 → 雨夜天气转换 + 三视角输出',
    blurbEn: 'Upward curtain-wall night → rain weather + three views',
    category: 'facade',
    thumbUrl: '/templates/facade_night_thumb.webp',
    sketchUrl: '/templates/facade_night_sketch.webp',
    resultUrl: '/templates/facade_night_render.webp',
    prompt:
      '都市玻璃塔楼仰视建筑效果图，深色幕墙网格、局部暖黄室内灯光、阴天或暮光天空，街道峡谷透视汇聚。严格保持线稿塔楼轮廓，商业建筑表现，无人，无文字，无水印。',
    negative: NEG_FACADE,
    preset: 'facade',
    domain: 'architecture',
    baseType: 'line',
    adherence: 68,
    view: 'eye',
    style: 'modern',
    lighting: 'night',
    weather: 'clear',
    aspect: '16:9',
    features: [
      { kind: 'tool', mode: 'night', label: '夜景灯光' },
      { kind: 'tool', mode: 'weather', weather: 'rain', label: '转雨夜' },
      { kind: 'tool', mode: 'multiview', label: '多视角' },
    ],
  },

  // ── Interior ────────────────────────────────────────────
  {
    id: 'int_living',
    titleZh: '客厅·软装替换+色块',
    titleEn: 'Living · replace + zones',
    blurbZh: '沙发/地面色块 → 生成 → 软装物体替换',
    blurbEn: 'Sofa/floor zones → gen → soft-furnish object replace',
    category: 'interior',
    thumbUrl: '/templates/int_living_thumb.webp',
    sketchUrl: '/templates/int_living_sketch.webp',
    resultUrl: '/templates/int_living_render.webp',
    prompt:
      '现代都市客厅室内效果图，焦糖色皮革沙发、白色金属框扶手椅、圆形木茶几、人字纹柜与黑白照片墙，落地窗城市远景，午后斜阳。按色块分区落实墙面/地面/沙发材质，保持家具布局与开窗，高端室内表现，无人，无文字，无水印。',
    negative: NEG_INTERIOR,
    preset: 'interior',
    domain: 'interior',
    baseType: 'line',
    adherence: 70,
    view: 'eye',
    style: 'modern',
    lighting: 'day',
    weather: 'clear',
    aspect: '16:9',
    features: [
      {
        kind: 'colorzones',
        active: 'sofa',
        used: ['wall', 'floor', 'sofa', 'curtain', 'window'],
        label: '软装色块',
      },
      {
        kind: 'tool',
        mode: 'replace',
        prompt: '把沙发替换为参考图中的沙发款式与面料，保持房间布局',
        label: '沙发替换',
        refUrl: '/templates/demo_material_render.webp',
        refLabel: '沙发/软装参考',
      },
    ],
  },
  {
    id: 'int_kitchen',
    titleZh: '白石厨房·材质迁移',
    titleEn: 'White-stone kitchen · material migrate',
    blurbZh: '风格参考 + 石材台面迁移 → 开放厨房写实',
    blurbEn: 'Style ref + stone counter migrate → open kitchen',
    category: 'interior',
    thumbUrl: '/templates/int_kitchen_thumb.webp',
    sketchUrl: '/templates/int_kitchen_sketch.webp',
    resultUrl: '/templates/int_kitchen_render.webp',
    prompt:
      '现代开放厨房室内效果图，白色无把手吊柜、灰色台面与背板、大理石岛台与嵌入式灶具，台面摆放橙色珐琅锅与新鲜蔬果，明亮日景。保持线稿柜体布局与岛台位置，室内建筑效果图，无人，无文字，无水印。',
    negative: NEG_INTERIOR,
    preset: 'interior',
    domain: 'interior',
    baseType: 'line',
    adherence: 76,
    view: 'eye',
    style: 'minimal',
    lighting: 'day',
    weather: 'clear',
    aspect: '16:9',
    materialLock: true,
    features: [
      {
        kind: 'styleref',
        note: '白色柜体与大理石岛台质感，干净日光',
        imageUrl: '/templates/int_kitchen_render.webp',
        label: '厨具风格参考',
      },
      {
        kind: 'tool',
        mode: 'materialMigrate',
        prompt: '迁移大理石岛台与灰色台面材质，保留岛台与柜体布局',
        label: '厨具材质迁移',
        refUrl: '/templates/int_kitchen_render.webp',
        refLabel: '石材材质参考',
      },
      { kind: 'tool', mode: 'detail', label: '台面细节增强' },
    ],
  },
  {
    id: 'int_bedroom',
    titleZh: '卧室·风格参考+局部重绘',
    titleEn: 'Bedroom · style + inpaint',
    blurbZh: '氛围风格参考 → 生成 → 床品局部重绘 / 软装替换',
    blurbEn: 'Mood style ref → gen → bedding inpaint / soft replace',
    category: 'interior',
    thumbUrl: '/templates/int_bedroom_thumb.webp',
    sketchUrl: '/templates/int_bedroom_sketch.webp',
    resultUrl: '/templates/int_bedroom_render.webp',
    prompt:
      '现代奢华主卧室内，白色竖向绗缝床头、浅灰床品、炭灰墙面与金色枝形吊灯，落地窗城市天际线，明亮日景。保持床与窗的位置关系，豪华住宅室内表现，无人，无文字，无水印。',
    negative: NEG_INTERIOR,
    preset: 'interior',
    domain: 'interior',
    baseType: 'line',
    adherence: 74,
    view: 'eye',
    style: 'luxury',
    lighting: 'day',
    weather: 'clear',
    aspect: '4:3',
    features: [
      {
        kind: 'styleref',
        note: '中性奢华床品与金色灯具氛围',
        imageUrl: '/templates/int_bedroom_render.webp',
        label: '卧室氛围参考',
      },
      {
        kind: 'inpaint',
        prompt: '提升床品面料质感与褶皱细节，不改床的位置与尺度',
        label: '床品局部重绘',
      },
      {
        kind: 'tool',
        mode: 'replace',
        prompt: '把床头灯具替换为参考图中的款式，保持卧室布局',
        label: '灯具替换',
        refUrl: '/templates/int_living_render.webp',
        refLabel: '灯具参考',
      },
    ],
  },
  {
    id: 'int_lobby',
    titleZh: '挑高起居·分区+夜灯',
    titleEn: 'Living hall · zones + night light',
    blurbZh: '墙地家具色块 → 生成 → 材质迁移 + 夜景灯光',
    blurbEn: 'Wall/floor/furniture zones → gen → material migrate + night',
    category: 'interior',
    thumbUrl: '/templates/int_lobby_thumb.webp',
    sketchUrl: '/templates/int_lobby_sketch.webp',
    resultUrl: '/templates/int_lobby_render.webp',
    prompt:
      '明亮现代起居室室内效果图，炭灰布艺沙发、实木茶几、棕色皮革坐墩与弧形落地灯，落地木框窗外草坪绿化，暖阳斜照。按色块落实地面与墙面材质，保持家具布局，住宅室内表现，无人，无文字，无水印。',
    negative: NEG_INTERIOR,
    preset: 'interior',
    domain: 'interior',
    baseType: 'line',
    adherence: 68,
    view: 'eye',
    style: 'modern',
    lighting: 'day',
    weather: 'clear',
    aspect: '16:9',
    features: [
      {
        kind: 'colorzones',
        active: 'floor',
        used: ['wall', 'floor', 'ceiling', 'furniture', 'door'],
        label: '起居分区',
      },
      {
        kind: 'tool',
        mode: 'materialMigrate',
        prompt: '迁移木地板与墙面涂料质感，保留沙发与窗位布局',
        label: '石木材质迁移',
        refUrl: '/templates/int_lobby_render.webp',
        refLabel: '材质参考',
      },
      { kind: 'tool', mode: 'night', label: '起居夜灯' },
    ],
  },

  // ── Landscape ───────────────────────────────────────────
  {
    id: 'land_garden',
    titleZh: '都市草坪庭院·秋色+细节',
    titleEn: 'Urban lawn court · autumn + detail',
    blurbZh: '绿化/铺装色块 → 生成 → 秋色天气 + 植被细节',
    blurbEn: 'Plant/paving zones → gen → autumn weather + planting detail',
    category: 'landscape',
    thumbUrl: '/templates/land_garden_thumb.webp',
    sketchUrl: '/templates/land_garden_sketch.webp',
    resultUrl: '/templates/land_garden_render.webp',
    prompt:
      '都市住宅庭院草坪景观，近景细腻草皮纹理、远景现代建筑与深色格栅围栏，晴空日景。按色块落实绿化与硬质边界，保持庭院轮廓，专业景观表现，无人，无文字，无水印。',
    negative: NEG_LAND,
    preset: 'landscape',
    domain: 'landscape',
    baseType: 'line',
    adherence: 65,
    view: 'eye',
    style: 'modern',
    lighting: 'day',
    weather: 'clear',
    aspect: '16:9',
    features: [
      {
        kind: 'colorzones',
        active: 'vegetation',
        used: ['vegetation', 'road', 'water', 'wall'],
        label: '庭院色块',
      },
      { kind: 'tool', mode: 'weather', weather: 'autumn', label: '转秋色' },
      { kind: 'tool', mode: 'detail', label: '植被细节' },
    ],
  },
  {
    id: 'land_plaza',
    titleZh: '欧洲广场·雨景多视角',
    titleEn: 'European plaza · rain + multiview',
    blurbZh: '铺装/建筑色块 → 生成 → 雨景转换 + 鸟瞰三视角',
    blurbEn: 'Paving/building zones → gen → rain convert + bird multiview',
    category: 'landscape',
    thumbUrl: '/templates/land_plaza_thumb.webp',
    sketchUrl: '/templates/land_plaza_sketch.webp',
    resultUrl: '/templates/land_plaza_render.webp',
    prompt:
      '欧洲中世纪小镇广场街景，半木构民居、尖顶城门钟楼、鹅卵石街道与窗台花卉，金色时光。按色块落实铺装与建筑立面，保持街道几何，城镇景观表现，人物极少，无文字，无水印。',
    negative: NEG_LAND,
    preset: 'landscape',
    domain: 'landscape',
    baseType: 'colorplan',
    adherence: 70,
    view: 'eye',
    style: 'modern',
    lighting: 'golden',
    weather: 'clear',
    aspect: '16:9',
    features: [
      {
        kind: 'colorzones',
        active: 'road',
        used: ['road', 'wall', 'vegetation', 'furniture'],
        label: '广场色块',
      },
      { kind: 'tool', mode: 'weather', weather: 'rain', label: '转雨景' },
      { kind: 'tool', mode: 'multiview', label: '多视角' },
    ],
  },
  {
    id: 'land_park',
    titleZh: '林荫步道·雾景局部重绘',
    titleEn: 'Forest path · fog + inpaint',
    blurbZh: '林间主图 → 雾天气转换 + 种植局部重绘 + 细节',
    blurbEn: 'Forest base → fog weather + planting inpaint + detail',
    category: 'landscape',
    thumbUrl: '/templates/land_park_thumb.webp',
    sketchUrl: '/templates/land_park_sketch.webp',
    resultUrl: '/templates/land_park_render.webp',
    prompt:
      '茂密森林土路步道景观，高耸树干、苔藓与岩石、金色时光光柱穿透树冠。保持路径走向，自然景观写实表现，无人，无文字，无水印。',
    negative: NEG_LAND,
    preset: 'landscape',
    domain: 'landscape',
    baseType: 'line',
    adherence: 58,
    view: 'eye',
    style: 'modern',
    lighting: 'golden',
    weather: 'fog',
    aspect: '16:9',
    features: [
      { kind: 'tool', mode: 'weather', weather: 'fog', label: '转雾景' },
      {
        kind: 'inpaint',
        prompt: '丰富步道两侧地被与灌木层次，不改变路径走向',
        label: '种植局部重绘',
      },
      { kind: 'tool', mode: 'detail', label: '光斑细节' },
    ],
  },

  // ── Added (建筑学长-aligned catalog expansion) ─────────
  {
    id: 'line_basic',
    titleZh: '线稿出图·基础示范',
    titleEn: 'Line-to-render · basics',
    blurbZh: '高符合度线稿 → 生成 → 细节增强（入门链路）',
    blurbEn: 'High-adherence line → gen → detail enhance (starter)',
    category: 'facade',
    thumbUrl: '/templates/line_basic_thumb.webp',
    sketchUrl: '/templates/line_basic_sketch.webp',
    resultUrl: '/templates/line_basic_render.webp',
    prompt:
      '现代两层住宅线稿转建筑效果图，上层深色悬挑体量与穿孔金属屏、下层白墙与竖向木饰入口，蓝调暮光与室内暖光。严格对齐线稿开窗、体块与檐口，写实建筑表现，无人，无文字，无水印。',
    negative: NEG_FACADE,
    preset: 'facade',
    domain: 'architecture',
    baseType: 'line',
    adherence: 88,
    view: 'eye',
    style: 'modern',
    lighting: 'night',
    weather: 'clear',
    aspect: '16:9',
    features: [
      { kind: 'tool', mode: 'detail', label: '细节增强' },
    ],
  },
  {
    id: 'facade_day',
    titleZh: '泳池露台·日景细节',
    titleEn: 'Pool terrace · daylight + detail',
    blurbZh: '日景立面主图 → 晴空保持 + 材质细节',
    blurbEn: 'Day terrace facade → clear sky + material detail',
    category: 'facade',
    thumbUrl: '/templates/facade_day_thumb.webp',
    sketchUrl: '/templates/facade_day_sketch.webp',
    resultUrl: '/templates/facade_day_render.webp',
    prompt:
      '现代别墅泳池露台日景效果图，白色穿孔遮阳屏、落地玻璃、竖向木饰墙、蓝瓷砖泳池与户外沙发组，晴空硬阴影。保持线稿立面比例与开窗轴线，专业建筑表现，无人，无文字，无水印。',
    negative: NEG_FACADE,
    preset: 'facade',
    domain: 'architecture',
    baseType: 'line',
    adherence: 80,
    view: 'elevation',
    style: 'modern',
    lighting: 'day',
    weather: 'clear',
    aspect: '16:9',
    features: [
      { kind: 'tool', mode: 'weather', weather: 'clear', label: '保持晴空' },
      { kind: 'tool', mode: 'detail', label: '材质细节' },
    ],
  },
  {
    id: 'demo_inpaint',
    titleZh: '局部重绘示范·窗洞',
    titleEn: 'Inpaint demo · window reveals',
    blurbZh: '立面生成 → 窗洞/入口局部重绘示范',
    blurbEn: 'Facade gen → window/entry inpaint demo',
    category: 'facade',
    thumbUrl: '/templates/demo_inpaint_thumb.webp',
    sketchUrl: '/templates/demo_inpaint_sketch.webp',
    resultUrl: '/templates/demo_inpaint_render.webp',
    prompt:
      '当代郊区别墅外立面暮光效果图，上层黑色悬挑体量与竖向百叶、下层白墙与竖向木饰车库，室内暖光与庭院台阶。保持线稿体量，住宅建筑表现，无人，无文字，无水印。',
    negative: NEG_FACADE,
    preset: 'facade',
    domain: 'architecture',
    baseType: 'line',
    adherence: 76,
    view: 'corner',
    style: 'modern',
    lighting: 'night',
    weather: 'clear',
    aspect: '16:9',
    features: [
      {
        kind: 'inpaint',
        prompt: '强化入口门廊与窗洞阴影、百叶透光层次，保持体块与开窗位置不变',
        label: '窗洞局部重绘',
      },
      { kind: 'tool', mode: 'detail', label: '细部增强' },
    ],
  },
  {
    id: 'plan_master',
    titleZh: '滨湖天际·总图鸟瞰',
    titleEn: 'Lakefront skyline · aerial master',
    blurbZh: '城市滨湖鸟瞰 → 色块分区 + 多视角',
    blurbEn: 'Lakefront aerial → color zones + multiview',
    category: 'plan',
    thumbUrl: '/templates/plan_master_thumb.webp',
    sketchUrl: '/templates/plan_master_sketch.webp',
    resultUrl: '/templates/plan_master_render.webp',
    prompt:
      '大城市滨湖天际线鸟瞰效果，密集摩天楼群、湖面与暮色粉紫天空，建筑屋顶与街道网格清晰。按色块落实建筑体块/道路/水面分区，保持城市几何，城市规划表现，无人，无文字，无水印。',
    negative: NEG_PLAN,
    preset: 'landscape',
    domain: 'urban',
    baseType: 'colorplan',
    adherence: 84,
    view: 'bird',
    style: 'illustration',
    lighting: 'golden',
    weather: 'clear',
    aspect: '16:9',
    features: [
      {
        kind: 'colorzones',
        active: 'roof',
        used: ['road', 'vegetation', 'water', 'wall', 'roof'],
        label: '总平色块',
      },
      { kind: 'tool', mode: 'multiview', label: '鸟瞰多视角' },
    ],
  },
  {
    id: 'plan_floor',
    titleZh: '起居彩平·软装分区',
    titleEn: 'Living color plan · soft zones',
    blurbZh: '室内彩平色块 → 生成透视 → 软装替换',
    blurbEn: 'Interior color-plan zones → gen perspective → soft replace',
    category: 'plan',
    thumbUrl: '/templates/plan_floor_thumb.webp',
    sketchUrl: '/templates/plan_floor_sketch.webp',
    resultUrl: '/templates/plan_floor_render.webp',
    prompt:
      '现代开放起居室透视氛围图，驼色皮革转角沙发、藤编吊灯与帕帕桑椅、黑框落地窗外绿化，左侧可见深蓝橱柜岛台。按色块落实墙/地/软装，保持开间与窗位，室内设计表现，无人，无文字，无水印。',
    negative: NEG_INTERIOR,
    preset: 'interior',
    domain: 'interior',
    baseType: 'colorplan',
    adherence: 78,
    view: 'eye',
    style: 'scandi',
    lighting: 'day',
    weather: 'clear',
    aspect: '4:3',
    features: [
      {
        kind: 'colorzones',
        active: 'floor',
        used: ['wall', 'floor', 'sofa', 'furniture', 'curtain'],
        label: '彩平分区',
      },
      {
        kind: 'tool',
        mode: 'replace',
        prompt: '替换沙发与茶几为参考款式，保持房间开间与窗位',
        label: '软装替换',
        refUrl: '/templates/int_living_render.webp',
        refLabel: '软装参考',
      },
    ],
  },
  {
    id: 'aerial_block',
    titleZh: '街区鸟瞰·多视角',
    titleEn: 'Urban aerial · multiview',
    blurbZh: '城市街道峡谷鸟瞰 → 色块+三视角输出',
    blurbEn: 'City canyon aerial → zones + three views',
    category: 'aerial',
    thumbUrl: '/templates/aerial_block_thumb.webp',
    sketchUrl: '/templates/aerial_block_sketch.webp',
    resultUrl: '/templates/aerial_block_render.webp',
    prompt:
      '大城市街道峡谷高空鸟瞰，两侧摩天楼与屋顶机电设备、中央大道金色夕阳灭点、秋色行道树。保持线稿街区轮廓与道路走向，城市设计表现，无人，无文字，无水印。',
    negative: NEG_FACADE,
    preset: 'facade',
    domain: 'urban',
    baseType: 'massing',
    adherence: 72,
    view: 'bird',
    style: 'modern',
    lighting: 'golden',
    weather: 'clear',
    aspect: '16:9',
    features: [
      {
        kind: 'colorzones',
        active: 'roof',
        used: ['roof', 'road', 'vegetation', 'wall'],
        label: '屋顶/道路分区',
      },
      { kind: 'tool', mode: 'multiview', label: '多视角' },
    ],
  },
  {
    id: 'demo_multiview',
    titleZh: '多视角示范·泳池别墅',
    titleEn: 'Multiview demo · pool villa',
    blurbZh: '泳池别墅主图 → 正侧鸟瞰三视角示范',
    blurbEn: 'Pool villa base → elevation/side/bird multiview demo',
    category: 'aerial',
    thumbUrl: '/templates/demo_multiview_thumb.webp',
    sketchUrl: '/templates/demo_multiview_sketch.webp',
    resultUrl: '/templates/demo_multiview_render.webp',
    prompt:
      '现代浅色石材别墅与矩形泳池建筑效果图，黑框落地窗、玻璃栏杆露台、不锈钢水景喷头，晴空日景。保持线稿体量关系，可再输出正立面/侧立面/鸟瞰，无人，无文字，无水印。',
    negative: NEG_FACADE,
    preset: 'facade',
    domain: 'architecture',
    baseType: 'line',
    adherence: 74,
    view: 'bird',
    style: 'modern',
    lighting: 'day',
    weather: 'clear',
    aspect: '16:9',
    features: [
      { kind: 'tool', mode: 'multiview', label: '多视角示范' },
      { kind: 'tool', mode: 'detail', label: '细节增强' },
    ],
  },
  {
    id: 'int_office',
    titleZh: '开放办公·材质迁移',
    titleEn: 'Open office · material migrate',
    blurbZh: '办公风格参考 + 木石材质迁移',
    blurbEn: 'Office style ref + wood/stone material migrate',
    category: 'interior',
    thumbUrl: '/templates/int_office_thumb.webp',
    sketchUrl: '/templates/int_office_sketch.webp',
    resultUrl: '/templates/int_office_render.webp',
    prompt:
      '现代开放式办公走廊室内，左侧休息区、右侧黑色厨电茶水间、玻璃隔断办公室、浅灰环氧地坪与白色条形吊顶，黑色吊灯序列。保持线稿空间进深与开窗，商业室内表现，无人，无文字，无水印。',
    negative: NEG_INTERIOR,
    preset: 'interior',
    domain: 'interior',
    baseType: 'line',
    adherence: 70,
    view: 'eye',
    style: 'minimal',
    lighting: 'day',
    weather: 'clear',
    aspect: '16:9',
    features: [
      {
        kind: 'styleref',
        note: '明亮开放办公、黑柜茶水间与玻璃隔断',
        imageUrl: '/templates/int_office_render.webp',
        label: '办公氛围参考',
      },
      {
        kind: 'tool',
        mode: 'materialMigrate',
        prompt: '迁移浅灰地坪与黑柜材质，保留走廊与工位分隔',
        label: '办公材质迁移',
        refUrl: '/templates/int_office_render.webp',
        refLabel: '材质参考',
      },
    ],
  },
  {
    id: 'int_dining',
    titleZh: '餐厅·物体替换',
    titleEn: 'Dining · object replace',
    blurbZh: '餐桌色块 → 生成 → 餐椅/灯具替换',
    blurbEn: 'Dining zones → gen → chair/lamp replace',
    category: 'interior',
    thumbUrl: '/templates/int_dining_thumb.webp',
    sketchUrl: '/templates/int_dining_sketch.webp',
    resultUrl: '/templates/int_dining_render.webp',
    prompt:
      '现代餐厅室内，白色长桌、六张翠绿丝绒餐椅、金色圆球吊灯与圆形壁镜，旅人蕉盆栽与浅色木地板。按色块落实桌面与墙面，保持家具布局，室内表现，无人，无文字，无水印。',
    negative: NEG_INTERIOR,
    preset: 'interior',
    domain: 'interior',
    baseType: 'line',
    adherence: 72,
    view: 'eye',
    style: 'luxury',
    lighting: 'day',
    weather: 'clear',
    aspect: '16:9',
    features: [
      {
        kind: 'colorzones',
        active: 'furniture',
        used: ['wall', 'floor', 'furniture', 'ceiling', 'window'],
        label: '餐厅分区',
      },
      {
        kind: 'tool',
        mode: 'replace',
        prompt: '把餐椅与吊灯替换为参考图款式，保持餐桌位置',
        label: '椅灯替换',
        refUrl: '/templates/demo_material_render.webp',
        refLabel: '家具参考',
      },
    ],
  },
  {
    id: 'demo_material',
    titleZh: '材质替换示范·客厅',
    titleEn: 'Material demo · living',
    blurbZh: '风格参考 + 墙地面材质迁移示范',
    blurbEn: 'Style ref + wall/floor material migrate demo',
    category: 'interior',
    thumbUrl: '/templates/demo_material_thumb.webp',
    sketchUrl: '/templates/demo_material_sketch.webp',
    resultUrl: '/templates/demo_material_render.webp',
    prompt:
      '明亮波西米亚风客厅，浅灰沙发、白色大理石圆几、藤编圆镜与蒲苇花瓶，人字拼木地板。保持空间比例，示范材质迁移，室内表现，无人，无文字，无水印。',
    negative: NEG_INTERIOR,
    preset: 'interior',
    domain: 'interior',
    baseType: 'detailed',
    adherence: 68,
    view: 'eye',
    style: 'scandi',
    lighting: 'day',
    weather: 'clear',
    aspect: '16:9',
    materialLock: false,
    features: [
      {
        kind: 'styleref',
        note: '浅色墙面与人字拼木地板氛围',
        imageUrl: '/templates/demo_material_render.webp',
        label: '材质风格参考',
      },
      {
        kind: 'tool',
        mode: 'materialMigrate',
        prompt: '迁移人字拼木地板与浅色墙面，保留家具布局',
        label: '材质替换示范',
        refUrl: '/templates/demo_material_render.webp',
        refLabel: '目标材质',
      },
    ],
  },
  {
    id: 'land_water',
    titleZh: '湖岸栈桥·夜景灯光',
    titleEn: 'Lake dock · night lights',
    blurbZh: '水面色块 → 生成 → 夜景转换 + 细节',
    blurbEn: 'Water zones → gen → night convert + detail',
    category: 'landscape',
    thumbUrl: '/templates/land_water_thumb.webp',
    sketchUrl: '/templates/land_water_sketch.webp',
    resultUrl: '/templates/land_water_render.webp',
    prompt:
      '平静湖泊与木质码头景观效果图，T 形栈桥、对岸密林倒影、晨雾薄纱与晴蓝天空，橙色浮标点缀。按色块落实水面与绿化，保持岸线与码头轮廓，景观表现，无人，无文字，无水印。',
    negative: NEG_LAND,
    preset: 'landscape',
    domain: 'landscape',
    baseType: 'line',
    adherence: 66,
    view: 'eye',
    style: 'modern',
    lighting: 'day',
    weather: 'clear',
    aspect: '16:9',
    features: [
      {
        kind: 'colorzones',
        active: 'water',
        used: ['water', 'vegetation', 'road', 'furniture'],
        label: '水面色块',
      },
      { kind: 'tool', mode: 'night', label: '转夜景灯光' },
      { kind: 'tool', mode: 'detail', label: '倒影细节' },
    ],
  },
  {
    id: 'land_court',
    titleZh: '古都秋色·风格参考',
    titleEn: 'Historic autumn vista · style ref',
    blurbZh: '东方古都风格参考 → 生成 → 秋色天气',
    blurbEn: 'Oriental city style ref → gen → autumn weather',
    category: 'landscape',
    thumbUrl: '/templates/land_court_thumb.webp',
    sketchUrl: '/templates/land_court_sketch.webp',
    resultUrl: '/templates/land_court_render.webp',
    prompt:
      '东方古都秋色景观鸟瞰，前景多层宝塔与红叶乔木、中景城市街区、远山与粉橙夕阳。保持塔与山体轮廓关系，景观建筑表现，无人，无文字，无水印。',
    negative: NEG_LAND,
    preset: 'landscape',
    domain: 'landscape',
    baseType: 'line',
    adherence: 62,
    view: 'bird',
    style: 'neo-chinese',
    lighting: 'golden',
    weather: 'autumn',
    aspect: '4:3',
    features: [
      {
        kind: 'styleref',
        note: '东方宝塔与秋叶城市天际层次',
        imageUrl: '/templates/land_court_render.webp',
        label: '古都风格参考',
      },
      { kind: 'tool', mode: 'weather', weather: 'autumn', label: '转秋色' },
    ],
  },

]

const STROKE = { strokeWidth: 2.5, stroke: '#94a3b8' } as const
const STROKE_TEAL = { strokeWidth: 2.5, stroke: '#14b8a6' } as const
const STROKE_VIOLET = { strokeWidth: 2.5, stroke: '#8b5cf6' } as const
const STROKE_PINK = { strokeWidth: 2.5, stroke: '#ec4899' } as const
const STROKE_ORANGE = { strokeWidth: 2.5, stroke: '#f97316' } as const

function edge(
  id: string,
  source: string,
  target: string,
  sourceHandle: string,
  targetHandle: string,
  style: { strokeWidth: number; stroke: string } = STROKE,
): Edge {
  return {
    id,
    source,
    target,
    sourceHandle,
    targetHandle,
    type: 'default',
    style: { ...style },
  }
}

/**
 * Build a scene-specific graph. Core chain is shared; feature cards + wiring
 * differ per template so gallery picks never look isomorphic.
 */
export function buildTemplateGraph(t: TemplateDef): {
  nodes: CanvasNode[]
  edges: Edge[]
} {
  const p = t.id
  const nodes: CanvasNode[] = []
  const edges: Edge[] = []

  const uploadId = `${p}-upload`
  const promptId = `${p}-prompt`
  const paramsId = `${p}-params`
  const genId = `${p}-generate`
  const resultId = `${p}-result`

  nodes.push({
    id: uploadId,
    type: 'upload',
    position: { x: 40, y: 40 },
    data: {
      label: '线稿底图',
      imageUrl: t.sketchUrl,
      fileName: t.sketchUrl.split('/').pop() || 'sketch.webp',
    },
  })

  nodes.push({
    id: promptId,
    type: 'prompt',
    position: { x: 40, y: 400 },
    data: {
      label: '场景提示词',
      preset: t.preset,
      positive: t.prompt,
      negative: t.negative,
    },
  })

  nodes.push({
    id: paramsId,
    type: 'params',
    position: { x: 40, y: 820 },
    data: {
      label: '参数化',
      domain: t.domain,
      baseType: t.baseType,
      adherence: t.adherence,
      view: t.view,
      style: t.style,
      lighting: t.lighting,
      weather: t.weather,
      materialLock: Boolean(t.materialLock),
      aspect: t.aspect,
    },
  })

  nodes.push({
    id: genId,
    type: 'generate',
    position: { x: 520, y: 300 },
    data: {
      label: '生成',
      status: 'done',
      progress: 100,
      model: DEFAULT_MODEL,
      size: DEFAULT_SIZE,
      aspect: 'auto',
      count: 1,
    },
  })

  nodes.push({
    id: resultId,
    type: 'result',
    position: { x: 980, y: 260 },
    data: {
      label: '主结果',
      status: 'ready',
      imageUrl: t.resultUrl,
      seed: 20261105,
      promptSnapshot: t.prompt,
    },
  })

  // Core wiring
  edges.push(edge(`e-${p}-upload-gen`, uploadId, genId, 'out', 'ref'))
  edges.push(edge(`e-${p}-prompt-gen`, promptId, genId, 'out', 'prompt'))
  edges.push(edge(`e-${p}-params-gen`, paramsId, genId, 'out', 'params'))
  edges.push(
    edge(`e-${p}-gen-result`, genId, resultId, 'out', 'in', STROKE_TEAL),
  )

  // Feature cards — layout by column to the right / mid
  let midY = 40 // column between upload and generate for pre-gen features
  let postY = 40 // column right of result for post tools
  let featIdx = 0

  for (const f of t.features) {
    featIdx += 1
    const fid = `${p}-feat${featIdx}`

    if (f.kind === 'styleref') {
      const id = `${fid}-styleref`
      nodes.push({
        id,
        type: 'styleref',
        position: { x: 280, y: midY },
        data: {
          label: f.label || '风格参考',
          imageUrl: f.imageUrl,
          fileName: f.imageUrl?.split('/').pop(),
          note: f.note,
        },
      })
      edges.push(
        edge(`e-${id}-gen`, id, genId, 'out', 'ref', STROKE_VIOLET),
      )
      midY += 280
    } else if (f.kind === 'colorzones') {
      const id = `${fid}-zones`
      nodes.push({
        id,
        type: 'colorzones',
        position: { x: 280, y: midY },
        data: {
          label: f.label || '色块分区',
          activeCategory: f.active,
          usedCategories: f.used,
        },
      })
      edges.push(edge(`e-${p}-up-zones${featIdx}`, uploadId, id, 'out', 'image', STROKE_ORANGE))
      edges.push(edge(`e-${id}-gen`, id, genId, 'out', 'ref', STROKE_ORANGE))
      midY += 320
    } else if (f.kind === 'inpaint') {
      const id = `${fid}-inpaint`
      nodes.push({
        id,
        type: 'inpaint',
        position: { x: 1400, y: postY },
        data: {
          label: f.label || '局部重绘',
          prompt: f.prompt,
          status: 'idle',
          model: DEFAULT_MODEL,
          size: DEFAULT_SIZE,
        },
      })
      edges.push(
        edge(`e-${p}-res-inpaint${featIdx}`, resultId, id, 'out', 'image', STROKE_PINK),
      )
      postY += 300
    } else if (f.kind === 'tool') {
      const id = `${fid}-tool`
      const needsRef = f.mode === 'materialMigrate' || f.mode === 'replace'
      nodes.push({
        id,
        type: 'tool',
        position: { x: 1400, y: postY },
        data: {
          label: f.label || toolLabel(f.mode),
          mode: f.mode,
          weather: f.weather ?? (f.mode === 'weather' ? 'rain' : 'clear'),
          prompt: f.prompt || '',
          status: 'idle',
          model: DEFAULT_MODEL,
          size: DEFAULT_SIZE,
        },
      })
      edges.push(
        edge(`e-${p}-res-tool${featIdx}`, resultId, id, 'out', 'image', STROKE_VIOLET),
      )
      if (needsRef && f.refUrl) {
        const refId = `${fid}-ref`
        nodes.push({
          id: refId,
          type: 'upload',
          position: { x: 1400, y: postY + 260 },
          data: {
            label: f.refLabel || '参考图',
            imageUrl: f.refUrl,
            fileName: f.refUrl.split('/').pop() || 'ref.webp',
          },
        })
        edges.push(
          edge(`e-${refId}-tool`, refId, id, 'out', 'ref', STROKE_VIOLET),
        )
        postY += 520
      } else {
        postY += 280
      }
    }
  }

  return { nodes, edges }
}

function toolLabel(mode: ToolMode): string {
  switch (mode) {
    case 'night':
      return '夜景'
    case 'weather':
      return '天气季节'
    case 'detail':
      return '细节增强'
    case 'materialMigrate':
      return '材质迁移'
    case 'replace':
      return '物体替换'
    case 'multiview':
      return '多视角'
  }
}

/** @deprecated use TEMPLATES[0] via buildTemplateGraph — kept for leftover imports */
export const LINE_PROMPT = TEMPLATES[0].prompt
export const RENDER_PROMPT = TEMPLATES[0].prompt

const villaGraph = buildTemplateGraph(TEMPLATES[0])
export const DEMO_NODES = villaGraph.nodes
export const DEMO_EDGES = villaGraph.edges

export function templatesByCategory(cat: TemplateCategory): TemplateDef[] {
  return TEMPLATES.filter((t) => t.category === cat)
}
