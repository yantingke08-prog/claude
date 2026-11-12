# 《同一根大阳线》v3 frame-to-frame motion report

Source: full PNG sequence of the film at 1/4 scale (270×480, 2587 frames, `npm run sc3:seq`), compared pixel by pixel with the previous frame. Any non-zero difference counts as displacement.

| measure | value |
|---|---|
| frames compared | 2586 |
| frames identical to the previous one (displacement 0) | 1771 (68.5 %) |
| frames with any change | 815 |
| frames scheduled to change (draw-ins, bar growth, captions, cuts, 3D opening) | 945 |
| **changed frames with nothing scheduled (unexplained motion)** | **0** |

Rule: a frame where nothing is scheduled must be identical to the previous frame. **Pass ✓** — every still stretch has displacement 0; all motion is a scheduled annotation, bar, caption or cut.

## Longest still stretches (displacement 0)

| frames | seconds |
|---|---|
| 2494–2586 | 3.10 |
| 2375–2418 | 1.47 |
| 664–706 | 1.43 |
| 1231–1270 | 1.33 |
| 883–921 | 1.30 |
| 2420–2455 | 1.20 |
| 392–426 | 1.17 |
| 615–649 | 1.17 |
| 1965–1999 | 1.17 |
| 2187–2221 | 1.17 |
| 481–514 | 1.13 |
| 2077–2107 | 1.03 |
| 576–605 | 1.00 |
| 229–257 | 0.97 |
| 1864–1892 | 0.97 |

## Every changed frame and its scheduled cause

| frame | changed pixels (%) | cause |
|---|---|---|
| 8 | 1.64 | 3D opening, chapter title |
| 10 | 2.05 | 3D opening, caption |
| 15 | 12.98 | 3D opening |
| 16 | 14.84 | 3D opening |
| 17 | 17.33 | 3D opening |
| 18 | 13.23 | 3D opening |
| 19 | 4.05 | 3D opening |
| 20 | 3.02 | 3D opening |
| 21 | 3.23 | 3D opening |
| 22 | 2.72 | 3D opening |
| 23 | 1.88 | 3D opening |
| 24 | 1.32 | 3D opening |
| 25 | 0.98 | 3D opening |
| 26 | 0.77 | 3D opening |
| 27 | 0.86 | 3D opening |
| 28 | 0.57 | 3D opening |
| 29 | 0.54 | 3D opening |
| 30 | 0.54 | 3D opening |
| 31 | 0.39 | 3D opening |
| 37 | 98.32 | 3D opening |
| 38 | 98.27 | 3D opening |
| 39 | 97.20 | 3D opening |
| 40 | 99.37 | 3D opening |
| 51 | 0.98 | caption |
| 62 | 0.01 | bars growing |
| 63 | 0.01 | bars growing |
| 64 | 0.02 | bars growing |
| 65 | 0.01 | bars growing |
| 66 | 0.02 | bars growing |
| 67 | 0.02 | bars growing, openTurnA in |
| 68 | 0.03 | bars growing, openTurnA in |
| 69 | 0.06 | bars growing, openTurnA in |
| 70 | 0.06 | bars growing, openResA in, openTurnA in |
| 71 | 0.23 | bars growing, openResA in, openTurnA in |
| 72 | 0.98 | bars growing, openArrowA in, openResA in, openTurnA in |
| 73 | 1.43 | bars growing, openArrowA in, openResA in, openTurnA in |
| 74 | 1.17 | bars growing, openArrowA in, openResA in, openTurnA in |
| 75 | 1.52 | bars growing, openArrowA in, openResA in, openTurnA in |
| 76 | 1.37 | bars growing, openArrowA in, openResA in, openTurnA in |
| 77 | 0.51 | bars growing, openArrowA in, openResA in |
| 78 | 0.35 | bars growing, openArrowA in, openResA in |
| 79 | 0.35 | bars growing, openArrowA in, openResA in |
| 80 | 0.03 | openArrowA in |
| 81 | 0.03 | openArrowA in |
| 94 | 0.39 | caption |
| 106 | 0.03 | bars growing |
| 107 | 0.02 | bars growing, openTurnB in |
| 108 | 0.04 | bars growing, openTurnB in |
| 109 | 0.04 | bars growing, openTurnB in |
| 110 | 0.06 | bars growing, openTurnB in |
| 111 | 0.07 | bars growing, openTurnB in |
| 112 | 0.56 | bars growing, openTurnB in |
| 113 | 0.90 | bars growing, openTurnB in |
| 114 | 0.56 | bars growing, openResB in, openTurnB in |
| 115 | 1.07 | bars growing, openResB in, openTurnB in |
| 116 | 1.26 | bars growing, openArrowB in, openResB in, openTurnB in |
| 117 | 0.54 | bars growing, openArrowB in, openResB in |
| 118 | 0.59 | bars growing, openArrowB in, openResB in |
| 119 | 0.62 | bars growing, openArrowB in, openResB in |
| 120 | 0.47 | bars growing, openArrowB in, openResB in |
| 121 | 0.44 | bars growing, openArrowB in, openResB in |
| 122 | 0.33 | bars growing, openArrowB in, openResB in |
| 123 | 0.32 | bars growing, openArrowB in, openResB in |
| 124 | 0.03 | openArrowB in |
| 125 | 0.02 | openArrowB in |
| 126 | 1.54 | caption |
| 151 | 1.59 | caption |
| 152 | 0.02 | bars growing, openTurnC in |
| 153 | 0.03 | bars growing, openTurnC in |
| 154 | 0.05 | bars growing, openTurnC in |
| 155 | 0.05 | bars growing, openTurnC in |
| 156 | 0.07 | bars growing, openTurnC in |
| 157 | 0.56 | bars growing, openTurnC in |
| 158 | 0.88 | bars growing, openTurnC in |
| 159 | 0.52 | bars growing, openTurnC in |
| 160 | 0.85 | bars growing, openResC in, openTurnC in |
| 161 | 1.19 | bars growing, openResC in, openTurnC in |
| 162 | 0.57 | bars growing, openArrowC in, openResC in |
| 163 | 0.70 | bars growing, openArrowC in, openResC in |
| 164 | 0.76 | bars growing, openArrowC in, openResC in |
| 165 | 0.79 | bars growing, openArrowC in, openResC in |
| 166 | 0.47 | bars growing, openArrowC in, openResC in |
| 167 | 0.45 | bars growing, openArrowC in, openResC in |
| 168 | 0.33 | bars growing, openArrowC in, openResC in |
| 169 | 0.31 | bars growing, openArrowC in, openResC in |
| 170 | 0.03 | openArrowC in |
| 171 | 0.02 | openArrowC in |
| 191 | 2.06 | caption |
| 198 | 4.87 | openArrowA out, openArrowB out, openArrowC out, openResA out, openResB out, openResC out, openTurnA out, openTurnB out,  |
| 199 | 4.77 | openArrowA out, openArrowB out, openArrowC out, openResA out, openResB out, openResC out, openTurnA out, openTurnB out,  |
| 200 | 3.84 | openArrowA out, openArrowB out, openArrowC out, openResA out, openResB out, openResC out, openTurnA out, openTurnB out,  |
| 201 | 4.74 | openArrowA out, openArrowB out, openArrowC out, openResA out, openResB out, openResC out, openTurnA out, openTurnB out,  |
| 202 | 4.80 | openArrowA out, openArrowB out, openArrowC out, openResA out, openResB out, openResC out, openTurnA out, openTurnB out,  |
| 203 | 32.04 | bars growing, caption, chapter title, cut 三行 → 为什么（单根K线）, openArrowA out, openArrowB out, openArrowC out, openResA out,  |
| 212 | 0.03 | whyOpen in |
| 213 | 0.06 | whyOpen in |
| 214 | 0.08 | whyOpen in |
| 215 | 0.09 | whyOpen in |
| 216 | 0.50 | whyOpen in |
| 217 | 0.45 | whyClose in, whyOpen in |
| 218 | 0.48 | whyClose in, whyOpen in |
| 219 | 0.49 | whyClose in, whyOpen in |
| 220 | 0.49 | whyClose in, whyOpen in |
| 221 | 0.09 | whyClose in |
| 222 | 0.50 | whyClose in |
| 223 | 0.45 | whyClose in |
| 224 | 0.45 | whyClose in |
| 225 | 1.71 | caption, whyClose in |
| 226 | 0.42 | whyClose in |
| 228 | 3.11 | caption |
| 258 | 0.03 | whyCard in |
| 259 | 0.05 | whyCard in |
| 260 | 0.07 | whyCard in |
| 261 | 0.99 | whyCard in |
| 262 | 2.65 | whyCard in |
| 263 | 0.99 | whyCard in |
| 264 | 2.73 | whyCard in |
| 265 | 2.65 | whyCard in |
| 266 | 1.19 | whyCard in |
| 291 | 2.35 | caption |
| 295 | 0.06 | whyBody in |
| 296 | 0.10 | whyBody in |
| 297 | 0.12 | whyBody in |
| 298 | 0.14 | whyBody in |
| 299 | 0.28 | whyBody in |
| 300 | 0.16 | whyBody in |
| 301 | 0.15 | whyBody in |
| 302 | 0.14 | whyBody in |
| 303 | 0.14 | whyBody in |
| 319 | 0.46 | whyCard line |
| 320 | 0.47 | whyCard line |
| 321 | 0.47 | whyCard line |
| 322 | 0.47 | whyCard line |
| 323 | 0.47 | whyCard line |
| 324 | 1.47 | caption, whyCard line |
| 325 | 0.47 | whyCard line |
| 326 | 0.47 | whyCard line |
| 354 | 1.27 | caption |
| 358 | 3.11 | caption |
| 377 | 1.64 | whyBody out, whyCard out |
| 378 | 2.95 | whyBody out, whyCard out |
| 379 | 1.64 | whyBody out, whyCard out |
| 380 | 3.02 | whyBody out, whyCard out |
| 381 | 2.95 | whyBody out, whyCard out |
| 382 | 1.77 | whyBody out, whyCard out, whyNext in |
| 383 | 5.15 | whyNext in |
| 384 | 8.93 | whyNext in |
| 385 | 11.80 | whyNext in |
| 386 | 13.72 | whyNext in |
| 387 | 14.70 | whyNext in |
| 388 | 1.66 | whyNext in |
| 389 | 1.32 | whyNext in |
| 390 | 1.19 | whyNext in |
| 391 | 0.87 | whyNext in |
| 427 | 0.49 | whyThree in |
| 428 | 0.51 | whyThree in |
| 429 | 0.51 | whyThree in |
| 430 | 0.51 | whyThree in |
| 431 | 2.62 | caption, whyThree in |
| 432 | 0.51 | whyThree in |
| 433 | 0.51 | whyThree in |
| 434 | 0.51 | whyThree in |
| 439 | 0.35 | three item |
| 440 | 0.35 | three item |
| 441 | 0.35 | three item |
| 442 | 0.45 | three item |
| 443 | 0.35 | three item |
| 444 | 0.35 | three item |
| 445 | 0.35 | three item |
| 446 | 0.45 | three item |
| 447 | 0.35 | three item |
| 453 | 0.36 | three item |
| 454 | 0.37 | three item |
| 455 | 0.37 | three item |
| 456 | 0.47 | three item |
| 457 | 0.36 | three item |
| 458 | 0.37 | three item |
| 459 | 0.37 | three item |
| 460 | 0.47 | three item |
| 461 | 0.37 | three item |
| 467 | 0.37 | three item |
| 468 | 0.38 | three item |
| 469 | 0.37 | three item |
| 470 | 0.47 | three item |
| 471 | 0.37 | three item |
| 472 | 0.37 | three item |
| 473 | 0.38 | three item |
| 474 | 0.46 | three item |
| 475 | 0.38 | three item |
| 480 | 1.49 | caption |
| 515 | 1.27 | caption |
| 522 | 18.57 | whyClose out, whyNext out, whyOpen out, whyThree out |
| 523 | 18.25 | whyClose out, whyNext out, whyOpen out, whyThree out |
| 524 | 18.27 | whyClose out, whyNext out, whyOpen out, whyThree out |
| 525 | 18.56 | whyClose out, whyNext out, whyOpen out, whyThree out |
| 526 | 17.82 | whyClose out, whyNext out, whyOpen out, whyThree out |
| 527 | 38.68 | bars growing, caption, chapter title, cut → 01 位置（一张位置图）, whyClose out, whyNext out, whyOpen out, whyThree out |
| 541 | 0.13 | posRing0 in, posRing1 in, posRing2 in |
| 542 | 0.23 | posRing0 in, posRing1 in, posRing2 in |
| 543 | 0.28 | posRing0 in, posRing1 in, posRing2 in |
| 544 | 0.51 | posRing0 in, posRing1 in, posRing2 in |
| 545 | 0.65 | posRing0 in, posRing1 in, posRing2 in |
| 546 | 0.67 | caption, posRing0 in, posRing1 in, posRing2 in |
| 547 | 0.27 | posRing0 in, posRing1 in, posRing2 in |
| 548 | 0.38 | posRing0 in, posRing1 in, posRing2 in |
| 549 | 0.36 | posRing0 in, posRing1 in, posRing2 in |
| 567 | 0.36 | posBase in |
| 568 | 0.63 | posBase in |
| 569 | 1.60 | caption, posBase in |
| 570 | 1.44 | posBase in |
| 571 | 1.70 | posBase in |
| 572 | 4.19 | caption, posBase in |
| 573 | 0.58 | posBase in |
| 574 | 0.74 | posBase in |
| 575 | 0.74 | posBase in |
| 606 | 0.03 | posBreak in |
| 607 | 0.05 | posBreak in |
| 608 | 0.07 | posBreak in |
| 609 | 0.09 | posBreak in |
| 610 | 1.02 | posBreak in |
| 611 | 1.01 | posBreak in |
| 612 | 0.54 | posBreak in |
| 613 | 1.03 | posBreak in |
| 614 | 1.02 | posBreak in |
| 650 | 2.26 | caption |
| 655 | 0.07 | posTrend in |
| 656 | 0.12 | posTrend in |
| 657 | 0.16 | posTrend in |
| 658 | 0.18 | posTrend in |
| 659 | 0.18 | posTrend in |
| 660 | 0.60 | posTrend in |
| 661 | 0.97 | posTrend in |
| 662 | 0.59 | posTrend in |
| 663 | 0.97 | posTrend in |
| 707 | 2.59 | caption |
| 710 | 4.51 | posBase out, posBreak out, posTrend out |
| 711 | 6.90 | caption, posBase out, posBreak out, posTrend out |
| 712 | 2.99 | posBase out, posBreak out, posTrend out |
| 713 | 4.08 | posBase out, posBreak out, posTrend out |
| 714 | 4.07 | posBase out, posBreak out, posTrend out |
| 715 | 2.99 | posBase out, posBreak out, posRally in, posTrend out |
| 716 | 0.15 | posRally in |
| 717 | 0.25 | posRally in |
| 718 | 0.33 | posRally in |
| 719 | 0.39 | posRally in |
| 720 | 0.38 | posRally in |
| 721 | 0.54 | posRally in |
| 722 | 1.07 | posRally in |
| 723 | 0.51 | posRally in |
| 724 | 1.07 | posRally in |
| 743 | 0.02 | posLate in |
| 744 | 0.04 | posLate in |
| 745 | 0.05 | posLate in |
| 746 | 0.06 | posLate in |
| 747 | 0.78 | posLate in |
| 748 | 1.14 | posLate in |
| 749 | 0.79 | posLate in |
| 750 | 1.15 | posLate in |
| 751 | 1.14 | posLate in |
| 778 | 2.02 | caption |
| 792 | 1.17 | posLate out |
| 793 | 1.11 | posLate out |
| 794 | 0.79 | posLate out |
| 795 | 1.11 | posLate out |
| 796 | 1.17 | posLate out |
| 797 | 0.79 | posLast in, posLate out |
| 798 | 0.02 | posLast in |
| 799 | 0.04 | posLast in |
| 800 | 0.05 | posLast in |
| 801 | 0.99 | posLast in |
| 802 | 3.52 | posLast in |
| 803 | 1.00 | posLast in |
| 804 | 3.52 | posLast in |
| 805 | 3.52 | posLast in |
| 806 | 0.97 | posLast in |
| 808 | 0.21 | posLast line |
| 809 | 0.22 | posLast line |
| 810 | 0.22 | posLast line |
| 811 | 0.22 | posLast line |
| 812 | 0.22 | posLast line |
| 813 | 0.22 | posLast line |
| 814 | 0.22 | posLast line |
| 815 | 0.22 | posLast line |
| 841 | 3.10 | caption |
| 847 | 0.49 | caption |
| 850 | 2.54 | posLast out, posRally out |
| 851 | 7.74 | caption, posLast out, posRally out |
| 852 | 2.11 | posLast out, posRally out |
| 853 | 4.90 | posLast out, posRally out |
| 854 | 4.89 | posLast out, posRally out |
| 855 | 2.11 | posLast out, posRally out |
| 857 | 0.13 | posDown in |
| 858 | 0.23 | posDown in |
| 859 | 0.31 | posDown in |
| 860 | 0.36 | posDown in |
| 861 | 0.33 | posDown in |
| 862 | 0.56 | posDown in |
| 863 | 0.83 | posDown in |
| 864 | 0.52 | posDown in |
| 865 | 0.80 | posDown in |
| 874 | 0.46 | posBand in |
| 875 | 0.81 | posBand in |
| 876 | 1.09 | posBand in |
| 877 | 2.13 | posBand in |
| 878 | 2.63 | posBand in |
| 879 | 1.34 | posBand in |
| 880 | 0.91 | posBand in |
| 881 | 1.28 | posBand in |
| 882 | 1.27 | posBand in |
| 922 | 1.11 | posDown out |
| 923 | 1.12 | posDown out |
| 924 | 2.56 | caption, posDown out |
| 925 | 1.11 | posDown out |
| 926 | 1.11 | posDown out |
| 927 | 0.85 | posDown out, posShort in |
| 928 | 0.04 | posShort in |
| 929 | 0.07 | posShort in |
| 930 | 0.10 | posShort in |
| 931 | 0.91 | posShort in |
| 932 | 3.04 | posShort in |
| 933 | 0.91 | posShort in |
| 934 | 3.03 | posShort in |
| 935 | 3.01 | posShort in |
| 936 | 0.90 | posShort in |
| 938 | 0.31 | posShort line |
| 939 | 0.31 | posShort line |
| 940 | 0.31 | posShort line |
| 941 | 0.31 | posShort line |
| 942 | 0.31 | posShort line |
| 943 | 0.31 | posShort line |
| 944 | 0.31 | posShort line |
| 945 | 0.31 | posShort line |
| 972 | 2.33 | caption |
| 979 | 4.49 | posBand out, posRing0 out, posRing1 out, posRing2 out, posShort out |
| 980 | 6.43 | posBand out, posRing0 out, posRing1 out, posRing2 out, posShort out |
| 981 | 4.07 | posBand out, posRing0 out, posRing1 out, posRing2 out, posShort out |
| 982 | 6.43 | posBand out, posRing0 out, posRing1 out, posRing2 out, posShort out |
| 983 | 6.43 | posBand out, posRing0 out, posRing1 out, posRing2 out, posShort out |
| 984 | 26.38 | bars growing, caption, chapter title, cut → 02 量能（三列成交量）, posBand out, posRing0 out, posRing1 out, posRing2 out, posShor |
| 1003 | 0.28 | caption |
| 1005 | 0.05 | volAvgA in, volAvgB in, volAvgC in |
| 1006 | 0.09 | volAvgA in, volAvgB in, volAvgC in |
| 1007 | 0.11 | volAvgA in, volAvgB in, volAvgC in |
| 1008 | 0.13 | volAvgA in, volAvgB in, volAvgC in |
| 1009 | 0.62 | volAvgA in, volAvgB in, volAvgC in |
| 1010 | 0.54 | volAvgA in, volAvgB in, volAvgC in |
| 1011 | 0.54 | volAvgA in, volAvgB in, volAvgC in |
| 1012 | 0.54 | volAvgA in, volAvgB in, volAvgC in |
| 1013 | 0.50 | volAvgA in, volAvgB in, volAvgC in |
| 1025 | 0.76 | caption |
| 1028 | 1.55 | caption |
| 1035 | 21.81 | column focus, volRatioA in |
| 1036 | 0.41 | volRatioA in |
| 1037 | 0.42 | volRatioA in |
| 1038 | 0.42 | volRatioA in |
| 1039 | 0.43 | volRatioA in |
| 1040 | 0.42 | volRatioA in |
| 1041 | 0.01 | volRatioA in |
| 1042 | 0.01 | volRatioA in |
| 1043 | 0.00 | volRatioA in |
| 1044 | 0.00 | volRatioA in |
| 1065 | 2.73 | caption |
| 1073 | 0.45 | volChipA in, volChipA line |
| 1074 | 0.50 | volChipA in, volChipA line |
| 1075 | 0.62 | volChipA in, volChipA line |
| 1076 | 0.62 | volChipA in, volChipA line |
| 1077 | 0.62 | volChipA in, volChipA line |
| 1078 | 0.50 | volChipA in, volChipA line |
| 1079 | 0.36 | volChipA in, volChipA line |
| 1080 | 0.36 | volChipA in, volChipA line |
| 1108 | 0.36 | bars growing, volChipA line |
| 1109 | 0.36 | bars growing, volChipA line |
| 1110 | 0.42 | bars growing, volChipA line |
| 1111 | 0.36 | bars growing, volChipA line |
| 1112 | 0.41 | bars growing, volChipA line |
| 1113 | 0.36 | bars growing, volChipA line |
| 1114 | 0.36 | bars growing, volChipA line |
| 1115 | 0.41 | bars growing, volChipA line |
| 1116 | 0.01 | bars growing |
| 1117 | 0.08 | bars growing |
| 1118 | 0.01 | bars growing |
| 1119 | 0.08 | bars growing |
| 1131 | 3.03 | caption |
| 1145 | 0.76 | caption |
| 1149 | 2.33 | caption |
| 1162 | 0.95 | volChipA out |
| 1163 | 0.86 | volChipA out |
| 1164 | 0.86 | volChipA out |
| 1165 | 0.95 | volChipA out |
| 1166 | 0.86 | volChipA out |
| 1167 | 22.04 | column focus, volChipA out, volRatioB in |
| 1168 | 0.43 | volRatioB in |
| 1169 | 0.46 | volRatioB in |
| 1170 | 0.48 | volRatioB in |
| 1171 | 0.50 | volRatioB in |
| 1172 | 0.46 | volRatioB in |
| 1173 | 0.01 | volRatioB in |
| 1174 | 0.01 | volRatioB in |
| 1175 | 0.01 | volRatioB in |
| 1176 | 0.00 | volRatioB in |
| 1198 | 2.26 | caption |
| 1211 | 0.33 | bars growing, volChipB in, volChipB line |
| 1212 | 0.36 | bars growing, volChipB in, volChipB line |
| 1213 | 0.59 | bars growing, volChipB in, volChipB line |
| 1214 | 0.48 | bars growing, volChipB in, volChipB line |
| 1215 | 0.56 | bars growing, volChipB in, volChipB line |
| 1216 | 0.36 | bars growing, volChipB in, volChipB line |
| 1217 | 0.23 | bars growing, volChipB in, volChipB line |
| 1218 | 0.31 | bars growing, volChipB in, volChipB line |
| 1219 | 0.01 | bars growing, volChipB in |
| 1220 | 0.11 | bars growing |
| 1221 | 0.01 | bars growing |
| 1222 | 0.09 | bars growing, volChipB line |
| 1223 | 0.21 | volChipB line |
| 1224 | 0.21 | volChipB line |
| 1225 | 0.21 | volChipB line |
| 1226 | 0.21 | volChipB line |
| 1227 | 0.21 | volChipB line |
| 1228 | 0.21 | volChipB line |
| 1229 | 0.21 | volChipB line |
| 1230 | 0.21 | volChipB line |
| 1271 | 3.00 | caption |
| 1284 | 0.76 | caption |
| 1288 | 1.55 | caption |
| 1293 | 0.67 | volChipB out |
| 1294 | 0.56 | volChipB out |
| 1295 | 0.56 | volChipB out |
| 1296 | 0.66 | volChipB out |
| 1297 | 0.56 | volChipB out |
| 1298 | 22.32 | column focus, volChipB out, volRatioC in |
| 1299 | 0.42 | volRatioC in |
| 1300 | 0.42 | volRatioC in |
| 1301 | 0.43 | volRatioC in |
| 1302 | 0.43 | volRatioC in |
| 1303 | 0.42 | volRatioC in |
| 1304 | 0.00 | volRatioC in |
| 1305 | 0.00 | volRatioC in |
| 1306 | 0.00 | volRatioC in |
| 1329 | 1.86 | caption |
| 1355 | 0.39 | bars growing, volChipC in, volChipC line |
| 1356 | 0.46 | bars growing, volChipC in, volChipC line |
| 1357 | 0.53 | bars growing, volChipC in, volChipC line |
| 1358 | 0.50 | bars growing, volChipC in, volChipC line |
| 1359 | 0.54 | bars growing, volChipC in, volChipC line |
| 1360 | 0.46 | bars growing, volChipC in, volChipC line |
| 1361 | 0.33 | bars growing, volChipC in, volChipC line |
| 1362 | 0.37 | bars growing, volChipC in, volChipC line |
| 1363 | 0.01 | bars growing, volChipC in |
| 1364 | 0.06 | bars growing |
| 1365 | 0.01 | bars growing |
| 1366 | 0.07 | bars growing |
| 1381 | 2.59 | caption |
| 1388 | 2.55 | volAvgA out, volAvgB out, volAvgC out, volChipC out, volRatioA out, volRatioB out, volRatioC out |
| 1389 | 2.44 | volAvgA out, volAvgB out, volAvgC out, volChipC out, volRatioA out, volRatioB out, volRatioC out |
| 1390 | 2.50 | volAvgA out, volAvgB out, volAvgC out, volChipC out, volRatioA out, volRatioB out, volRatioC out |
| 1391 | 2.54 | volAvgA out, volAvgB out, volAvgC out, volChipC out, volRatioA out, volRatioB out, volRatioC out |
| 1392 | 2.50 | volAvgA out, volAvgB out, volAvgC out, volChipC out, volRatioA out, volRatioB out, volRatioC out |
| 1393 | 34.22 | bars growing, caption, chapter title, cut → 03 承接（一张大图 + 路径）, volAvgA out, volAvgB out, volAvgC out, volChipC out, volRa |
| 1416 | 1.46 | caption |
| 1438 | 0.07 | holdOpen in |
| 1439 | 0.12 | holdOpen in |
| 1440 | 0.16 | holdOpen in |
| 1441 | 0.19 | holdOpen in |
| 1442 | 0.60 | holdOpen in |
| 1443 | 0.45 | holdOpen in |
| 1444 | 0.45 | holdOpen in |
| 1445 | 0.44 | holdOpen in |
| 1446 | 0.42 | holdOpen in |
| 1448 | 0.03 | holdClose in |
| 1449 | 0.06 | holdClose in |
| 1450 | 0.08 | holdClose in |
| 1451 | 0.09 | holdClose in |
| 1452 | 0.50 | holdClose in |
| 1453 | 0.45 | holdClose in |
| 1454 | 0.44 | holdClose in |
| 1455 | 0.44 | holdClose in |
| 1456 | 1.89 | caption, holdClose in |
| 1482 | 0.76 | caption |
| 1485 | 2.85 | caption |
| 1514 | 0.06 | holdBody in |
| 1515 | 0.10 | holdBody in |
| 1516 | 0.12 | holdBody in |
| 1517 | 0.14 | holdBody in |
| 1518 | 0.49 | holdBody in |
| 1519 | 0.37 | holdBody in |
| 1520 | 0.36 | holdBody in |
| 1521 | 0.36 | holdBody in |
| 1522 | 0.35 | holdBody in |
| 1543 | 2.22 | caption |
| 1546 | 0.20 | holdMid in |
| 1547 | 0.36 | holdMid in |
| 1548 | 0.47 | holdMid in |
| 1549 | 0.56 | holdMid in |
| 1550 | 1.10 | holdMid in |
| 1551 | 0.72 | holdMid in |
| 1552 | 0.71 | holdMid in |
| 1553 | 0.70 | holdMid in |
| 1554 | 0.65 | holdMid in |
| 1572 | 1.27 | caption |
| 1574 | 0.49 | holdBody out |
| 1575 | 0.49 | holdBody out |
| 1576 | 0.49 | holdBody out |
| 1577 | 3.25 | caption, holdBody out |
| 1578 | 0.49 | holdBody out |
| 1579 | 0.49 | holdBody out |
| 1580 | 0.02 | bars growing |
| 1581 | 0.03 | bars growing |
| 1582 | 0.03 | bars growing |
| 1583 | 0.03 | bars growing |
| 1584 | 0.03 | bars growing |
| 1585 | 0.03 | bars growing |
| 1586 | 0.03 | bars growing |
| 1587 | 0.02 | bars growing |
| 1588 | 0.00 | bars growing |
| 1589 | 0.02 | bars growing |
| 1590 | 0.03 | bars growing |
| 1591 | 0.03 | bars growing |
| 1592 | 0.03 | bars growing |
| 1593 | 0.04 | bars growing |
| 1594 | 0.03 | bars growing |
| 1595 | 0.04 | bars growing |
| 1596 | 0.03 | bars growing |
| 1597 | 0.00 | bars growing |
| 1598 | 0.02 | bars growing |
| 1599 | 0.02 | bars growing |
| 1600 | 0.02 | bars growing |
| 1601 | 0.02 | bars growing |
| 1602 | 0.03 | bars growing |
| 1603 | 0.03 | bars growing |
| 1604 | 0.03 | bars growing |
| 1605 | 0.02 | bars growing |
| 1606 | 0.00 | bars growing |
| 1607 | 0.04 | bars growing |
| 1608 | 0.04 | bars growing |
| 1609 | 0.05 | bars growing |
| 1610 | 0.05 | bars growing |
| 1611 | 0.05 | bars growing |
| 1612 | 0.06 | bars growing |
| 1613 | 0.05 | bars growing |
| 1614 | 0.03 | bars growing |
| 1615 | 0.01 | bars growing |
| 1616 | 0.02 | bars growing, holdPullA in |
| 1617 | 0.06 | bars growing, holdPullA in |
| 1618 | 0.08 | bars growing, holdPullA in |
| 1619 | 0.09 | bars growing, holdPullA in |
| 1620 | 0.11 | bars growing, holdPullA in |
| 1621 | 0.57 | bars growing, holdPullA in |
| 1622 | 0.88 | bars growing, holdPullA in |
| 1623 | 0.52 | bars growing, holdPullA in |
| 1624 | 0.87 | bars growing, holdPullA in |
| 1625 | 0.89 | bars growing, holdPullA in |
| 1626 | 0.03 | bars growing |
| 1627 | 0.03 | bars growing |
| 1628 | 0.03 | bars growing |
| 1629 | 0.03 | bars growing |
| 1630 | 0.03 | bars growing |
| 1631 | 0.03 | bars growing |
| 1632 | 0.02 | bars growing |
| 1633 | 0.00 | bars growing |
| 1651 | 0.46 | holdChipA in, holdChipA line |
| 1652 | 0.50 | holdChipA in, holdChipA line |
| 1653 | 1.79 | holdChipA in, holdChipA line |
| 1654 | 0.50 | holdChipA in, holdChipA line |
| 1655 | 1.79 | holdChipA in, holdChipA line |
| 1656 | 3.73 | caption, holdChipA in, holdChipA line |
| 1657 | 0.24 | holdChipA in, holdChipA line |
| 1658 | 0.24 | holdChipA in, holdChipA line |
| 1661 | 0.40 | holdChipA line |
| 1662 | 0.40 | holdChipA line |
| 1663 | 0.40 | holdChipA line |
| 1664 | 0.40 | holdChipA line |
| 1665 | 0.40 | holdChipA line |
| 1666 | 0.40 | holdChipA line |
| 1667 | 0.40 | holdChipA line |
| 1668 | 0.40 | holdChipA line |
| 1696 | 2.70 | holdChipA out, holdPullA out |
| 1697 | 2.67 | holdChipA out, holdPullA out |
| 1698 | 1.41 | holdChipA out, holdPullA out |
| 1699 | 2.66 | holdChipA out, holdPullA out |
| 1700 | 2.67 | holdChipA out, holdPullA out |
| 1701 | 2.22 | holdChipA out, holdPathA in, holdPullA out |
| 1702 | 2.13 | bars growing, caption, holdPathA in |
| 1703 | 0.30 | bars growing, holdPathA in |
| 1704 | 0.34 | bars growing, holdPathA in |
| 1705 | 1.77 | bars growing, caption, holdPathA in |
| 1706 | 0.64 | bars growing, holdPathA in |
| 1707 | 0.32 | bars growing, holdBreakB in, holdPathA in |
| 1708 | 0.33 | holdBreakB in, holdPathA in |
| 1709 | 0.37 | holdBreakB in, holdPathA in |
| 1710 | 0.36 | holdBreakB in, holdPathA in |
| 1711 | 0.08 | holdBreakB in |
| 1712 | 0.84 | holdBreakB in |
| 1713 | 1.79 | holdBreakB in |
| 1714 | 0.81 | holdBreakB in |
| 1715 | 1.80 | holdBreakB in |
| 1716 | 1.82 | holdBreakB in |
| 1738 | 2.80 | caption |
| 1742 | 1.87 | holdBreakB out |
| 1743 | 1.83 | holdBreakB out |
| 1744 | 0.82 | holdBreakB out |
| 1745 | 1.83 | holdBreakB out |
| 1746 | 1.83 | holdBreakB out |
| 1747 | 0.81 | holdBreakB out, holdErased in |
| 1748 | 0.23 | holdErased in |
| 1749 | 0.35 | holdErased in |
| 1750 | 0.46 | holdErased in |
| 1751 | 1.36 | holdErased in |
| 1752 | 2.41 | holdErased in |
| 1753 | 1.94 | holdErased in |
| 1754 | 1.03 | holdErased in |
| 1755 | 1.92 | holdErased in |
| 1756 | 1.89 | holdErased in |
| 1784 | 0.04 | bars growing |
| 1785 | 0.05 | bars growing |
| 1786 | 0.05 | bars growing |
| 1787 | 0.03 | bars growing |
| 1788 | 0.06 | bars growing |
| 1789 | 0.07 | bars growing |
| 1790 | 0.08 | bars growing |
| 1791 | 0.04 | bars growing |
| 1792 | 0.11 | bars growing |
| 1793 | 0.13 | bars growing |
| 1794 | 0.13 | bars growing |
| 1795 | 0.07 | bars growing |
| 1796 | 0.06 | bars growing |
| 1797 | 0.07 | bars growing |
| 1798 | 0.08 | bars growing |
| 1799 | 0.03 | bars growing |
| 1800 | 0.06 | bars growing |
| 1801 | 0.07 | bars growing, holdErased out |
| 1802 | 2.52 | bars growing, holdErased out |
| 1803 | 2.49 | bars growing, holdErased out |
| 1804 | 1.57 | holdErased out |
| 1805 | 2.46 | holdErased out |
| 1806 | 2.42 | holdErased out |
| 1807 | 3.11 | holdErased out, holdPathB in |
| 1808 | 3.47 | caption, holdPathB in |
| 1809 | 0.29 | holdPathB in |
| 1810 | 0.29 | holdPathB in |
| 1811 | 2.26 | caption, holdPathB in |
| 1812 | 0.59 | holdPathB in |
| 1813 | 0.32 | holdPathB in |
| 1814 | 0.35 | bars growing, holdPathB in |
| 1815 | 0.36 | bars growing, holdPathB in |
| 1816 | 0.37 | bars growing, holdPathB in |
| 1817 | 0.05 | bars growing |
| 1818 | 0.03 | bars growing, holdOpenC in |
| 1819 | 0.25 | bars growing, holdOpenC in |
| 1820 | 0.44 | bars growing, holdOpenC in |
| 1821 | 0.58 | bars growing, holdOpenC in |
| 1822 | 0.68 | bars growing, holdOpenC in |
| 1823 | 1.13 | bars growing, holdOpenC in |
| 1824 | 0.54 | bars growing, holdOpenC in |
| 1825 | 0.50 | bars growing, holdOpenC in |
| 1826 | 0.51 | bars growing, holdOpenC in |
| 1827 | 0.51 | bars growing, holdOpenC in |
| 1828 | 0.04 | bars growing |
| 1829 | 0.05 | bars growing |
| 1830 | 0.05 | bars growing |
| 1831 | 0.03 | bars growing |
| 1832 | 0.03 | bars growing |
| 1833 | 0.05 | bars growing |
| 1834 | 0.05 | bars growing |
| 1835 | 0.06 | bars growing |
| 1836 | 0.06 | bars growing |
| 1837 | 0.04 | bars growing |
| 1838 | 0.03 | bars growing |
| 1839 | 0.04 | bars growing |
| 1840 | 0.04 | bars growing |
| 1841 | 0.05 | bars growing |
| 1842 | 0.06 | bars growing |
| 1843 | 0.04 | bars growing |
| 1844 | 0.03 | bars growing |
| 1845 | 0.06 | bars growing |
| 1846 | 0.05 | bars growing |
| 1847 | 0.06 | bars growing |
| 1848 | 0.07 | bars growing |
| 1849 | 0.05 | bars growing |
| 1850 | 0.01 | bars growing |
| 1855 | 0.02 | holdBreakC in |
| 1856 | 0.04 | holdBreakC in |
| 1857 | 0.06 | holdBreakC in |
| 1858 | 0.07 | holdBreakC in |
| 1859 | 1.06 | holdBreakC in |
| 1860 | 3.26 | caption, holdBreakC in |
| 1861 | 0.73 | holdBreakC in |
| 1862 | 1.32 | holdBreakC in |
| 1863 | 1.33 | holdBreakC in |
| 1893 | 1.68 | holdBreakC out |
| 1894 | 1.33 | holdBreakC out |
| 1895 | 0.73 | holdBreakC out |
| 1896 | 1.34 | holdBreakC out |
| 1897 | 1.33 | holdBreakC out |
| 1898 | 0.73 | holdBreakC out, holdTrap in |
| 1899 | 2.83 | holdTrap in |
| 1900 | 2.83 | holdTrap in |
| 1901 | 2.56 | holdTrap in |
| 1902 | 2.45 | holdTrap in |
| 1903 | 0.38 | holdTrap in |
| 1925 | 2.85 | caption |
| 1932 | 6.49 | holdClose out, holdMid out, holdOpen out, holdOpenC out, holdPathA out, holdPathB out, holdTrap out |
| 1933 | 6.69 | holdClose out, holdMid out, holdOpen out, holdOpenC out, holdPathA out, holdPathB out, holdTrap out |
| 1934 | 6.74 | holdClose out, holdMid out, holdOpen out, holdOpenC out, holdPathA out, holdPathB out, holdTrap out |
| 1935 | 5.84 | holdClose out, holdMid out, holdOpen out, holdOpenC out, holdPathA out, holdPathB out, holdTrap out |
| 1936 | 6.77 | holdClose out, holdMid out, holdOpen out, holdOpenC out, holdPathA out, holdPathB out, holdTrap out |
| 1937 | 35.69 | bars growing, chapter title, cut → 复盘（三行）, holdClose out, holdMid out, holdOpen out, holdOpenC out, holdPathA out, holdP |
| 1938 | 2.59 | caption |
| 1944 | 0.69 | recResA in, recResB in, recResC in |
| 1945 | 1.32 | recResA in, recResB in, recResC in |
| 1946 | 1.52 | recResA in, recResB in, recResC in |
| 1947 | 1.54 | recResA in, recResB in, recResC in |
| 1948 | 1.52 | recResA in, recResB in, recResC in |
| 1949 | 0.85 | recResA in, recResB in, recResC in |
| 1950 | 0.82 | recResA in, recResB in, recResC in |
| 1951 | 0.85 | recResA in, recResB in, recResC in |
| 1952 | 0.86 | recResA in, recResB in, recResC in |
| 1960 | 0.91 | recHeadA in, recHeadB in, recHeadC in |
| 1961 | 0.91 | recHeadA in, recHeadB in, recHeadC in |
| 1962 | 0.91 | recHeadA in, recHeadB in, recHeadC in |
| 1963 | 0.91 | recHeadA in, recHeadB in, recHeadC in |
| 1964 | 0.90 | recHeadA in, recHeadB in, recHeadC in |
| 2000 | 2.59 | caption |
| 2001 | 16.54 | row focus |
| 2003 | 1.02 | caption |
| 2025 | 0.16 | recA0 in |
| 2026 | 0.16 | recA0 in |
| 2027 | 0.16 | recA0 in |
| 2028 | 0.16 | recA0 in |
| 2029 | 0.16 | recA0 in |
| 2030 | 0.70 | caption, recA0 in |
| 2048 | 0.15 | recA1 in |
| 2049 | 0.15 | recA1 in |
| 2050 | 0.15 | recA1 in |
| 2051 | 0.15 | recA1 in |
| 2052 | 0.15 | recA1 in |
| 2053 | 0.28 | caption, recA1 in |
| 2071 | 0.22 | recA2 in |
| 2072 | 0.22 | recA2 in |
| 2073 | 0.22 | recA2 in |
| 2074 | 0.22 | recA2 in |
| 2075 | 0.22 | recA2 in |
| 2076 | 0.90 | caption, recA2 in |
| 2108 | 1.27 | caption |
| 2109 | 16.90 | row focus |
| 2111 | 1.02 | caption |
| 2134 | 0.15 | recB0 in |
| 2135 | 0.15 | recB0 in |
| 2136 | 0.15 | recB0 in |
| 2137 | 0.15 | recB0 in |
| 2138 | 0.15 | recB0 in |
| 2139 | 0.70 | caption, recB0 in |
| 2156 | 0.15 | recB1 in |
| 2157 | 0.15 | recB1 in |
| 2158 | 0.15 | recB1 in |
| 2159 | 0.15 | recB1 in |
| 2160 | 0.15 | recB1 in |
| 2161 | 0.25 | caption, recB1 in |
| 2181 | 0.30 | recB2 in |
| 2182 | 0.30 | recB2 in |
| 2183 | 0.30 | recB2 in |
| 2184 | 0.30 | recB2 in |
| 2185 | 0.30 | recB2 in |
| 2186 | 1.30 | caption, recB2 in |
| 2222 | 1.80 | caption |
| 2223 | 17.15 | row focus |
| 2225 | 1.27 | caption |
| 2254 | 0.21 | recC0 in |
| 2255 | 0.21 | recC0 in |
| 2256 | 0.21 | recC0 in |
| 2257 | 0.21 | recC0 in |
| 2258 | 0.21 | recC0 in |
| 2259 | 0.84 | caption, recC0 in |
| 2283 | 0.16 | recC1 in |
| 2284 | 0.16 | recC1 in |
| 2285 | 0.16 | recC1 in |
| 2286 | 0.16 | recC1 in |
| 2287 | 0.16 | recC1 in |
| 2288 | 0.70 | caption, recC1 in |
| 2309 | 0.21 | recC2 in |
| 2310 | 0.21 | recC2 in |
| 2311 | 0.21 | recC2 in |
| 2312 | 0.21 | recC2 in |
| 2313 | 0.21 | recC2 in |
| 2314 | 0.72 | caption, recC2 in |
| 2324 | 17.51 | row focus |
| 2342 | 1.02 | caption |
| 2349 | 4.17 | recA0 out, recA1 out, recA2 out, recB0 out, recB1 out, recB2 out, recC0 out, recC1 out, recC2 out, recHeadA out, recHead |
| 2350 | 4.16 | recA0 out, recA1 out, recA2 out, recB0 out, recB1 out, recB2 out, recC0 out, recC1 out, recC2 out, recHeadA out, recHead |
| 2351 | 4.17 | recA0 out, recA1 out, recA2 out, recB0 out, recB1 out, recB2 out, recC0 out, recC1 out, recC2 out, recHeadA out, recHead |
| 2352 | 4.13 | recA0 out, recA1 out, recA2 out, recB0 out, recB1 out, recB2 out, recC0 out, recC1 out, recC2 out, recHeadA out, recHead |
| 2353 | 4.16 | recA0 out, recA1 out, recA2 out, recB0 out, recB1 out, recB2 out, recC0 out, recC1 out, recC2 out, recHeadA out, recHead |
| 2354 | 5.07 | chapter title, cut → 结尾（三行变暗，同一图层）, end dim, recA0 out, recA1 out, recA2 out, recB0 out, recB1 out, recB2 out, recC0 out |
| 2355 | 1.05 | end dim |
| 2356 | 1.05 | end dim |
| 2357 | 1.05 | caption, end dim |
| 2358 | 1.05 | end dim |
| 2374 | 1.52 | end text |
| 2419 | 1.16 | caption, end text |
| 2456 | 5.86 | answer lit, end text, endAnsA in, endAnsB in, endAnsC in |
| 2457 | 8.82 | answer lit, end text, endAnsA in, endAnsB in, endAnsC in |
| 2458 | 11.02 | answer lit, end text, endAnsA in, endAnsB in, endAnsC in |
| 2459 | 12.57 | answer lit, end text, endAnsA in, endAnsB in, endAnsC in |
| 2460 | 12.51 | end text, endAnsA in, endAnsB in, endAnsC in |
| 2461 | 3.65 | end text, endAnsA in, endAnsB in, endAnsC in |
| 2462 | 3.37 | end text, endAnsA in, endAnsB in, endAnsC in |
| 2463 | 3.14 | end text, endAnsA in, endAnsB in, endAnsC in |
| 2464 | 1.46 | endAnsA in, endAnsB in, endAnsC in |
| 2486 | 0.62 | end text |
| 2487 | 0.62 | end text |
| 2488 | 0.62 | end text |
| 2489 | 0.62 | end text |
| 2490 | 0.62 | end text |
| 2491 | 0.62 | end text |
| 2492 | 0.62 | end text |
| 2493 | 0.62 | end text |
