const PRODUCTS = {
  seasonal: [
    {
      id: "s1",
      name: "明前龙井",
      category: "seasonal",
      price: 368,
      unit: "50g",
      tag: "当季新品",
      desc: "采自西湖核心产区，清明前头采嫩芽，汤色清亮，香气幽远。",
      detail: "明前龙井，素有「绿茶皇后」之誉。本品采自杭州西湖龙井核心产区，于清明前数日采摘，此时茶树经一冬休养，芽叶肥嫩，内含物质丰富。干茶扁平光滑，色泽嫩绿；冲泡后汤色清澈明亮，香气清高持久，滋味鲜爽甘醇，叶底嫩绿匀整。",
      image: "longjing",
      features: ["头采嫩芽", "核心产区", "清香甘醇"]
    },
    {
      id: "s2",
      name: "春摘碧螺春",
      category: "seasonal",
      price: 298,
      unit: "50g",
      tag: "当季新品",
      desc: "太湖洞庭山原产，卷曲如螺，银毫显露，果香馥郁。",
      detail: "碧螺春产于江苏苏州太湖洞庭山，是中国十大名茶之一。外形卷曲如螺，满身披毫，银白隐翠。冲泡后汤色碧绿清澈，香气浓郁，滋味醇厚，有花果香韵，回味悠长。",
      image: "biluochun",
      features: ["洞庭原产", "银毫显露", "果香馥郁"]
    },
    {
      id: "s3",
      name: "高山云雾",
      category: "seasonal",
      price: 228,
      unit: "50g",
      tag: "当季新品",
      desc: "海拔1200米云雾茶园，昼夜温差大，茶质醇厚。",
      detail: "产自海拔1200米的高山云雾茶园，常年云雾缭绕，日照柔和，昼夜温差大，使茶叶内含物质积累充分。茶汤金黄透亮，滋味醇厚甘甜，带有独特的高山韵味。",
      image: "yunwu",
      features: ["高山云雾", "醇厚甘甜", "生态种植"]
    }
  ],
  hot: [
    {
      id: "h1",
      name: "陈年普洱熟茶",
      category: "hot",
      price: 458,
      unit: "100g",
      tag: "热销",
      desc: "云南勐海古树原料，五年陈化，汤色红浓，陈香纯正。",
      detail: "选用云南勐海古树茶青，经传统工艺渥堆发酵，陈放五年以上。茶饼紧实，色泽褐红；汤色红浓明亮，陈香纯正，滋味醇厚顺滑，喉韵深长，适合日常品饮与收藏。",
      image: "puer",
      features: ["五年陈化", "古树原料", "醇厚顺滑"]
    },
    {
      id: "h2",
      name: "正山小种红茶",
      category: "hot",
      price: 328,
      unit: "50g",
      tag: "热销",
      desc: "武夷山桐木关原产，松烟香与桂圆甜香交融。",
      detail: "正山小种是世界红茶的鼻祖，产于福建武夷山桐木关。采用全发酵工艺，带有独特的松烟香与桂圆甜香，汤色红艳明亮，滋味醇厚甘甜，适合秋冬暖饮。",
      image: "xiaozhong",
      features: ["桐木关原产", "松烟桂圆香", "全发酵"]
    },
    {
      id: "h3",
      name: "白毫银针",
      category: "hot",
      price: 528,
      unit: "50g",
      tag: "热销",
      desc: "福鼎大白茶单芽，毫香清鲜，汤色杏黄透亮。",
      detail: "白毫银针是白茶中的极品，产于福建福鼎。全部由肥壮芽头制成，满披白毫，挺直如针。冲泡后毫香清鲜，汤色杏黄透亮，滋味清淡甘甜，具有独特的毫香蜜韵。",
      image: "yinzhen",
      features: ["单芽精制", "毫香蜜韵", "福鼎原产"]
    },
    {
      id: "h4",
      name: "铁观音清香型",
      category: "hot",
      price: 268,
      unit: "50g",
      tag: "热销",
      desc: "安溪铁观音，兰花香馥郁，七泡有余香。",
      detail: "铁观音产于福建安溪，是中国十大名茶之一。清香型铁观音香气清高，带有天然兰花香，滋味鲜爽，七泡有余香，是乌龙茶中的经典之作。",
      image: "tieguanyin",
      features: ["兰花香", "七泡余香", "安溪原产"]
    }
  ],
  all: [
    {
      id: "a1",
      name: "大红袍岩茶",
      category: "all",
      price: 388,
      unit: "50g",
      tag: "岩茶",
      desc: "武夷岩茶代表，岩骨花香，韵味悠长。",
      detail: "大红袍是武夷岩茶中的极品，产于武夷山九龙窠。具有独特的岩骨花香，滋味醇厚甘爽，喉韵深长，耐冲泡，是乌龙茶爱好者的心头好。",
      image: "dahongpao",
      features: ["岩骨花香", "武夷核心", "耐冲泡"]
    },
    {
      id: "a2",
      name: "茉莉花茶",
      category: "all",
      price: 158,
      unit: "50g",
      tag: "花茶",
      desc: "七窨一提，花香茶韵交融，清芬宜人。",
      detail: "选用优质绿茶为茶坯，以茉莉鲜花窨制七次，一提香。花香浓郁而不夺茶韵，汤色黄绿明亮，滋味鲜灵甘醇，是夏日消暑的佳品。",
      image: "molihua",
      features: ["七窨一提", "花香浓郁", "清芬宜人"]
    },
    {
      id: "a3",
      name: "黄山毛峰",
      category: "all",
      price: 198,
      unit: "50g",
      tag: "绿茶",
      desc: "黄山原产，芽叶肥壮，清香高长。",
      detail: "黄山毛峰产于安徽黄山，是中国十大名茶之一。外形微卷，状似雀舌，色泽嫩绿泛象牙色。冲泡后清香高长，滋味鲜醇回甘，叶底嫩黄成朵。",
      image: "maofeng",
      features: ["黄山原产", "清香高长", "鲜醇回甘"]
    },
    {
      id: "a4",
      name: "安吉白茶",
      category: "all",
      price: 288,
      unit: "50g",
      tag: "绿茶",
      desc: "氨基酸含量高，滋味鲜爽，叶白脉绿。",
      detail: "安吉白茶产于浙江安吉，虽名为白茶实为绿茶。其叶片在特定温度下呈玉白色，氨基酸含量极高，滋味鲜爽甘醇，是绿茶中的珍品。",
      image: "anji",
      features: ["高氨基酸", "鲜爽甘醇", "叶白脉绿"]
    },
    {
      id: "a5",
      name: "祁门红茶",
      category: "all",
      price: 258,
      unit: "50g",
      tag: "红茶",
      desc: "世界三大高香红茶之一，祁门香独特。",
      detail: "祁门红茶产于安徽祁门，是世界三大高香红茶之一。具有独特的祁门香，汤色红艳明亮，滋味醇厚，带有果香与花香，被誉为「红茶皇后」。",
      image: "qimen",
      features: ["祁门香", "醇厚甘甜", "世界名茶"]
    },
    {
      id: "a6",
      name: "老白茶饼",
      category: "all",
      price: 398,
      unit: "100g",
      tag: "白茶",
      desc: "三年陈放，枣香药香渐显，越陈越醇。",
      detail: "选用福鼎大白茶原料，经三年自然陈放。茶饼紧实，色泽灰绿；汤色橙黄明亮，香气由清香转为枣香药香，滋味醇厚甘甜，具有白茶越陈越醇的特点。",
      image: "laobai",
      features: ["三年陈放", "枣香药香", "越陈越醇"]
    }
  ]
};

function getAllProducts() {
  return [...PRODUCTS.seasonal, ...PRODUCTS.hot, ...PRODUCTS.all];
}

function getProductById(id) {
  return getAllProducts().find(p => p.id === id) || null;
}

function getProductsByCategory(category) {
  return PRODUCTS[category] || [];
}
