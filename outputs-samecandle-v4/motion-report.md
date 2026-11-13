# 《同一根大阳线》v4 frame-to-frame motion report

Source: full PNG sequence of the film at 1/4 scale (270×480, 2611 frames, `npm run sc4:seq`), compared pixel by pixel with the previous frame. Any non-zero difference counts as displacement.

| measure | value |
|---|---|
| frames compared | 2610 |
| frames identical to the previous one (displacement 0) | 1773 (67.9 %) |
| frames with any change | 837 |
| frames scheduled to change (draw-ins, bar growth, captions, cuts, 3D opening) | 986 |
| **changed frames with nothing scheduled (unexplained motion)** | **0** |

Rule: a frame where nothing is scheduled must be identical to the previous frame. **Pass ✓** — every still stretch has displacement 0; all motion is a scheduled annotation, bar, caption or cut.

## Longest still stretches (displacement 0)

| frames | seconds |
|---|---|
| 2518–2610 | 3.10 |
| 2399–2442 | 1.47 |
| 688–730 | 1.43 |
| 1255–1294 | 1.33 |
| 907–945 | 1.30 |
| 2444–2479 | 1.20 |
| 639–673 | 1.17 |
| 2211–2245 | 1.17 |
| 1990–2023 | 1.13 |
| 508–538 | 1.03 |
| 2101–2131 | 1.03 |
| 600–629 | 1.00 |
| 229–257 | 0.97 |
| 1103–1131 | 0.97 |
| 1888–1916 | 0.97 |

## Every changed frame and its scheduled cause

| frame | changed pixels (%) | cause |
|---|---|---|
| 8 | 1.62 | 3D opening, chapter title |
| 10 | 2.06 | 3D opening, caption |
| 15 | 11.86 | 3D opening |
| 16 | 14.50 | 3D opening |
| 17 | 17.13 | 3D opening |
| 18 | 13.77 | 3D opening |
| 19 | 4.50 | 3D opening |
| 20 | 2.99 | 3D opening |
| 21 | 3.16 | 3D opening |
| 22 | 2.53 | 3D opening |
| 23 | 1.67 | 3D opening |
| 24 | 1.24 | 3D opening |
| 25 | 0.92 | 3D opening |
| 26 | 0.74 | 3D opening |
| 27 | 1.05 | 3D opening |
| 28 | 0.47 | 3D opening |
| 29 | 0.72 | 3D opening |
| 30 | 0.46 | 3D opening |
| 31 | 0.36 | 3D opening |
| 36 | 0.01 | 3D opening, bars growing, cut 3D 开场 → 2D 三行 (4-frame dissolve) |
| 37 | 72.56 | 3D opening |
| 38 | 54.18 | 3D opening |
| 39 | 81.72 | 3D opening |
| 40 | 74.01 | 3D opening |
| 51 | 0.98 | caption |
| 62 | 0.01 | bars growing |
| 63 | 0.01 | bars growing |
| 64 | 0.02 | bars growing |
| 65 | 0.01 | bars growing |
| 66 | 0.02 | bars growing |
| 67 | 0.02 | bars growing, openTurnA in |
| 68 | 0.03 | bars growing, openTurnA in |
| 69 | 0.06 | bars growing, openTurnA in |
| 70 | 0.06 | bars growing, openResA0 in, openResA1 in, openTurnA in |
| 71 | 0.93 | bars growing, openResA0 in, openResA1 in, openTurnA in |
| 72 | 1.28 | bars growing, openArrowA in, openResA0 in, openResA1 in, openTurnA in |
| 73 | 1.34 | bars growing, openArrowA in, openResA0 in, openResA1 in, openTurnA in |
| 74 | 1.43 | bars growing, openArrowA in, openResA0 in, openResA1 in, openTurnA in |
| 75 | 1.45 | bars growing, openArrowA in, openResA0 in, openResA1 in, openTurnA in |
| 76 | 1.48 | bars growing, openArrowA in, openResA0 in, openResA1 in, openTurnA in |
| 77 | 0.20 | bars growing, openArrowA in, openResA0 in, openResA1 in |
| 78 | 0.06 | bars growing, openArrowA in, openResA0 in, openResA1 in |
| 79 | 0.04 | bars growing, openArrowA in, openResA0 in, openResA1 in |
| 80 | 0.02 | openArrowA in |
| 81 | 0.02 | openArrowA in |
| 94 | 0.39 | caption |
| 106 | 0.03 | bars growing |
| 107 | 0.02 | bars growing, openTurnB in |
| 108 | 0.04 | bars growing, openTurnB in |
| 109 | 0.04 | bars growing, openTurnB in |
| 110 | 0.06 | bars growing, openTurnB in |
| 111 | 0.47 | bars growing, openTurnB in |
| 112 | 0.82 | bars growing, openTurnB in |
| 113 | 0.76 | bars growing, openTurnB in |
| 114 | 0.81 | bars growing, openResB0 in, openResB1 in, openTurnB in |
| 115 | 1.27 | bars growing, openResB0 in, openResB1 in, openTurnB in |
| 116 | 1.23 | bars growing, openArrowB in, openResB0 in, openResB1 in, openTurnB in |
| 117 | 0.55 | bars growing, openArrowB in, openResB0 in, openResB1 in |
| 118 | 0.60 | bars growing, openArrowB in, openResB0 in, openResB1 in |
| 119 | 0.64 | bars growing, openArrowB in, openResB0 in, openResB1 in |
| 120 | 0.65 | bars growing, openArrowB in, openResB0 in, openResB1 in |
| 121 | 0.17 | bars growing, openArrowB in, openResB0 in, openResB1 in |
| 122 | 0.11 | bars growing, openArrowB in, openResB0 in, openResB1 in |
| 123 | 0.11 | bars growing, openArrowB in, openResB0 in, openResB1 in |
| 124 | 0.03 | openArrowB in |
| 125 | 0.02 | openArrowB in |
| 126 | 1.53 | caption |
| 151 | 1.59 | caption |
| 152 | 0.02 | bars growing, openTurnC in |
| 153 | 0.05 | bars growing, openTurnC in |
| 154 | 0.05 | bars growing, openTurnC in |
| 155 | 0.06 | bars growing, openTurnC in |
| 156 | 0.47 | bars growing, openTurnC in |
| 157 | 0.82 | bars growing, openTurnC in |
| 158 | 0.79 | bars growing, openTurnC in |
| 159 | 0.83 | bars growing, openTurnC in |
| 160 | 0.83 | bars growing, openResC0 in, openResC1 in, openTurnC in |
| 161 | 1.39 | bars growing, openResC0 in, openResC1 in, openTurnC in |
| 162 | 0.63 | bars growing, openArrowC in, openResC0 in, openResC1 in |
| 163 | 0.72 | bars growing, openArrowC in, openResC0 in, openResC1 in |
| 164 | 0.77 | bars growing, openArrowC in, openResC0 in, openResC1 in |
| 165 | 0.80 | bars growing, openArrowC in, openResC0 in, openResC1 in |
| 166 | 0.82 | bars growing, openArrowC in, openResC0 in, openResC1 in |
| 167 | 0.16 | bars growing, openArrowC in, openResC0 in, openResC1 in |
| 168 | 0.05 | bars growing, openArrowC in, openResC0 in, openResC1 in |
| 169 | 0.04 | bars growing, openArrowC in, openResC0 in, openResC1 in |
| 170 | 0.03 | openArrowC in |
| 171 | 0.02 | openArrowC in |
| 191 | 2.06 | caption |
| 198 | 4.51 | openArrowA out, openArrowB out, openArrowC out, openResA0 out, openResA1 out, openResB0 out, openResB1 out, openResC0 ou |
| 199 | 4.64 | openArrowA out, openArrowB out, openArrowC out, openResA0 out, openResA1 out, openResB0 out, openResB1 out, openResC0 ou |
| 200 | 3.74 | openArrowA out, openArrowB out, openArrowC out, openResA0 out, openResA1 out, openResB0 out, openResB1 out, openResC0 ou |
| 201 | 4.61 | openArrowA out, openArrowB out, openArrowC out, openResA0 out, openResA1 out, openResB0 out, openResB1 out, openResC0 ou |
| 202 | 4.65 | openArrowA out, openArrowB out, openArrowC out, openResA0 out, openResA1 out, openResB0 out, openResB1 out, openResC0 ou |
| 203 | 32.06 | bars growing, caption, chapter title, cut → 为什么（单根K线）, openArrowA out, openArrowB out, openArrowC out, openResA0 out, op |
| 212 | 0.03 | whyOpen in |
| 213 | 0.06 | whyOpen in |
| 214 | 0.07 | whyOpen in |
| 215 | 0.26 | whyOpen in |
| 216 | 0.27 | whyOpen in |
| 217 | 0.18 | whyClose in, whyOpen in |
| 218 | 0.21 | whyClose in, whyOpen in |
| 219 | 0.23 | whyClose in, whyOpen in |
| 220 | 0.25 | whyClose in, whyOpen in |
| 221 | 0.27 | whyClose in |
| 222 | 0.28 | whyClose in |
| 223 | 0.19 | whyClose in |
| 224 | 0.19 | whyClose in |
| 225 | 1.46 | caption, whyClose in |
| 226 | 0.18 | whyClose in |
| 228 | 3.11 | caption |
| 258 | 0.02 | whyCard in |
| 259 | 0.04 | whyCard in |
| 260 | 0.05 | whyCard in |
| 261 | 2.64 | whyCard in |
| 262 | 2.65 | whyCard in |
| 263 | 0.69 | whyCard in |
| 264 | 2.61 | whyCard in |
| 265 | 2.61 | whyCard in |
| 266 | 2.60 | whyCard in |
| 291 | 2.35 | caption |
| 295 | 0.06 | whyBody in |
| 296 | 0.10 | whyBody in |
| 297 | 0.12 | whyBody in |
| 298 | 0.27 | whyBody in |
| 299 | 0.28 | whyBody in |
| 300 | 0.16 | whyBody in |
| 301 | 0.15 | whyBody in |
| 302 | 0.14 | whyBody in |
| 303 | 0.14 | whyBody in |
| 319 | 0.49 | whyCard line |
| 320 | 0.50 | whyCard line |
| 321 | 0.50 | whyCard line |
| 322 | 0.50 | whyCard line |
| 323 | 0.50 | whyCard line |
| 324 | 1.49 | caption, whyCard line |
| 325 | 0.49 | whyCard line |
| 326 | 0.50 | whyCard line |
| 354 | 1.27 | caption |
| 358 | 3.11 | caption |
| 377 | 2.93 | whyBody out, whyCard out |
| 378 | 2.93 | whyBody out, whyCard out |
| 379 | 1.51 | whyBody out, whyCard out |
| 380 | 2.93 | whyBody out, whyCard out |
| 381 | 2.93 | whyBody out, whyCard out |
| 382 | 2.93 | whyBody out, whyCard out, whyNext in |
| 383 | 5.08 | whyNext in |
| 384 | 8.93 | whyNext in |
| 385 | 11.78 | whyNext in |
| 386 | 13.77 | whyNext in |
| 387 | 2.59 | whyNext in |
| 388 | 1.76 | whyNext in |
| 389 | 1.32 | whyNext in |
| 390 | 1.20 | whyNext in |
| 391 | 0.87 | whyNext in |
| 416 | 3.11 | caption |
| 429 | 16.98 | whyClose out, whyNext out, whyOpen out |
| 430 | 17.02 | whyClose out, whyNext out, whyOpen out |
| 431 | 16.98 | whyClose out, whyNext out, whyOpen out |
| 432 | 16.98 | whyClose out, whyNext out, whyOpen out |
| 433 | 17.02 | whyClose out, whyNext out, whyOpen out |
| 434 | 42.52 | bars growing, chapter title, cut → 三件事（新页面）, whyClose out, whyNext out, whyOpen out |
| 452 | 2.83 | emphasis 真正 |
| 453 | 99.22 | emphasis 真正 |
| 454 | 99.23 | emphasis 真正 |
| 455 | 48.96 | caption, emphasis 真正 |
| 456 | 53.47 | emphasis 真正 |
| 457 | 97.03 | emphasis 真正 |
| 458 | 2.70 | emphasis 真正 |
| 459 | 3.02 | emphasis 真正 |
| 460 | 2.70 | emphasis 真正 |
| 461 | 3.02 | emphasis 真正 |
| 462 | 2.70 | emphasis 真正, 三件事 01 |
| 463 | 4.44 | emphasis 真正, 三件事 01 |
| 464 | 4.43 | emphasis 真正, 三件事 01 |
| 465 | 4.42 | emphasis 真正, 三件事 01 |
| 466 | 4.44 | emphasis 真正, 三件事 01 |
| 467 | 4.44 | emphasis 真正, 三件事 01 |
| 468 | 4.42 | emphasis 真正, 三件事 01 |
| 469 | 4.41 | emphasis 真正, 三件事 01 |
| 470 | 4.42 | emphasis 真正, 三件事 01 |
| 471 | 4.41 | emphasis 真正, 三件事 01 |
| 483 | 2.48 | emphasis 真正, 三件事 02 |
| 484 | 2.49 | emphasis 真正, 三件事 02 |
| 485 | 2.48 | emphasis 真正, 三件事 02 |
| 486 | 97.03 | emphasis 真正, 三件事 02 |
| 487 | 56.92 | emphasis 真正, 三件事 02 |
| 488 | 47.06 | emphasis 真正, 三件事 02 |
| 489 | 97.32 | emphasis 真正, 三件事 02 |
| 490 | 96.90 | emphasis 真正, 三件事 02 |
| 491 | 7.04 | emphasis 真正, 三件事 02 |
| 492 | 0.96 | emphasis 真正 |
| 499 | 2.53 | 三件事 03 |
| 500 | 2.54 | 三件事 03 |
| 501 | 2.53 | 三件事 03 |
| 502 | 2.53 | 三件事 03 |
| 503 | 2.54 | 三件事 03 |
| 504 | 4.03 | caption, 三件事 03 |
| 505 | 2.53 | 三件事 03 |
| 506 | 2.54 | 三件事 03 |
| 507 | 2.54 | 三件事 03 |
| 539 | 1.27 | caption |
| 551 | 47.34 | bars growing, caption, chapter title, cut → 01 位置 |
| 565 | 0.12 | posRing0 in, posRing1 in, posRing2 in |
| 566 | 0.21 | posRing0 in, posRing1 in, posRing2 in |
| 567 | 0.26 | posRing0 in, posRing1 in, posRing2 in |
| 568 | 0.29 | posRing0 in, posRing1 in, posRing2 in |
| 569 | 0.30 | posRing0 in, posRing1 in, posRing2 in |
| 570 | 0.34 | caption, posRing0 in, posRing1 in, posRing2 in |
| 571 | 0.06 | posRing0 in, posRing1 in, posRing2 in |
| 572 | 0.05 | posRing0 in, posRing1 in, posRing2 in |
| 573 | 0.03 | posRing0 in, posRing1 in, posRing2 in |
| 591 | 0.36 | posBase in |
| 592 | 0.61 | posBase in |
| 593 | 1.56 | caption, posBase in |
| 594 | 1.37 | posBase in |
| 595 | 1.86 | posBase in |
| 596 | 4.29 | caption, posBase in |
| 597 | 0.89 | posBase in |
| 598 | 0.89 | posBase in |
| 599 | 0.87 | posBase in |
| 630 | 0.02 | posBreak in |
| 631 | 0.04 | posBreak in |
| 632 | 0.06 | posBreak in |
| 633 | 0.51 | posBreak in |
| 634 | 0.94 | posBreak in |
| 635 | 0.87 | posBreak in |
| 636 | 0.92 | posBreak in |
| 637 | 0.93 | posBreak in |
| 638 | 0.87 | posBreak in |
| 674 | 2.26 | caption |
| 679 | 0.10 | posTrend in |
| 680 | 0.16 | posTrend in |
| 681 | 0.21 | posTrend in |
| 682 | 0.24 | posTrend in |
| 683 | 0.24 | posTrend in |
| 684 | 0.90 | posTrend in |
| 685 | 0.89 | posTrend in |
| 686 | 0.88 | posTrend in |
| 687 | 0.88 | posTrend in |
| 731 | 2.59 | caption |
| 734 | 3.94 | posBase out, posBreak out, posTrend out |
| 735 | 6.90 | caption, posBase out, posBreak out, posTrend out |
| 736 | 2.86 | posBase out, posBreak out, posTrend out |
| 737 | 4.04 | posBase out, posBreak out, posTrend out |
| 738 | 4.04 | posBase out, posBreak out, posTrend out |
| 739 | 4.00 | posBase out, posBreak out, posRally in, posTrend out |
| 740 | 0.71 | posRally in |
| 741 | 0.83 | posRally in |
| 742 | 0.40 | posRally in |
| 743 | 0.48 | posRally in |
| 744 | 0.46 | posRally in |
| 745 | 0.90 | posRally in |
| 746 | 0.95 | posRally in |
| 747 | 0.99 | posRally in |
| 748 | 0.95 | posRally in |
| 767 | 0.04 | posLate in |
| 768 | 0.07 | posLate in |
| 769 | 0.10 | posLate in |
| 770 | 0.69 | posLate in |
| 771 | 1.07 | posLate in |
| 772 | 1.02 | posLate in |
| 773 | 1.12 | posLate in |
| 774 | 1.08 | posLate in |
| 775 | 1.00 | posLate in |
| 802 | 2.02 | caption |
| 816 | 1.03 | posLate out |
| 817 | 1.09 | posLate out |
| 818 | 0.71 | posLate out |
| 819 | 1.14 | posLate out |
| 820 | 1.09 | posLate out |
| 821 | 1.03 | posLast in, posLate out |
| 822 | 0.02 | posLast in |
| 823 | 0.04 | posLast in |
| 824 | 0.06 | posLast in |
| 825 | 2.23 | posLast in |
| 826 | 2.36 | posLast in |
| 827 | 0.73 | posLast in |
| 828 | 2.46 | posLast in |
| 829 | 2.32 | posLast in |
| 830 | 2.17 | posLast in |
| 832 | 0.23 | posLast line |
| 833 | 0.24 | posLast line |
| 834 | 0.24 | posLast line |
| 835 | 0.24 | posLast line |
| 836 | 0.24 | posLast line |
| 837 | 0.24 | posLast line |
| 838 | 0.23 | posLast line |
| 839 | 0.24 | posLast line |
| 865 | 3.10 | caption |
| 871 | 0.49 | caption |
| 874 | 3.60 | posLast out, posRally out |
| 875 | 6.62 | caption, posLast out, posRally out |
| 876 | 2.03 | posLast out, posRally out |
| 877 | 3.90 | posLast out, posRally out |
| 878 | 3.77 | posLast out, posRally out |
| 879 | 3.60 | posLast out, posRally out |
| 881 | 0.15 | posDown in |
| 882 | 0.25 | posDown in |
| 883 | 0.33 | posDown in |
| 884 | 0.38 | posDown in |
| 885 | 0.35 | posDown in |
| 886 | 0.80 | posDown in |
| 887 | 0.82 | posDown in |
| 888 | 0.80 | posDown in |
| 889 | 0.79 | posDown in |
| 898 | 0.46 | posBand in |
| 899 | 0.81 | posBand in |
| 900 | 1.08 | posBand in |
| 901 | 1.75 | posBand in |
| 902 | 2.25 | posBand in |
| 903 | 0.96 | posBand in |
| 904 | 0.96 | posBand in |
| 905 | 0.92 | posBand in |
| 906 | 0.89 | posBand in |
| 946 | 1.13 | posDown out |
| 947 | 1.14 | posDown out |
| 948 | 2.52 | caption, posDown out |
| 949 | 1.15 | posDown out |
| 950 | 1.14 | posDown out |
| 951 | 1.55 | posDown out, posShort in |
| 952 | 0.03 | posShort in |
| 953 | 0.05 | posShort in |
| 954 | 0.07 | posShort in |
| 955 | 1.92 | posShort in |
| 956 | 2.09 | posShort in |
| 957 | 0.65 | posShort in |
| 958 | 2.09 | posShort in |
| 959 | 2.04 | posShort in |
| 960 | 1.93 | posShort in |
| 962 | 0.33 | posShort line |
| 963 | 0.33 | posShort line |
| 964 | 0.33 | posShort line |
| 965 | 0.33 | posShort line |
| 966 | 0.33 | posShort line |
| 967 | 0.33 | posShort line |
| 968 | 0.33 | posShort line |
| 969 | 0.33 | posShort line |
| 996 | 2.33 | caption |
| 1003 | 4.64 | posBand out, posRing0 out, posRing1 out, posRing2 out, posShort out |
| 1004 | 4.82 | posBand out, posRing0 out, posRing1 out, posRing2 out, posShort out |
| 1005 | 3.35 | posBand out, posRing0 out, posRing1 out, posRing2 out, posShort out |
| 1006 | 4.88 | posBand out, posRing0 out, posRing1 out, posRing2 out, posShort out |
| 1007 | 4.82 | posBand out, posRing0 out, posRing1 out, posRing2 out, posShort out |
| 1008 | 25.57 | bars growing, caption, chapter title, cut → 02 量能, posBand out, posRing0 out, posRing1 out, posRing2 out, posShort out |
| 1027 | 0.28 | caption |
| 1029 | 0.08 | volAvgA in, volAvgB in, volAvgC in |
| 1030 | 0.13 | volAvgA in, volAvgB in, volAvgC in |
| 1031 | 0.18 | volAvgA in, volAvgB in, volAvgC in |
| 1032 | 0.47 | volAvgA in, volAvgB in, volAvgC in |
| 1033 | 0.44 | volAvgA in, volAvgB in, volAvgC in |
| 1034 | 0.28 | volAvgA in, volAvgB in, volAvgC in |
| 1035 | 0.27 | volAvgA in, volAvgB in, volAvgC in |
| 1036 | 0.27 | volAvgA in, volAvgB in, volAvgC in |
| 1037 | 0.27 | volAvgA in, volAvgB in, volAvgC in |
| 1049 | 0.76 | caption |
| 1052 | 1.55 | caption |
| 1059 | 20.68 | column focus, volRatioA in |
| 1060 | 0.35 | volRatioA in |
| 1061 | 0.36 | volRatioA in |
| 1062 | 0.37 | volRatioA in |
| 1063 | 0.37 | volRatioA in |
| 1064 | 0.36 | volRatioA in |
| 1065 | 0.35 | volRatioA in |
| 1066 | 0.00 | volRatioA in |
| 1067 | 0.00 | volRatioA in |
| 1068 | 0.00 | volRatioA in |
| 1089 | 2.73 | caption |
| 1097 | 0.49 | volChipA in |
| 1098 | 1.38 | volChipA in |
| 1099 | 1.38 | volChipA in |
| 1100 | 1.38 | volChipA in |
| 1101 | 1.38 | volChipA in |
| 1102 | 1.27 | volChipA in |
| 1132 | 0.36 | bars growing, volChipA line |
| 1133 | 0.36 | bars growing, volChipA line |
| 1134 | 0.42 | bars growing, volChipA line |
| 1135 | 0.36 | bars growing, volChipA line |
| 1136 | 0.42 | bars growing, volChipA line |
| 1137 | 0.36 | bars growing, volChipA line |
| 1138 | 0.36 | bars growing, volChipA line |
| 1139 | 0.40 | bars growing, volChipA line |
| 1140 | 0.01 | bars growing |
| 1141 | 0.08 | bars growing |
| 1142 | 0.01 | bars growing |
| 1143 | 0.06 | bars growing |
| 1155 | 3.03 | caption |
| 1169 | 0.76 | caption |
| 1173 | 2.33 | caption |
| 1186 | 1.38 | volChipA out |
| 1187 | 1.38 | volChipA out |
| 1188 | 1.38 | volChipA out |
| 1189 | 1.38 | volChipA out |
| 1190 | 1.38 | volChipA out |
| 1191 | 21.71 | column focus, volChipA out, volRatioB in |
| 1192 | 0.36 | volRatioB in |
| 1193 | 0.40 | volRatioB in |
| 1194 | 0.42 | volRatioB in |
| 1195 | 0.44 | volRatioB in |
| 1196 | 0.40 | volRatioB in |
| 1197 | 0.34 | volRatioB in |
| 1198 | 0.01 | volRatioB in |
| 1199 | 0.01 | volRatioB in |
| 1200 | 0.00 | volRatioB in |
| 1222 | 2.26 | caption |
| 1235 | 0.36 | bars growing, volChipB in |
| 1236 | 1.17 | bars growing, volChipB in |
| 1237 | 1.27 | bars growing, volChipB in |
| 1238 | 1.16 | bars growing, volChipB in |
| 1239 | 1.27 | bars growing, volChipB in |
| 1240 | 1.06 | bars growing, volChipB in |
| 1241 | 0.01 | bars growing, volChipB in |
| 1242 | 0.07 | bars growing, volChipB in |
| 1243 | 0.01 | bars growing, volChipB in |
| 1244 | 0.10 | bars growing |
| 1245 | 0.01 | bars growing |
| 1246 | 0.07 | bars growing, volChipB line |
| 1247 | 0.21 | volChipB line |
| 1248 | 0.21 | volChipB line |
| 1249 | 0.21 | volChipB line |
| 1250 | 0.21 | volChipB line |
| 1251 | 0.21 | volChipB line |
| 1252 | 0.21 | volChipB line |
| 1253 | 0.21 | volChipB line |
| 1254 | 0.21 | volChipB line |
| 1295 | 2.99 | caption |
| 1308 | 0.76 | caption |
| 1312 | 1.55 | caption |
| 1317 | 1.15 | volChipB out |
| 1318 | 1.15 | volChipB out |
| 1319 | 1.15 | volChipB out |
| 1320 | 1.15 | volChipB out |
| 1321 | 1.15 | volChipB out |
| 1322 | 21.80 | column focus, volChipB out, volRatioC in |
| 1323 | 0.35 | volRatioC in |
| 1324 | 0.36 | volRatioC in |
| 1325 | 0.36 | volRatioC in |
| 1326 | 0.36 | volRatioC in |
| 1327 | 0.36 | volRatioC in |
| 1328 | 0.36 | volRatioC in |
| 1329 | 0.00 | volRatioC in |
| 1330 | 0.00 | volRatioC in |
| 1353 | 1.86 | caption |
| 1379 | 0.44 | bars growing, volChipC in |
| 1380 | 0.84 | bars growing, volChipC in |
| 1381 | 0.87 | bars growing, volChipC in |
| 1382 | 0.83 | bars growing, volChipC in |
| 1383 | 0.88 | bars growing, volChipC in |
| 1384 | 0.80 | bars growing, volChipC in |
| 1385 | 0.01 | bars growing, volChipC in |
| 1386 | 0.04 | bars growing, volChipC in |
| 1387 | 0.01 | bars growing, volChipC in |
| 1388 | 0.06 | bars growing |
| 1389 | 0.01 | bars growing |
| 1390 | 0.05 | bars growing |
| 1405 | 2.59 | caption |
| 1412 | 2.53 | volAvgA out, volAvgB out, volAvgC out, volChipC out, volRatioA out, volRatioB out, volRatioC out |
| 1413 | 2.51 | volAvgA out, volAvgB out, volAvgC out, volChipC out, volRatioA out, volRatioB out, volRatioC out |
| 1414 | 2.53 | volAvgA out, volAvgB out, volAvgC out, volChipC out, volRatioA out, volRatioB out, volRatioC out |
| 1415 | 2.53 | volAvgA out, volAvgB out, volAvgC out, volChipC out, volRatioA out, volRatioB out, volRatioC out |
| 1416 | 2.53 | volAvgA out, volAvgB out, volAvgC out, volChipC out, volRatioA out, volRatioB out, volRatioC out |
| 1417 | 32.57 | bars growing, caption, chapter title, cut → 03 承接, volAvgA out, volAvgB out, volAvgC out, volChipC out, volRatioA out, v |
| 1440 | 1.46 | caption |
| 1445 | 0.90 | emphasis 最关键 |
| 1446 | 2.72 | emphasis 最关键 |
| 1447 | 97.73 | emphasis 最关键 |
| 1448 | 97.65 | emphasis 最关键 |
| 1449 | 44.79 | emphasis 最关键 |
| 1450 | 89.97 | emphasis 最关键 |
| 1451 | 63.20 | emphasis 最关键 |
| 1452 | 1.33 | emphasis 最关键 |
| 1453 | 1.33 | emphasis 最关键 |
| 1454 | 1.33 | emphasis 最关键 |
| 1455 | 1.33 | emphasis 最关键 |
| 1456 | 1.33 | emphasis 最关键 |
| 1457 | 1.33 | emphasis 最关键 |
| 1458 | 1.33 | emphasis 最关键 |
| 1459 | 1.33 | emphasis 最关键 |
| 1460 | 1.33 | emphasis 最关键 |
| 1461 | 1.33 | emphasis 最关键, holdOpen in |
| 1462 | 1.39 | emphasis 最关键, holdOpen in |
| 1463 | 1.43 | emphasis 最关键, holdOpen in |
| 1464 | 1.46 | emphasis 最关键, holdOpen in |
| 1465 | 1.66 | emphasis 最关键, holdOpen in |
| 1466 | 0.32 | emphasis 最关键, holdOpen in |
| 1467 | 0.19 | emphasis 最关键, holdOpen in |
| 1468 | 0.18 | emphasis 最关键, holdOpen in |
| 1469 | 0.18 | emphasis 最关键, holdOpen in |
| 1470 | 0.18 | emphasis 最关键, holdOpen in |
| 1472 | 0.03 | emphasis 最关键, holdClose in |
| 1473 | 0.05 | emphasis 最关键, holdClose in |
| 1474 | 0.07 | emphasis 最关键, holdClose in |
| 1475 | 0.26 | emphasis 最关键, holdClose in |
| 1476 | 0.27 | emphasis 最关键, holdClose in |
| 1477 | 0.19 | emphasis 最关键, holdClose in |
| 1478 | 0.19 | emphasis 最关键, holdClose in |
| 1479 | 0.19 | emphasis 最关键, holdClose in |
| 1480 | 1.81 | caption, emphasis 最关键, holdClose in |
| 1486 | 64.37 | emphasis 最关键 |
| 1487 | 90.60 | emphasis 最关键 |
| 1488 | 44.55 | emphasis 最关键 |
| 1489 | 98.38 | emphasis 最关键 |
| 1490 | 98.45 | emphasis 最关键 |
| 1491 | 2.90 | emphasis 最关键 |
| 1506 | 0.76 | caption |
| 1509 | 2.85 | caption |
| 1538 | 0.06 | holdBody in |
| 1539 | 0.10 | holdBody in |
| 1540 | 0.13 | holdBody in |
| 1541 | 0.45 | holdBody in |
| 1542 | 0.46 | holdBody in |
| 1543 | 0.35 | holdBody in |
| 1544 | 0.34 | holdBody in |
| 1545 | 0.33 | holdBody in |
| 1546 | 0.32 | holdBody in |
| 1567 | 2.22 | caption |
| 1570 | 0.14 | holdMid in |
| 1571 | 0.25 | holdMid in |
| 1572 | 0.33 | holdMid in |
| 1573 | 0.64 | holdMid in |
| 1574 | 0.68 | holdMid in |
| 1575 | 0.27 | holdMid in |
| 1576 | 0.26 | holdMid in |
| 1577 | 0.25 | holdMid in |
| 1578 | 0.25 | holdMid in |
| 1596 | 1.27 | caption |
| 1598 | 0.47 | holdBody out |
| 1599 | 0.46 | holdBody out |
| 1600 | 0.47 | holdBody out |
| 1601 | 3.23 | caption, holdBody out |
| 1602 | 0.47 | holdBody out |
| 1603 | 0.47 | holdBody out |
| 1604 | 0.02 | bars growing |
| 1605 | 0.02 | bars growing |
| 1606 | 0.02 | bars growing |
| 1607 | 0.02 | bars growing |
| 1608 | 0.02 | bars growing |
| 1609 | 0.02 | bars growing |
| 1610 | 0.02 | bars growing |
| 1611 | 0.01 | bars growing |
| 1612 | 0.00 | bars growing |
| 1613 | 0.02 | bars growing |
| 1614 | 0.03 | bars growing |
| 1615 | 0.02 | bars growing |
| 1616 | 0.02 | bars growing |
| 1617 | 0.03 | bars growing |
| 1618 | 0.03 | bars growing |
| 1619 | 0.03 | bars growing |
| 1620 | 0.02 | bars growing |
| 1621 | 0.00 | bars growing |
| 1622 | 0.02 | bars growing |
| 1623 | 0.02 | bars growing |
| 1624 | 0.02 | bars growing |
| 1625 | 0.02 | bars growing |
| 1626 | 0.02 | bars growing |
| 1627 | 0.02 | bars growing |
| 1628 | 0.02 | bars growing |
| 1629 | 0.02 | bars growing |
| 1630 | 0.00 | bars growing |
| 1631 | 0.03 | bars growing |
| 1632 | 0.03 | bars growing |
| 1633 | 0.04 | bars growing |
| 1634 | 0.04 | bars growing |
| 1635 | 0.04 | bars growing |
| 1636 | 0.05 | bars growing |
| 1637 | 0.04 | bars growing |
| 1638 | 0.02 | bars growing |
| 1639 | 0.00 | bars growing |
| 1640 | 0.02 | bars growing, holdPullA in |
| 1641 | 0.05 | bars growing, holdPullA in |
| 1642 | 0.06 | bars growing, holdPullA in |
| 1643 | 0.07 | bars growing, holdPullA in |
| 1644 | 0.48 | bars growing, holdPullA in |
| 1645 | 0.80 | bars growing, holdPullA in |
| 1646 | 0.79 | bars growing, holdPullA in |
| 1647 | 0.77 | bars growing, holdPullA in |
| 1648 | 0.75 | bars growing, holdPullA in |
| 1649 | 0.78 | bars growing, holdPullA in |
| 1650 | 0.02 | bars growing |
| 1651 | 0.02 | bars growing |
| 1652 | 0.03 | bars growing |
| 1653 | 0.02 | bars growing |
| 1654 | 0.03 | bars growing |
| 1655 | 0.02 | bars growing |
| 1656 | 0.01 | bars growing |
| 1657 | 0.00 | bars growing |
| 1675 | 0.39 | holdChipA in |
| 1676 | 1.59 | holdChipA in |
| 1677 | 1.59 | holdChipA in |
| 1678 | 1.59 | holdChipA in |
| 1679 | 1.59 | holdChipA in |
| 1680 | 2.32 | caption, holdChipA in |
| 1685 | 0.39 | holdChipA line |
| 1686 | 0.39 | holdChipA line |
| 1687 | 0.39 | holdChipA line |
| 1688 | 0.39 | holdChipA line |
| 1689 | 0.39 | holdChipA line |
| 1690 | 0.39 | holdChipA line |
| 1691 | 0.39 | holdChipA line |
| 1692 | 0.39 | holdChipA line |
| 1720 | 2.37 | holdChipA out, holdPullA out |
| 1721 | 2.37 | holdChipA out, holdPullA out |
| 1722 | 1.24 | holdChipA out, holdPullA out |
| 1723 | 2.37 | holdChipA out, holdPullA out |
| 1724 | 2.37 | holdChipA out, holdPullA out |
| 1725 | 3.03 | holdChipA out, holdPathA in, holdPullA out |
| 1726 | 2.10 | bars growing, caption, holdPathA in |
| 1727 | 0.29 | bars growing, holdPathA in |
| 1728 | 0.34 | bars growing, holdPathA in |
| 1729 | 1.87 | bars growing, caption, holdPathA in |
| 1730 | 0.85 | bars growing, holdPathA in |
| 1731 | 0.55 | bars growing, holdBreakB in, holdPathA in |
| 1732 | 0.56 | holdBreakB in, holdPathA in |
| 1733 | 0.59 | holdBreakB in, holdPathA in |
| 1734 | 0.61 | holdBreakB in, holdPathA in |
| 1735 | 0.79 | holdBreakB in |
| 1736 | 1.70 | holdBreakB in |
| 1737 | 1.64 | holdBreakB in |
| 1738 | 1.67 | holdBreakB in |
| 1739 | 1.68 | holdBreakB in |
| 1740 | 1.66 | holdBreakB in |
| 1762 | 2.80 | caption |
| 1766 | 1.71 | holdBreakB out |
| 1767 | 1.72 | holdBreakB out |
| 1768 | 0.81 | holdBreakB out |
| 1769 | 1.72 | holdBreakB out |
| 1770 | 1.72 | holdBreakB out |
| 1771 | 1.72 | holdBreakB out, holdErased in |
| 1772 | 0.20 | holdErased in |
| 1773 | 0.32 | holdErased in |
| 1774 | 0.44 | holdErased in |
| 1775 | 1.31 | holdErased in |
| 1776 | 2.22 | holdErased in |
| 1777 | 1.86 | holdErased in |
| 1778 | 1.87 | holdErased in |
| 1779 | 1.86 | holdErased in |
| 1780 | 1.83 | holdErased in |
| 1808 | 0.03 | bars growing |
| 1809 | 0.04 | bars growing |
| 1810 | 0.04 | bars growing |
| 1811 | 0.02 | bars growing |
| 1812 | 0.05 | bars growing |
| 1813 | 0.06 | bars growing |
| 1814 | 0.07 | bars growing |
| 1815 | 0.03 | bars growing |
| 1816 | 0.08 | bars growing |
| 1817 | 0.10 | bars growing |
| 1818 | 0.10 | bars growing |
| 1819 | 0.04 | bars growing |
| 1820 | 0.05 | bars growing |
| 1821 | 0.06 | bars growing |
| 1822 | 0.07 | bars growing |
| 1823 | 0.03 | bars growing |
| 1824 | 0.05 | bars growing |
| 1825 | 0.06 | bars growing, holdErased out |
| 1826 | 2.37 | bars growing, holdErased out |
| 1827 | 2.33 | bars growing, holdErased out |
| 1828 | 1.41 | holdErased out |
| 1829 | 2.31 | holdErased out |
| 1830 | 2.31 | holdErased out |
| 1831 | 3.62 | holdErased out, holdPathB in |
| 1832 | 5.18 | caption, holdPathB in |
| 1833 | 0.33 | holdPathB in |
| 1834 | 0.34 | holdPathB in |
| 1835 | 2.45 | caption, holdPathB in |
| 1836 | 0.88 | holdOpen out, holdPathB in |
| 1837 | 0.90 | holdOpen out, holdPathB in |
| 1838 | 0.93 | bars growing, holdOpen out, holdPathB in |
| 1839 | 0.93 | bars growing, holdOpen out, holdPathB in |
| 1840 | 0.97 | bars growing, holdOpen out, holdPathB in |
| 1841 | 0.40 | bars growing, holdOpen out |
| 1842 | 2.33 | bars growing, holdOpen out, holdOpenC in |
| 1843 | 0.17 | bars growing, holdOpenC in |
| 1844 | 0.29 | bars growing, holdOpenC in |
| 1845 | 0.38 | bars growing, holdOpenC in |
| 1846 | 0.74 | bars growing, holdOpenC in |
| 1847 | 0.79 | bars growing, holdOpenC in |
| 1848 | 0.35 | bars growing, holdOpenC in |
| 1849 | 0.33 | bars growing, holdOpenC in |
| 1850 | 0.33 | bars growing, holdOpenC in |
| 1851 | 0.34 | bars growing, holdOpenC in |
| 1852 | 0.04 | bars growing |
| 1853 | 0.04 | bars growing |
| 1854 | 0.04 | bars growing |
| 1855 | 0.02 | bars growing |
| 1856 | 0.02 | bars growing |
| 1857 | 0.04 | bars growing |
| 1858 | 0.04 | bars growing |
| 1859 | 0.04 | bars growing |
| 1860 | 0.05 | bars growing |
| 1861 | 0.03 | bars growing |
| 1862 | 0.02 | bars growing |
| 1863 | 0.04 | bars growing |
| 1864 | 0.04 | bars growing |
| 1865 | 0.04 | bars growing |
| 1866 | 0.05 | bars growing |
| 1867 | 0.03 | bars growing |
| 1868 | 0.02 | bars growing |
| 1869 | 0.05 | bars growing |
| 1870 | 0.04 | bars growing |
| 1871 | 0.06 | bars growing |
| 1872 | 0.07 | bars growing |
| 1873 | 0.05 | bars growing |
| 1874 | 0.01 | bars growing |
| 1879 | 0.40 | holdBreakC in |
| 1880 | 0.08 | holdBreakC in |
| 1881 | 0.11 | holdBreakC in |
| 1882 | 0.75 | holdBreakC in |
| 1883 | 1.42 | holdBreakC in |
| 1884 | 3.38 | caption, holdBreakC in |
| 1885 | 1.42 | holdBreakC in |
| 1886 | 1.43 | holdBreakC in |
| 1887 | 1.43 | holdBreakC in |
| 1917 | 1.45 | holdBreakC out |
| 1918 | 1.45 | holdBreakC out |
| 1919 | 0.78 | holdBreakC out |
| 1920 | 1.45 | holdBreakC out |
| 1921 | 1.45 | holdBreakC out |
| 1922 | 1.80 | holdBreakC out, holdTrap in |
| 1923 | 1.92 | holdTrap in |
| 1924 | 1.92 | holdTrap in |
| 1925 | 1.92 | holdTrap in |
| 1926 | 1.92 | holdTrap in |
| 1949 | 2.85 | caption |
| 1956 | 5.40 | holdClose out, holdMid out, holdOpenC out, holdPathA out, holdPathB out, holdTrap out |
| 1957 | 5.39 | holdClose out, holdMid out, holdOpenC out, holdPathA out, holdPathB out, holdTrap out |
| 1958 | 4.86 | holdClose out, holdMid out, holdOpenC out, holdPathA out, holdPathB out, holdTrap out |
| 1959 | 5.40 | holdClose out, holdMid out, holdOpenC out, holdPathA out, holdPathB out, holdTrap out |
| 1960 | 5.40 | holdClose out, holdMid out, holdOpenC out, holdPathA out, holdPathB out, holdTrap out |
| 1961 | 32.80 | bars growing, chapter title, cut → 复盘（三行）, holdClose out, holdMid out, holdOpenC out, holdPathA out, holdPathB out, hold |
| 1962 | 2.59 | caption |
| 1968 | 1.49 | recResA0 in, recResA1 in, recResB0 in, recResB1 in, recResC0 in, recResC1 in |
| 1969 | 1.52 | recResA0 in, recResA1 in, recResB0 in, recResB1 in, recResC0 in, recResC1 in |
| 1970 | 1.54 | recResA0 in, recResA1 in, recResB0 in, recResB1 in, recResC0 in, recResC1 in |
| 1971 | 1.56 | recResA0 in, recResA1 in, recResB0 in, recResB1 in, recResC0 in, recResC1 in |
| 1972 | 1.55 | recResA0 in, recResA1 in, recResB0 in, recResB1 in, recResC0 in, recResC1 in |
| 1973 | 1.56 | recResA0 in, recResA1 in, recResB0 in, recResB1 in, recResC0 in, recResC1 in |
| 1984 | 0.92 | recHeadA0 in, recHeadA1 in, recHeadA2 in, recHeadB0 in, recHeadB1 in, recHeadB2 in, recHeadC0 in, recHeadC1 in, recHeadC |
| 1985 | 0.92 | recHeadA0 in, recHeadA1 in, recHeadA2 in, recHeadB0 in, recHeadB1 in, recHeadB2 in, recHeadC0 in, recHeadC1 in, recHeadC |
| 1986 | 0.94 | recHeadA0 in, recHeadA1 in, recHeadA2 in, recHeadB0 in, recHeadB1 in, recHeadB2 in, recHeadC0 in, recHeadC1 in, recHeadC |
| 1987 | 0.94 | recHeadA0 in, recHeadA1 in, recHeadA2 in, recHeadB0 in, recHeadB1 in, recHeadB2 in, recHeadC0 in, recHeadC1 in, recHeadC |
| 1988 | 0.94 | recHeadA0 in, recHeadA1 in, recHeadA2 in, recHeadB0 in, recHeadB1 in, recHeadB2 in, recHeadC0 in, recHeadC1 in, recHeadC |
| 1989 | 0.94 | recHeadA0 in, recHeadA1 in, recHeadA2 in, recHeadB0 in, recHeadB1 in, recHeadB2 in, recHeadC0 in, recHeadC1 in, recHeadC |
| 2024 | 2.59 | caption |
| 2025 | 16.16 | row focus |
| 2027 | 1.02 | caption |
| 2049 | 0.14 | recA0 in |
| 2050 | 0.14 | recA0 in |
| 2051 | 0.14 | recA0 in |
| 2052 | 0.14 | recA0 in |
| 2053 | 0.14 | recA0 in |
| 2054 | 0.84 | caption, recA0 in |
| 2072 | 0.14 | recA1 in |
| 2073 | 0.14 | recA1 in |
| 2074 | 0.15 | recA1 in |
| 2075 | 0.15 | recA1 in |
| 2076 | 0.15 | recA1 in |
| 2077 | 0.43 | caption, recA1 in |
| 2095 | 0.19 | recA2 in |
| 2096 | 0.20 | recA2 in |
| 2097 | 0.20 | recA2 in |
| 2098 | 0.20 | recA2 in |
| 2099 | 0.20 | recA2 in |
| 2100 | 1.09 | caption, recA2 in |
| 2132 | 1.27 | caption |
| 2133 | 16.46 | row focus |
| 2135 | 1.02 | caption |
| 2158 | 0.14 | recB0 in |
| 2159 | 0.15 | recB0 in |
| 2160 | 0.15 | recB0 in |
| 2161 | 0.15 | recB0 in |
| 2162 | 0.15 | recB0 in |
| 2163 | 0.84 | caption, recB0 in |
| 2180 | 0.13 | recB1 in |
| 2181 | 0.13 | recB1 in |
| 2182 | 0.13 | recB1 in |
| 2183 | 0.13 | recB1 in |
| 2184 | 0.13 | recB1 in |
| 2185 | 0.38 | caption, recB1 in |
| 2205 | 0.26 | recB2 in |
| 2206 | 0.27 | recB2 in |
| 2207 | 0.28 | recB2 in |
| 2208 | 0.28 | recB2 in |
| 2209 | 0.28 | recB2 in |
| 2210 | 1.58 | caption, recB2 in |
| 2246 | 1.80 | caption |
| 2247 | 16.71 | row focus |
| 2249 | 1.27 | caption |
| 2278 | 0.19 | recC0 in |
| 2279 | 0.19 | recC0 in |
| 2280 | 0.19 | recC0 in |
| 2281 | 0.19 | recC0 in |
| 2282 | 0.19 | recC0 in |
| 2283 | 1.03 | caption, recC0 in |
| 2307 | 0.15 | recC1 in |
| 2308 | 0.15 | recC1 in |
| 2309 | 0.15 | recC1 in |
| 2310 | 0.15 | recC1 in |
| 2311 | 0.15 | recC1 in |
| 2312 | 0.85 | caption, recC1 in |
| 2333 | 0.18 | recC2 in |
| 2334 | 0.19 | recC2 in |
| 2335 | 0.19 | recC2 in |
| 2336 | 0.19 | recC2 in |
| 2337 | 0.19 | recC2 in |
| 2338 | 0.91 | caption, recC2 in |
| 2348 | 17.02 | row focus |
| 2366 | 1.02 | caption |
| 2373 | 2.52 | recA0 out, recA1 out, recA2 out, recB0 out, recB1 out, recB2 out, recC0 out, recC1 out, recC2 out, recHeadA0 out, recHea |
| 2374 | 2.51 | recA0 out, recA1 out, recA2 out, recB0 out, recB1 out, recB2 out, recC0 out, recC1 out, recC2 out, recHeadA0 out, recHea |
| 2375 | 2.52 | recA0 out, recA1 out, recA2 out, recB0 out, recB1 out, recB2 out, recC0 out, recC1 out, recC2 out, recHeadA0 out, recHea |
| 2376 | 2.48 | recA0 out, recA1 out, recA2 out, recB0 out, recB1 out, recB2 out, recC0 out, recC1 out, recC2 out, recHeadA0 out, recHea |
| 2377 | 2.52 | recA0 out, recA1 out, recA2 out, recB0 out, recB1 out, recB2 out, recC0 out, recC1 out, recC2 out, recHeadA0 out, recHea |
| 2378 | 3.42 | chapter title, cut → 结尾（同一图层变暗）, end dim, recA0 out, recA1 out, recA2 out, recB0 out, recB1 out, recB2 out, recC0 out, r |
| 2379 | 1.03 | end dim |
| 2380 | 1.02 | end dim |
| 2381 | 1.03 | caption, end dim |
| 2382 | 1.02 | end dim |
| 2398 | 1.52 | end text |
| 2443 | 1.16 | caption, end text |
| 2480 | 5.83 | answer lit, end text, endAnsA in, endAnsB in, endAnsC in |
| 2481 | 8.61 | answer lit, end text, endAnsA in, endAnsB in, endAnsC in |
| 2482 | 10.83 | answer lit, end text, endAnsA in, endAnsB in, endAnsC in |
| 2483 | 12.38 | answer lit, end text, endAnsA in, endAnsB in, endAnsC in |
| 2484 | 13.05 | end text, endAnsA in, endAnsB in, endAnsC in |
| 2485 | 3.59 | end text, endAnsA in, endAnsB in, endAnsC in |
| 2486 | 3.31 | end text, endAnsA in, endAnsB in, endAnsC in |
| 2487 | 2.97 | end text, endAnsA in, endAnsB in, endAnsC in |
| 2488 | 1.37 | endAnsA in, endAnsB in, endAnsC in |
| 2510 | 0.61 | end text |
| 2511 | 0.62 | end text |
| 2512 | 0.61 | end text |
| 2513 | 0.61 | end text |
| 2514 | 0.62 | end text |
| 2515 | 0.61 | end text |
| 2516 | 0.62 | end text |
| 2517 | 0.62 | end text |
