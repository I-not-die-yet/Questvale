// Original, integer-aligned pixel art for the exploration map.
const rect = (c, color, x, y, w, h) => { c.fillStyle = color; c.fillRect(x, y, w, h); };

export function drawTree(c, x, y, variant = 0) {
  x = Math.round(x); y = Math.round(y);
  c.save(); c.translate(x, y);
  rect(c, '#425c45', -12, -3, 25, 3);
  rect(c, '#503d2e', -3, -15, 7, 13);
  rect(c, '#856344', -2, -14, 3, 11);
  const dark = variant % 2 ? '#315c50' : '#345d42';
  const mid = variant % 2 ? '#477d67' : '#4e8050';
  const light = variant % 2 ? '#70a27e' : '#80a85d';
  rect(c, dark, -10, -40, 20, 3);
  rect(c, dark, -14, -36, 28, 5);
  rect(c, dark, -16, -31, 32, 14);
  rect(c, dark, -13, -17, 26, 5);
  rect(c, dark, -9, -12, 18, 3);
  rect(c, mid, -10, -37, 19, 4);
  rect(c, mid, -14, -32, 27, 13);
  rect(c, mid, -10, -19, 20, 5);
  rect(c, light, -9, -34, 8, 3);
  rect(c, light, -13, -29, 7, 4);
  rect(c, light, 1, -35, 6, 3);
  rect(c, light, 5, -28, 7, 3);
  rect(c, '#a4be74', -6, -36, 5, 2);
  rect(c, dark, -11, -22, 4, 2);
  rect(c, dark, 2, -16, 6, 2);
  c.restore();
}

function base(c, wall, trim) {
  // Every mark, including the grounding shadow, remains inside 160 × 128.
  rect(c, '#557052', 3, 121, 154, 7);
  rect(c, '#3c4740', 7, 96, 146, 27);
  rect(c, wall, 10, 96, 140, 25);
  rect(c, trim, 10, 98, 140, 4);
  rect(c, '#34453e', 10, 119, 140, 4);
  rect(c, '#2c3e3b', 69, 105, 22, 18);
  rect(c, '#7d6747', 72, 107, 16, 16);
  rect(c, '#31473f', 74, 109, 12, 14);
  rect(c, '#d7bd75', 84, 115, 2, 2);
  rect(c, '#c5b588', 65, 123, 30, 2);
}
function window(c, x, y) {
  rect(c, '#364c49', x, y, 19, 12);
  rect(c, '#9ec4bb', x + 2, y + 2, 15, 8);
  rect(c, '#d2ded0', x + 3, y + 2, 4, 2);
  rect(c, '#527b76', x + 9, y + 2, 2, 8);
}
function roofOutline(c, color) {
  rect(c, '#34473f', 4, 25, 152, 72);
  rect(c, '#34473f', 10, 17, 140, 82);
  rect(c, color, 10, 23, 140, 70);
  rect(c, color, 16, 17, 128, 78);
}
function rooftopDetail(c, x, y, w, h) {
  rect(c, '#334e4a', x + 2, y + 3, w, h);
  rect(c, '#c3cdc0', x, y, w, h);
  rect(c, '#6f8983', x + 3, y + 3, w - 6, h - 6);
  rect(c, '#a6bab0', x + 5, y + 5, w - 10, 2);
}

export function drawBuilding(c, category, x, y) {
  x = Math.round(x); y = Math.round(y);
  c.save(); c.translate(x, y);
  if (category === 'hackathon') {
    base(c, '#cfbc8e', '#eee0b7');
    window(c, 22, 105); window(c, 119, 105);
    roofOutline(c, '#527f98');
    // Repeating offset ridges suggest a sawtooth workshop roof from above.
    for (let i = 0; i < 4; i++) {
      const rx = 14 + i * 34;
      rect(c, '#31576b', rx, 21, 5, 69);
      rect(c, '#79a8b5', rx + 5, 21, 25, 4);
      rect(c, '#6596aa', rx + 5, 25, 25, 58);
      rect(c, '#b6d1c8', rx + 7, 30, 21, 8);
      rect(c, '#426c80', rx + 7, 38, 21, 3);
      rect(c, '#426c80', rx + 14, 30, 2, 8);
      rect(c, '#426c80', rx + 23, 30, 2, 8);
      rect(c, '#7babb4', rx + 8, 53, 19, 2);
      rect(c, '#456e80', rx + 6, 83, 24, 5);
    }
    rooftopDetail(c, 115, 62, 17, 14);
  } else if (category === 'business') {
    base(c, '#c8ad86', '#ead4ac');
    window(c, 22, 105); window(c, 119, 105);
    roofOutline(c, '#a45e4b');
    rect(c, '#c67d60', 16, 20, 128, 5);
    for (let row = 0; row < 7; row++) {
      const yy = 29 + row * 9;
      rect(c, '#814b40', 16, yy, 128, 2);
      for (let xx = 20 + (row % 2) * 11; xx < 140; xx += 22) {
        rect(c, '#864e42', xx, yy + 2, 2, 5);
        rect(c, '#cb8466', xx + 4, yy + 3, 10, 1);
      }
    }
    rect(c, '#d39b76', 72, 19, 16, 73);
    rect(c, '#e6bd91', 76, 19, 8, 73);
    rooftopDetail(c, 30, 47, 21, 18);
    rooftopDetail(c, 109, 47, 21, 18);
  } else if (category === 'startup') {
    base(c, '#d9c9a1', '#f4e6c1');
    window(c, 22, 105); window(c, 119, 105);
    roofOutline(c, '#cf8148');
    rect(c, '#f0aa61', 15, 22, 130, 66);
    for (let i = 0; i < 8; i++) {
      const rx = 16 + i * 16;
      rect(c, i % 2 ? '#da8850' : '#f2b56c', rx, 23, 16, 64);
      rect(c, '#ae6844', rx, 87, 16, 6);
      rect(c, i % 2 ? '#c87947' : '#e4a15d', rx, 87, 14, 4);
    }
    rect(c, '#ffe0a0', 23, 28, 113, 3);
    rect(c, '#ba6c42', 24, 74, 111, 3);
    rooftopDetail(c, 56, 40, 48, 27);
    rect(c, '#b1d2c8', 62, 45, 36, 16);
    rect(c, '#6a9690', 79, 45, 2, 16);
    rect(c, '#dfede0', 64, 47, 12, 2);
  } else {
    base(c, '#bdd0bd', '#e3e6cf');
    window(c, 22, 105); window(c, 119, 105);
    roofOutline(c, '#51877e');
    rect(c, '#71a69a', 16, 23, 128, 67);
    rect(c, '#43756f', 16, 82, 128, 8);
    for (let xx = 20; xx < 140; xx += 16) {
      rect(c, '#89b9a9', xx, 28, 10, 2);
      rect(c, '#5a9488', xx + 4, 70, 8, 2);
    }
    // Stepped dome, viewed from above.
    rect(c, '#345a59', 48, 31, 64, 51);
    rect(c, '#345a59', 55, 25, 50, 63);
    rect(c, '#b9d4c7', 54, 30, 52, 50);
    rect(c, '#b9d4c7', 61, 25, 38, 61);
    rect(c, '#e0e9d8', 61, 30, 38, 48);
    rect(c, '#91b9ad', 55, 40, 50, 4);
    rect(c, '#91b9ad', 55, 67, 50, 4);
    rect(c, '#567e79', 77, 28, 6, 55);
    rect(c, '#345a59', 78, 31, 4, 49);
    rect(c, '#f3f1da', 65, 33, 7, 4);
    rooftopDetail(c, 19, 50, 15, 14);
  }
  c.restore();
}

export function drawPlayer(c, x, y, facing = 'down', step = 0) {
  x = Math.round(x); y = Math.round(y);
  const stride = Math.floor(step) % 2 === 0;
  c.save(); c.translate(x, y);
  rect(c, '#344c3e', -6, -2, 12, 2);
  rect(c, '#2f3434', -5, -6, 4, 5 + (stride ? 0 : 1));
  rect(c, '#2f3434', 1, -6, 4, 5 + (stride ? 1 : 0));
  rect(c, '#52675e', -5, -8, 10, 4);
  rect(c, '#285d60', -6, -15, 12, 8);
  rect(c, '#3d8883', -5, -15, 10, 7);
  if (facing === 'up') {
    rect(c, '#a97935', -4, -14, 8, 7);
    rect(c, '#d9aa55', -3, -13, 6, 5);
    rect(c, '#735329', -3, -9, 6, 1);
  } else if (facing === 'left' || facing === 'right') {
    const side = facing === 'left' ? 1 : -1;
    rect(c, '#b98b3d', side === 1 ? 3 : -6, -14, 3, 7);
    rect(c, '#e4ba85', side === 1 ? -5 : 3, -17, 2, 4);
  } else {
    rect(c, '#d6a34c', -6, -14, 2, 6);
    rect(c, '#d6a34c', 4, -14, 2, 6);
    rect(c, '#d9b38b', -3, -17, 6, 4);
    rect(c, '#303732', -3, -16, 1, 1);
    rect(c, '#303732', 2, -16, 1, 1);
  }
  rect(c, '#303832', -4, -22, 8, 5);
  rect(c, '#303832', -5, -20, 10, 3);
  rect(c, '#56604a', -3, -22, 5, 1);
  c.restore();
}
