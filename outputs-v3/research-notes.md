# 调研笔记（v2）：假突破

## 核心判断

假突破的本质：价格越过关键位，却**没有在新价格区域形成接受度**，随后被订单流和止损推回原区间。

片中的比喻：突破只是"敲门"，被市场接受才算"进门"。

## 概念与片中用法

| 概念 | 片中定义 | 依据 / 说明 |
|---|---|---|
| 关键位 | 前高、区间边缘、整数关口 | 示意价位 5000.00 同时是前高和整数关口，画面里是一根激光"绊线" |
| 接受度 Acceptance | 价格在新区域**持续的双向成交** | Market Profile 的说法（Dalton 等《Mind Over Markets》）：成交和停留时间在价值区边缘之外持续累积，才算接受；短暂越过又快速回来，是拒绝 |
| 吸收 Absorption | 主动买单很多，价格却推不动 | 订单流从业者的通用用法：大量主动成交落在同一价位却打不穿，通常解读为被动限价单在承接。冰山单是可能原因之一，但通常无法证实 |
| 订单流 Delta | 主动买量 − 主动卖量 | **不是期权 Delta**（期权价格对标的价格的敏感度），画面上明确标注 |
| 止损连锁 | 止损单被触发后变成市价单，推动价格去触发下一批止损 | Osler 的外汇研究：止损单在显著价位（前高前低、整数位）之外成簇，触发后会放大价格走势 |

## 因果链（全片主线）

止损买单与突破追单被同时触发 → 上方的限价卖单把买盘逐层吃掉（吸收）→ 买盘打完没人接力，新高处没有持续双向成交（没有接受度）→ 刚追进去的多头被套，止损卖单接连触发 → 价格被推回原区间。

## 事实核查

| 说法 | 结论 | 依据 |
|---|---|---|
| 止损单常聚集在前高前低、整数关口附近，触发后可能形成连锁 | 有实证支持（外汇市场） | Osler, C. L. 纽约联储 Staff Report No. 150《Stop-Loss Orders and Price Cascades in Currency Markets》；Osler (2003) *Journal of Finance* 58(5) |
| 支撑阻力位附近挂单深度更大 | 有研究支持 | 二手资料普遍引用 Kavajecz & Odders-White (2004)。原文未在本次检索中直接核实，所以片中只说"上方压着成片的限价卖单"，不做量化 |
| 假突破都是"庄家操纵" | **不成立**，片中明确否定 | 多数情况可以用正常的流动性需求、做市商库存管理、止损连锁来解释 |
| 虚假挂单（spoofing）违规 | 成立 | 美国《商品交易法》第 4c(a)(5)(C) 条（Dodd-Frank 法案第 747 条新增）：禁止以成交前撤单为目的挂出买卖单。CFTC 认定违规需要比"鲁莽"更强的主观故意 |
| 三个信号能"确认"假突破 | **只是概率信号** | 片中旁白说"它们只提高概率，不是保证"，画面盖章"概率 ≠ 保证"。从业者资料也指出吸收、价值区一类信号没有可靠的公开胜率 |

## 数据声明

- 片中所有行情都是**程序生成的示意数据**（`studio/src/fakeout/market.ts`，带固定种子），不对应任何真实品种、周期或日期。画面右上角全程标注"示意图 · 模拟数据"。
- 订单流 Delta +620 / +180，以及"主动买入 +2,400"，都是示意数值，画面上已注明。
- 应对步骤只是方法框架，不构成具体交易建议。片中注明"教育内容，不构成投资建议"。

## 参考来源

- Osler, C. L. *Stop-Loss Orders and Price Cascades in Currency Markets*，Federal Reserve Bank of New York Staff Report No. 150：https://www.newyorkfed.org/medialibrary/media/research/staff_reports/sr150.html
- 二手综述（整数关口与止损、Osler 的结论）：https://atas.net/blog/the-magic-of-round-numbers/
- 吸收与冰山单（从业者词汇）：https://bookmap.com/blog/essential-trading-glossary-terms-used-in-bookmap-a-comprehensive-guide ；https://therighttrader.com/learn/volume-and-order-flow/absorption
- 价值区与接受/拒绝：https://therighttrader.com/learn/volume-and-order-flow/value-area ；Dalton, Jones, Dalton《Mind Over Markets》
- Spoofing 法律框架：https://clsbluesky.law.columbia.edu/2015/12/02/milbank-discusses-spoofing-in-financial-markets/ ；CFTC 执法令示例：https://www.cftc.gov/sites/default/files/2018-09/enfbankofnovascotiaorder092818.pdf
