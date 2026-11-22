// Original jointed paper figures. All artwork is drawn locally on transparent stock.
const TAU = Math.PI * 2;
const paths = new Map();
function path(d) {
    if (!paths.has(d)) paths.set(d, new Path2D(d));
    return paths.get(d);
}
function cut(c, d, fill, edge = '#584630', width = .83) {
    const shape = path(d);
    c.fillStyle = fill; c.fill(shape);
    if (edge) { c.strokeStyle = edge; c.lineWidth = width; c.lineJoin = 'round'; c.stroke(shape); }
}
function ink(c, d, color = '#594b39', width = .82) {
    c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(path(d));
}
function oval(c, x, y, rx, ry, color, angle = 0) {
    c.beginPath(); c.ellipse(x, y, rx, ry, angle, 0, TAU);
    c.fillStyle = color; c.fill();
}
function pin(c, x, y, radius = 1.45) {
    oval(c, x, y + .34, radius + .30, radius + .20, '#55462f');
    oval(c, x, y, radius, radius, '#d7ae65');
    oval(c, x - .23, y - .37, radius * .36, radius * .28, '#ffe3a5');
    oval(c, x + .16, y + .16, radius * .19, radius * .18, '#7a603a');
}

const COATS = {
    lake: { fox: ['#345b65','#203f4d','#80969a'], hare: ['#829682','#4f6c63','#c2c8a3'], scarf: '#c99651' },
    rain: { fox: ['#a65e47','#794435','#d19166'], hare: ['#506b80','#344b5c','#879ca4'], scarf: '#d6a450' },
    meadow: { fox: ['#6d815c','#455d48','#a6ac75'], hare: ['#a86958','#7b4a43','#d99578'], scarf: '#dec17a' }
};

function foxHead(c) {
    cut(c,'M-20-14 Q-20-26-13-29 L-14-44 Q-11-47-2-32 L8-31 15-42 Q18-44 16-28 Q21-24 21-21 L34-15 39-14 36-10 25-7 17-3 10 4 0 1-6 6-7 1-16 4-14-2-23-1-19-7-26-7Z','#c67b43');
    cut(c,'M-13-42-5-31-11-30Z','#493b36');
    cut(c,'M9-31 15-39 14-29Z','#665044');
    cut(c,'M-16-22 Q-9-27 5-28 L16-23 9-21 0-24-8-21Z','#de9a59',null);
    cut(c,'M-17-9-7-14-9-6 1-10 8-12 18-14 27-13 35-13 34-10 20-5 10 2 1 0-6 4-6-1-14 2-11-4-20-3Z','#f3deae',null);
    cut(c,'M32-15 Q38-17 39-14 L36-10 33-10 31-13Z','#3c3430','#544234',.55);
    ink(c,'M12-22 Q16-24 20-21 M17-19 Q14-20 13-17 M9-3 Q17-8 24-7 Q28-7 32-9','#5d4535',.92);
    oval(c,15.3,-18.7,2.25,2.9,'#41352e',-.23); oval(c,16,-19.7,.64,.78,'#fff0c8');
    ink(c,'M-18-15-9-18 M-17-12-8-15 M-16-7-10-10 M-9-3-5-6 M-6-29-2-30 M2-28 5-29','#85522f',.57);
    ink(c,'M22-10 32-8 M20-8 31-5 M22-11 32-12','#7f6649',.52);
    oval(c,23.4,-10.4,.55,.5,'#71553a'); oval(c,26,-10.7,.51,.48,'#71553a');
}
function hareHead(c) {
    cut(c,'M-16-15 Q-17-28-8-33 Q2-39 10-32 Q18-30 20-21 Q24-18 26-13 L32-10 32-6 25-4 Q23 1 14 1 L7 4-1 1-7 4-9 .5-16 1-14-3 Q-22-6-16-15Z','#e8d8b3','#6c5a43');
    cut(c,'M-13-27 Q-4-37 7-31 L13-26 9-21 0-20-5-15-11-15Z','#bda57f',null);
    cut(c,'M-11-12 Q-7-17 1-17 L12-10 25-10 29-8 23-4 15-3 7 2-1 0-8 2-10-2-15-1Z','#f4e7c9',null);
    ink(c,'M6-24 Q12-27 16-23 M11-5 Q20-8 25-5 L28-7','#74614c',.83);
    oval(c,12,-21,2.7,3.2,'#493d35',-.16); oval(c,12.8,-22,.79,.83,'#fff7e0');
    cut(c,'M26-11 Q33-12 32-8 L29-6 26-8Z','#9d7865','#735747',.56);
    ink(c,'M20-8 36-10 M20-6 36-4 M20-5 32-1 M-13-13-7-16 M-14-9-7-12 M-11-5-5-8','#9a8161',.61);
}
function ear(c, dark) {
    cut(c,'M-3 2 Q-8-8-9-24 Q-11-43-6-49 Q-2-51 2-38 Q8-18 2 0Z', dark ? '#c0aa87' : '#e7d9b7','#77664f',.85);
    cut(c,'M-2-4 Q-8-24-6-43 Q-1-39 1-20 L0-7Z',dark?'#aa8877':'#ca9d85',null);
    ink(c,'M-4-37 Q-3-26-2-16','#ead4b1',.72);
}
function tail(c, fox) {
    if (!fox) {
        cut(c,'M0-4 Q-5-13-11-9 L-12-11-13-7 Q-20-7-18-2 Q-21 3-16 6 L-17 8-11 7 Q-2 11 2 2Z','#e7dcc1','#79684f');
        ink(c,'M-15-3-11-6 M-15 3-9 0 M-10 5-7 2','#a99375',.62);
        return;
    }
    cut(c,'M1 3 Q-16 16-38 8 Q-54 3-61-10 L-63-16-57-14-61-20-54-18-55-24 Q-42-24-34-16 Q-21-4-8-3Z','#b86b3d','#644732',1.05);
    cut(c,'M-61-16-57-14-61-20-54-18-55-24 Q-42-23-35-16 L-39-15-34-10-40-11-37-6-42-8-42-4-47-7-47-3 Q-56-8-61-16Z','#ead4a7',null);
    ink(c,'M-34-9 Q-19 4-9 1 M-36 1 Q-24 7-15 6 M-49-13-43-10 M-55-17-49-14','#8c5837',.71);
}
function coat(c, palette, fox, accent) {
    const [base, shade, light] = palette;
    cut(c,'M-9-66 Q-1-70 9-65 L15-55 13-43 19-24 8-20-7-24-17-21-13-33-15-50Z',base);
    cut(c,'M-6-64 0-54-3-36-7-23-17-21-13-35-15-50Z',shade,null);
    cut(c,'M6-65 13-61 12-48 18-25 9-23 6-39Z',light,null);
    cut(c,'M1-65 9-64 8-48Z','#dcca9a');
    cut(c,'M-10-64 1-65 9-48-1-53 1-56-6-57Z',light,shade,.56);
    cut(c,'M8-64 14-60 10-56 13-54 9-48Z',shade,null);
    cut(c,'M-7-68 7-68 13-64 5-60-7-62Z',accent);
    cut(c,'M1-63 5-61 1-47-6-50Z',accent,'#796443',.52);
    ink(c,'M-14-28-7-30 0-27 M6-46 10-28 M-11-43-4-43 M-10-41-6-41',shade,.83);
    ink(c,'M-11-26-6-27 M11-26 15-27 M-6-58-1-56',light,.62);
    pin(c,8,-43,1.15); pin(c,9,-35,1.13);
    if (fox) {
        cut(c,'M-11-47-3-47-3-41-9-40Z',shade,null);
        ink(c,'M-11-47-3-47',light,1);
    }
}

function makePart(doc, area, paint, pattern) {
    const [x,y,w,h] = area, ratio = 2.75, sheet = doc.createElement('canvas');
    sheet.width = Math.ceil(w * ratio); sheet.height = Math.ceil(h * ratio);
    const c = sheet.getContext('2d');
    c.setTransform(ratio,0,0,ratio,-x*ratio,-y*ratio);
    paint(c);
    c.globalCompositeOperation = 'source-atop';
    c.setTransform(1,0,0,1,0,0);
    c.fillStyle = c.createPattern(pattern,'repeat'); c.fillRect(0,0,sheet.width,sheet.height);
    return { draw(ink) { ink.drawImage(sheet,x,y,w,h); }, release() { sheet.width=1; } };
}
function stock(doc) {
    const sheet = doc.createElement('canvas'); sheet.width = sheet.height = 96;
    const c = sheet.getContext('2d'); let seed = 71431;
    const roll = () => {seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296;};
    for (let i=0;i<790;i++) {
        c.fillStyle = i%3 ? 'rgba(65,47,31,.105)' : 'rgba(255,246,207,.27)';
        c.fillRect(roll()*96,roll()*96, .55+roll()*1.5,.5+roll()*1.1);
    }
    for (let i=0;i<35;i++) {
        const x=roll()*96,y=roll()*96;
        c.beginPath();c.moveTo(x,y);c.lineTo(x+2+roll()*4,y-1+roll()*2);
        c.lineWidth=.52;c.strokeStyle='rgba(255,244,210,.21)';c.stroke();
    }
    return sheet;
}
function link(c, x1,y1,x2,y2, r1,r2, fill) {
    const l=Math.hypot(x2-x1,y2-y1)||1, a=(y1-y2)/l, b=(x2-x1)/l;
    c.beginPath();c.moveTo(x1+a*r1,y1+b*r1);c.lineTo(x2+a*r2,y2+b*r2);
    c.quadraticCurveTo(x2+(x2-x1)/l*r2,y2+(y2-y1)/l*r2,x2-a*r2,y2-b*r2);
    c.lineTo(x1-a*r1,y1-b*r1);c.quadraticCurveTo(x1-(x2-x1)/l*r1,y1-(y2-y1)/l*r1,x1+a*r1,y1+b*r1);
    c.fillStyle=fill;c.fill();c.strokeStyle='#615039';c.lineWidth=.82;c.stroke();
}
function leg(c, x, swing, back, sit) {
    const footX=x+swing*11 + sit*9, footY=-Math.max(0,swing)*6 - sit*17;
    const kneeX=(x+footX)/2+3+sit*9, kneeY=(-31+footY)/2-1-sit*3;
    link(c,x,-30,kneeX,kneeY,3.9,3.1,back?'#645a4a':'#877457');
    link(c,kneeX,kneeY,footX,footY-3,2.6,2.5,back?'#6a6654':'#a49a76');
    c.save();c.translate(footX,footY);c.rotate(swing*.16);
    cut(c,'M-3-7 3-7 4-3 10-2 Q13 1 10 2 L-4 2-4-2Z',back?'#453e38':'#59483b');
    ink(c,'M-2-5 3-5 M1 .5 8 .5','#ae9471',.66);c.restore();
    pin(c,kneeX,kneeY,1.04);
}
function arm(c, palette, back, x, y, isFox) {
    const sx=back?-6:3, sy=back?-60:-59;
    const ex=(sx+x)*.5-4, ey=(sy+y)*.5+5.5;
    link(c,sx,sy,ex,ey,4.2,3.7,back?palette[1]:palette[0]);
    link(c,ex,ey,x,y,3.15,2.45,back?palette[1]:palette[2]);
    pin(c,ex,ey,1.24);
    oval(c,x+.7,y,3.0,2.45,isFox?'#73513c':'#dec7a2',-.25);
}
function identity(c) { c.setTransform(1,0,0,1,0,0); }

export function paperCast(doc, theme, accent) {
    const colors=COATS[theme], fiber=stock(doc), all=[];
    function part(area,design){const item=makePart(doc,area,design,fiber);all.push(item);return item;}
    const result={};
    for (const species of ['fox','hare']) {
        const fox=species==='fox', cloth=colors[species];
        const head=part([-28,-49,70,59],fox?foxHead:hareHead);
        const jacket=part([-21,-73,44,56],c=>coat(c,cloth,fox,accent||colors.scarf));
        const brush=part([-66,-27,72,46],c=>tail(c,fox));
        const ears=fox?[]:[part([-13,-52,24,58],c=>ear(c,true)),part([-13,-52,24,58],c=>ear(c,false))];
        const sheet=doc.createElement('canvas'), density=2;
        sheet.width=181*density;sheet.height=177*density;
        const rig=sheet.getContext('2d');
        result[species]=(c,a) => {
            identity(rig);rig.clearRect(0,0,sheet.width,sheet.height);rig.setTransform(density,0,0,density,82*density,167*density);
            const gait=a.walk*Math.sin(a.phase), rise=1.65*Math.abs(gait);
            rig.translate(0,-rise);
            rig.save();rig.translate(-8,-30);rig.rotate(.055*Math.sin(a.phase*.51)+.09*gait);brush.draw(rig);rig.restore();
            leg(rig,-6,-gait,true,a.sit);leg(rig,5,gait,false,a.sit);
            arm(rig,cloth,true,-7-gait*6,-42+gait*4,fox);
            jacket.draw(rig);
            rig.save();rig.translate(5,-65);rig.rotate(a.nod);
            if(!fox){
                rig.save();rig.translate(-8,-25);rig.rotate(-.53-.20*a.ears);ears[0].draw(rig);rig.restore();
                rig.save();rig.translate(0,-27);rig.rotate(-.15+.27*a.ears);ears[1].draw(rig);rig.restore();
            }
            head.draw(rig);
            if(fox && theme==='lake'){
                cut(rig,'M-17-24 Q-25-40-9-40 L1-37 6-31-2-26Z','#3b5961','#453f37');
                cut(rig,'M-16-26-1-30 7-31 14-27 Q10-24 2-25L-11-22Z','#283f46');
                ink(rig,'M-18-31 Q-12-37-5-35','#9da795',.78);pin(rig,-8,-25,1);
            }
            rig.restore();
            arm(rig,cloth,false,a.handX,a.handY,fox);
            pin(rig,2,-59,1.42);
            c.save();c.translate(a.x,a.y);c.scale(a.dir*a.scale*a.fold,a.scale);
            c.rotate(a.lean);
            c.shadowColor='rgba(46,32,21,.39)';c.shadowOffsetX=2*a.scale;c.shadowOffsetY=3.1*a.scale;c.shadowBlur=2.1*a.scale;
            c.drawImage(sheet,-82,-167,181,177);c.restore();
        };
        all.push({release(){sheet.width=1;}});
    }
    result.dispose=()=>{all.forEach(p=>p.release());fiber.width=1;};
    return result;
}

export function handPoint(a) {
    const rise=1.65*Math.abs(a.walk*Math.sin(a.phase)), x=a.handX, y=a.handY-rise;
    return {x:a.x+(x*Math.cos(a.lean)-y*Math.sin(a.lean))*a.dir*a.scale*a.fold,
        y:a.y+(x*Math.sin(a.lean)+y*Math.cos(a.lean))*a.scale};
}
export function ticket(c,x,y,s,fold,angle=0) {
    c.save();c.translate(x,y);c.rotate(angle);c.scale(s,s);
    if(fold<.98){
        c.save();c.globalAlpha*=Math.min(1,(1-fold)*2.4);c.scale(1-fold*.23,1-fold*.43);
        cut(c,'M-35-14 34-14 34-8 Q30-6 34-4 L34 2 Q30 5 34 7 L34 14-35 14-35 7Q-31 5-35 3 L-35-4Q-31-7-35-8Z','#edc793','#795b42',1.1);
        ink(c,'M-24-10-24 10 M23-10 23 10 M-18-7 17-7 M-18 8 17 8','#a4654a',1);
        cut(c,'M-11-4 10-4 12-1 12 4-12 4-12-1Z','#537974',null);
        ink(c,'M-8-2-5-2 M-2-2 1-2 M4-2 7-2','#f3dfb7',1.35);c.restore();
    }
    if(fold>0){
        c.save();c.globalAlpha*=Math.min(1,fold*3);c.scale(.69+.31*fold,.13+.87*fold);
        cut(c,'M-48-7-14-9 2-30 18-9 47-15 29 10-25 13Z','#dfc28c','#735b40',.85);
        cut(c,'M-15-6 2-30 5-6Z','#fff0c5');cut(c,'M2-30 19-8 5-5Z','#bb995d');
        cut(c,'M-48-7 4-1-25 13Z','#f5ddb1');cut(c,'M4-1 47-15 29 10-25 13Z','#caa46a');
        ink(c,'M-39-3-26 2 M-36 .3-27 4 M8 2 35-8 M8 4 23-2','#927244',.7);c.restore();
    }
    c.restore();
}
export function umbrella(c,hand,s,open,tilt) {
    c.save();c.translate(hand.x,hand.y);c.rotate(tilt);c.scale(s,s);
    ink(c,'M3 5 Q-3 10-4 3 L-4-57','#584b37',2);
    c.translate(-4,-51);c.scale(.10+.9*open,.95);
    cut(c,'M-44 3 Q-40-17-20-27 Q-8-32 0-31 Q17-32 29-21 Q40-12 45 3 Q36-4 29 4 Q17-5 9 4 Q0-4-9 4 Q-19-4-29 5 Q-36-3-44 3Z','#bd7054','#704c3c',1.18);
    cut(c,'M0-31 Q-17-25-29 5 Q-19-4-9 4 Q-9-18 0-31Z','#d68a63','#925d46',.6);
    cut(c,'M0-31 Q12-22 29 4 Q16-4 9 4 Q6-20 0-31Z','#9c5848','#794e41',.6);
    ink(c,'M-42 0 Q-30-21-17-24 M1-29 Q3-20 4-12 M31-17 38-8','#efb88a',.86);
    pin(c,0,-32,1.75);c.restore();
}
export function lantern(c,hand,s,light,swing) {
    c.save();c.translate(hand.x,hand.y);c.scale(s,s);c.rotate(swing);
    if(light>0){
        const glow=c.createRadialGradient(0,22,1,0,22,32);
        glow.addColorStop(0,'rgba(255,214,114,'+(.54*light)+')');glow.addColorStop(1,'rgba(244,173,69,0)');
        c.fillStyle=glow;c.fillRect(-33,-12,66,68);
    }
    ink(c,'M-4 10 Q-8-2-1-3 Q6-3 5 10','#65563d',1.4);
    cut(c,'M-8 11-5 7 4 7 8 11 7 13-8 13Z','#526163');
    cut(c,'M-6 13 6 13 5 27-5 27Z',light>.12?'#f4cd73':'#bbaa83','#705e43');
    cut(c,'M-4 17-1 14 0 25-4 25Z',light>.12?'#fff0ac':'#d1c49c',null);
    ink(c,'M0 13 0 27 M-8 27 7 27 M-6 29 5 29','#594d3f',1.35);c.restore();
}
export function note(c,x,y,s,angle,cream=false) {
    c.save();c.translate(x,y);c.rotate(angle);c.scale(s,s);
    cut(c,'M-1-10 2-11 Q5-6 11-7 Q8-1 2-3 L2 7 Q1 12-5 12 Q-11 12-10 8 Q-8 3-1 4Z',cream?'#f3d795':'#a67443','#7f623d',.86);
    ink(c,'M.3-8 .3 6','#ffe5a9',.58);c.restore();
}
export function bird(c,x,y,s,wing,dir) {
    c.save();c.translate(x,y);c.scale(s*dir,s);c.rotate(-.12);
    cut(c,'M-5 0-20-5-16 2-20 4-6 6 Q5 11 13 1 L20-2 13-4 Q9-11 3-8 Q-1-5-5 0Z','#dca655','#79583d');
    c.save();c.translate(-2,1);c.rotate(-.42+wing*.56);
    cut(c,'M0 1 Q-11-8-15-20 L-9-18-11-23-6-19-5-22 Q4-14 6-5Z','#e8c27f','#8c6a44');
    ink(c,'M-10-16-1-5 M-7-17 2-6','#ae8250',.8);c.restore();
    oval(c,10,-4,1.1,1.12,'#514337');c.restore();
}
export function fiddle(c,hand,s,beat) {
    c.save();c.translate(hand.x,hand.y);c.rotate(-.42);c.scale(s,s);
    cut(c,'M-14 1Q-18-5-12-9Q-8-12-4-7Q0-8 1-12Q6-16 9-11Q12-6 7-3Q10 2 5 5Q0 6-3 3Q-8 10-14 6Z','#be8148');
    cut(c,'M2-7 18-16 21-13 5-3Z','#695441');ink(c,'M-9 2 18-14','#edd39b',.88);
    c.translate(beat*4,beat*2);ink(c,'M-7-16 8 13','#604f3a',1.35);ink(c,'M-6-16 9 11','#e6d4a4',.57);c.restore();
}
