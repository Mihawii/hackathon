"""Build Little Days' handbound album. Run with Python 3 on macOS.

All dimensions are in model space. X runs from the binding to the fore edge,
Y from tail to head, and the positive Z axis points out of the front cover.
The generated GLB embeds its three image maps and opens without the app.
"""

import json
import math
import os
import random
import struct
import subprocess
import tempfile
import zlib
from pathlib import Path


ASSETS = Path(__file__).resolve().parents[1] / "assets"
WIDTH, HALF_HEIGHT = 3.26, 1.078
PAGE_X, PAGE_W, PAGE_H = .025, 3.159, 1.028
gltf = {
    "asset": {"version": "2.0", "generator": "Little Days / bookbinder"},
    "scene": 0, "scenes": [{"name": "Little Days", "nodes": [0]}],
    "nodes": [], "meshes": [], "materials": [], "images": [], "textures": [],
    "samplers": [{"magFilter": 9729, "minFilter": 9987, "wrapS": 33071, "wrapT": 33071}],
    "accessors": [], "bufferViews": [], "buffers": []
}
binary = bytearray()


def view(data, target=None):
    while len(binary) % 4:
        binary.append(0)
    entry = {"buffer": 0, "byteOffset": len(binary), "byteLength": len(data)}
    if target:
        entry["target"] = target
    binary.extend(data)
    gltf["bufferViews"].append(entry)
    return len(gltf["bufferViews"]) - 1


def accessor(rows, dimensions, integer=False, bounds=False):
    flat = [v for row in rows for v in row]
    fmt = "H" if integer else "f"
    entry = {
        "bufferView": view(struct.pack(f"<{len(flat)}{fmt}", *flat), 34963 if integer else 34962),
        "componentType": 5123 if integer else 5126, "count": len(rows),
        "type": {1: "SCALAR", 2: "VEC2", 3: "VEC3"}[dimensions]
    }
    if bounds:
        entry["min"] = [min(row[i] for row in rows) for i in range(dimensions)]
        entry["max"] = [max(row[i] for row in rows) for i in range(dimensions)]
    gltf["accessors"].append(entry)
    return len(gltf["accessors"]) - 1


def image(name, data, mime="image/png"):
    gltf["images"].append({"name": name, "bufferView": view(data), "mimeType": mime})
    gltf["textures"].append({"name": name, "source": len(gltf["images"]) - 1, "sampler": 0})
    return len(gltf["textures"]) - 1


def linear(value):
    x = value / 255
    return x / 12.92 if x < .04045 else ((x + .055) / 1.055) ** 2.4


def material(name, color, metal=0, rough=.8, texture=None, alpha=False, double=False):
    rgb = tuple(bytes.fromhex(color))
    pbr = {"baseColorFactor": [*(linear(c) for c in rgb), 1], "metallicFactor": metal,
           "roughnessFactor": rough}
    if texture is not None:
        pbr["baseColorTexture"] = {"index": texture}
    mat = {"name": name, "pbrMetallicRoughness": pbr, "doubleSided": double}
    if alpha:
        mat.update({"alphaMode": "MASK", "alphaCutoff": .42})
    gltf["materials"].append(mat)
    return len(gltf["materials"]) - 1


def node(name, parent=None, mesh=None, position=None, extras=None):
    result = {"name": name}
    if mesh is not None:
        result["mesh"] = mesh
    if position:
        result["translation"] = position
    if extras:
        result["extras"] = extras
    idx = len(gltf["nodes"])
    gltf["nodes"].append(result)
    if parent is not None:
        gltf["nodes"][parent].setdefault("children", []).append(idx)
    return idx


def mesh(name, primitives):
    gltf["meshes"].append({"name": name, "primitives": primitives})
    return len(gltf["meshes"]) - 1


class Surface:
    def __init__(self):
        self.positions, self.uvs, self.triangles = [], [], []

    def point(self, xyz, uv):
        idx = len(self.positions)
        self.positions.append(xyz)
        self.uvs.append(uv)
        return idx

    def quad(self, a, b, c, d):
        self.triangles.extend(((a, b, c), (a, c, d)))

    def finish(self, mat):
        normals = [[0., 0., 0.] for _ in self.positions]
        for a, b, c in self.triangles:
            va, vb, vc = (self.positions[idx] for idx in (a, b, c))
            ab = [vb[i] - va[i] for i in range(3)]
            ac = [vc[i] - va[i] for i in range(3)]
            norm = (ab[1]*ac[2] - ab[2]*ac[1], ab[2]*ac[0] - ab[0]*ac[2],
                    ab[0]*ac[1] - ab[1]*ac[0])
            for idx in (a, b, c):
                for i in range(3):
                    normals[idx][i] += norm[i]
        for norm in normals:
            length = math.sqrt(sum(v*v for v in norm)) or 1
            for i in range(3):
                norm[i] /= length
        return {"attributes": {"POSITION": accessor(self.positions, 3, bounds=True),
                               "NORMAL": accessor(normals, 3), "TEXCOORD_0": accessor(self.uvs, 2)},
                "indices": accessor([(i,) for tri in self.triangles for i in tri], 1, True),
                "material": mat}


def png_rgb(w, h, rows):
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(b"".join(b"\x00" + bytes(row) for row in rows), 9))
            + chunk(b"IEND", b""))


def paper_edges():
    w, h = 256, 256
    rng = random.Random(418)
    rows = []
    for y in range(h):
        row = []
        leaf = y % 10
        dark = 36 * math.exp(-((leaf - 1) / 1.4)**2) + 11 * (y % 47 < 3)
        highlight = 9 * math.exp(-((leaf - 4) / 1.7)**2)
        for x in range(w):
            light = highlight - dark + 3*math.sin(x*.036 + y*.17) + rng.uniform(-3, 3)
            row.extend(max(0, min(255, round(c + light))) for c in (220, 184, 128))
        rows.append(row)
    return png_rgb(w, h, rows)


def landscape_cloth():
    """Arrange the original engraving for a wide die without stretching its boat or moon."""
    with tempfile.TemporaryDirectory() as tmp:
        raw = Path(tmp) / "source.bmp"
        work = Path(tmp) / "cloth.png"
        subprocess.run(["sips", "-s", "format", "bmp", str(ASSETS/"cover.jpg"), "--out", str(raw)],
                       check=True, stdout=subprocess.DEVNULL)
        bmp = raw.read_bytes()
        offset = struct.unpack_from("<I",bmp,10)[0]
        sw, signed_h, _, bits = struct.unpack_from("<iiHH",bmp,18)
        sh = abs(signed_h)
        assert bits == 24
        stride = (3*sw+3)//4*4
        def src(x,y):
            iy = min(sh-1,max(0,int(y)))
            i = offset + (iy if signed_h<0 else sh-1-iy)*stride + min(sw-1,max(0,int(x)))*3
            return bmp[i+2],bmp[i+1],bmp[i]
        def fold(x,n):
            return abs(x%(n*2)-n)
        def smooth(x):
            t = min(1,max(0,x))
            return t*t*(3-2*t)
        def gild(base,ink,weight):
            r,g,b = ink
            opacity = smooth((r-b-2)/29)*smooth((r-28)/42)*weight
            return tuple(round(a+(c-a)*opacity) for a,c in zip(base,ink))
        w,h = 1536,1016
        rows = []
        for y in range(h):
            v = y/h
            row = bytearray()
            for x in range(w):
                u = x/w
                cloth = src(89+fold(x,760),110+fold(y,393))
                # A low wave bank sits under the wording. Vary its phase
                # smoothly before it meets the much larger original print.
                if v>.684 and u<.57:
                    ax = 43 + fold(x*.81, 193)
                    ay = 1231+(y-h*.927)/1.07
                    cloth = gild(cloth,src(ax,ay),.58*smooth((v-.684)/.11)*smooth((.59-u)/.18)*smooth((.969-v)/.039))
                ax = (x-.378*w)/.955
                ay = 1233+(y-h*.924)/.955
                if 32<ax<sw-32 and 380<ay<1261:
                    fade = smooth((ax-32)/125)*smooth((sw-32-ax)/28)*smooth((1261-ay)/59)
                    cloth = gild(cloth,src(ax,ay),fade)
                # Take the double fillet and tool marks from the original
                # edges; preserve the aspect ratio of the corner fleurons.
                if min(x,w-1-x,y,h-1-y)<32:
                    bx = x if x<48 else sw-1-(w-1-x) if x>w-49 else u*sw
                    by = y if y<48 else sh-1-(h-1-y) if y>h-49 else v*sh
                    weight = smooth((32-min(x,w-1-x,y,h-1-y))/13)
                    cloth = gild(cloth,src(bx,by),weight)
                row.extend(cloth)
            rows.append(row)
        work.write_bytes(png_rgb(w,h,rows))
        target = ASSETS / "bookcloth.jpg"
        subprocess.run(["sips","-s","format","jpeg","-s","formatOptions","91",str(work),"--out",str(target)],
                       check=True, stdout=subprocess.DEVNULL)
        return target.read_bytes()


def title_stamp():
    # Cocoa renders the two optical styles into a transparent foil die. The
    # die stays a separate PBR material and catches the light independently.
    swift = """
import AppKit
let w = 1536, h = 1016
let bitmap = NSBitmapImageRep(bitmapDataPlanes:nil, pixelsWide:w, pixelsHigh:h,
    bitsPerSample:8, samplesPerPixel:4, hasAlpha:true, isPlanar:false, colorSpaceName:.deviceRGB,
    bytesPerRow:0, bitsPerPixel:0)!
let context = NSGraphicsContext(bitmapImageRep:bitmap)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
let cw = CGFloat(w), ch = CGFloat(h)
func printLine(_ text:String, _ font:String, _ size:CGFloat, _ y:CGFloat, _ tracking:CGFloat = 0) {
    let a = NSAttributedString(string:text, attributes:[
        .font:NSFont(name:font, size:size)!, .foregroundColor:NSColor.white, .kern:tracking])
    let s = a.size()
    a.draw(at:NSPoint(x:cw*0.306-(s.width-tracking)/2, y:ch*(1-y)-s.height/2))
}
printLine("A KEEPSAKE ALBUM", "Baskerville", 28, 0.214, 5.5)
printLine("Little", "Baskerville", 185, 0.377, -6)
printLine("Days", "Baskerville-Italic", 193, 0.553, -6)
let y = ch*0.298
NSColor.white.setStroke()
let rule = NSBezierPath()
rule.lineWidth = 1.6
for side in [-1.0, 1.0] {
    rule.move(to:NSPoint(x:cw*0.306+side*13, y:y))
    rule.line(to:NSPoint(x:cw*0.306+side*53, y:y))
}
rule.stroke()
let diamond = NSBezierPath()
diamond.move(to:NSPoint(x:cw*0.306, y:y+6))
diamond.line(to:NSPoint(x:cw*0.306+4, y:y))
diamond.line(to:NSPoint(x:cw*0.306, y:y-6))
diamond.line(to:NSPoint(x:cw*0.306-4, y:y))
diamond.close()
NSColor.white.setFill()
diamond.fill()
NSGraphicsContext.restoreGraphicsState()
try bitmap.representation(using:.png, properties:[:])!.write(to:URL(fileURLWithPath:CommandLine.arguments.last!))
"""
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "foil.png"
        env = {**os.environ, "CLANG_MODULE_CACHE_PATH": str(Path(tempfile.gettempdir()) / "book-clang-cache")}
        subprocess.run(["swift", "-module-cache-path", env["CLANG_MODULE_CACHE_PATH"], "-e", swift, str(path)],
                       check=True, env=env)
        return path.read_bytes()


art = image("Gilt boat on midnight bookcloth", landscape_cloth(), "image/jpeg")
stamp = image("Little Days - hot foil die", title_stamp())
edge_map = image("Sewn signatures, gilt edge", paper_edges())
navy = material("Woven midnight cloth", "203b40", .02, .82)
seam = material("Waxed navy thread", "385155", .07, .71)
art_mat = material("Engraved cover", "ffffff", .015, .78, art)
title_mat = material("Title in pale gold leaf", "efd89a", .38, .48, stamp, alpha=True)
gold = material("Burnished antique brass", "bc965c", .57, .46)
endgold = material("Flax headband thread", "d6b16f", .15, .6)
paper = material("Warm uncoated stock", "ece1c7", 0, .92, double=True)
gilt = material("Gilded signatures", "fff8eb", .22, .66, edge_map)
liner = material("Inside blue paper", "314847", 0, .91)
ribbon = material("Garnet silk marker", "a54442", .045, .57, double=True)
ribbon_light = material("Edge of the woven ribbon", "c26956", .04, .62, double=True)


def rounded_outline(x0, x1, h, radius):
    points = []
    corners = [(x1-radius, h-radius, 0), (x0+radius, h-radius, 90),
               (x0+radius, -h+radius, 180), (x1-radius, -h+radius, 270)]
    for cx, cy, start in corners:
        for step in range(5):
            angle = math.radians(start + step*22.5)
            points.append((cx+radius*math.cos(angle), cy+radius*math.sin(angle)))
    return points


def solid(name, x0, x1, h, z0, z1, radius, bevel, edge_mat, face_mat, lined=False):
    wall, caps = Surface(), Surface()
    rings = [(z0, bevel), (z0+bevel*.36, bevel*.36), (z0+bevel, 0)]
    if lined:
        # Signature shoulders catch the raking light even at the book's foot.
        for n in range(1, 6):
            z = z0 + (z1-z0)*n/6
            rings.extend([(z-.003, 0), (z, .0018), (z+.003, 0)])
    rings.extend([(z1-bevel, 0), (z1-bevel*.36, bevel*.36), (z1, bevel)])
    prev = None
    for z, inset in rings:
        p = rounded_outline(x0+inset, x1-inset, h-inset, max(.004, radius-inset))
        path = p+[p[0]]
        distances = [0]
        for a, b in zip(path, path[1:]):
            distances.append(distances[-1] + math.dist(a, b))
        row = [wall.point((x,y,z), (s/distances[-1], (z1-z)/(z1-z0)))
               for (x,y),s in zip(path,distances)]
        if prev:
            for i in range(len(row)-1):
                wall.quad(prev[i], prev[i+1], row[i+1], row[i])
        prev = row
    for z, facing_up in ((z0, False), (z1, True)):
        p = rounded_outline(x0+bevel, x1-bevel, h-bevel, max(.004, radius-bevel))
        mid = caps.point(((x0+x1)/2, 0, z), (.5,.5))
        ring = [caps.point((x,y,z), ((x-x0)/(x1-x0), .5-y/(2*h))) for x,y in p]
        for i, a in enumerate(ring):
            b = ring[(i+1) % len(ring)]
            caps.triangles.append((mid,a,b) if facing_up else (mid,b,a))
    return mesh(name, [wall.finish(edge_mat), caps.finish(face_mat)])


def cover_surface(mat, depth=0):
    sheet = Surface()
    xx = [.009, .028, .060, .083, .097, .109, .128, .151, .180, .222, WIDTH-.024, WIDTH-.009]
    last = None
    for x in xx:
        crease = .0045*math.exp(-((x-.081)/.019)**2) - .011*math.exp(-((x-.126)/.022)**2)
        z = .039 + crease + depth
        inset = .014 if x in (xx[0], xx[-1]) else .008
        y = HALF_HEIGHT-inset
        row = [sheet.point((x,-y,z),(x/WIDTH,1)), sheet.point((x,y,z),(x/WIDTH,0))]
        if last:
            sheet.quad(last[0],row[0],row[1],last[1])
        last = row
    return sheet.finish(mat)


def arch(name, y0, y1, rx, rz, mat, ends=False):
    s = Surface()
    last = None
    for i in range(37):
        a = i*math.pi/36
        x, z = .04-rx*math.sin(a), rz*math.cos(a)
        row = [s.point((x,y0,z),(i/36,1)), s.point((x,y1,z),(i/36,0))]
        if last:
            s.quad(last[0],last[1],row[1],row[0])
        last = row
    if ends:
        for y, top in ((y0,False),(y1,True)):
            center = s.point((.04,y,0),(.5,.5))
            arc = []
            for i in range(37):
                a=i*math.pi/36
                arc.append(s.point((.04-rx*math.sin(a),y,rz*math.cos(a)),
                                   (.5-.5*math.sin(a), .5+.5*math.cos(a))))
            for a,b in zip(arc,arc[1:]):
                s.triangles.append((center,b,a) if top else (center,a,b))
    return mesh(name,[s.finish(mat)])


def segment_grid():
    grid = Surface()
    cols, rows = 32, 8
    for y in range(rows+1):
        for x in range(cols+1):
            u, v = x/cols, y/rows
            grid.point((PAGE_X+PAGE_W*u,(v-.5)*PAGE_H*2,0), (u,1-v))
    for y in range(rows):
        for x in range(cols):
            a = y*(cols+1)+x
            grid.quad(a,a+1,a+cols+2,a+cols+1)
    return mesh("Flexible laid sheet", [grid.finish(paper)])


def marker():
    parts = [Surface(),Surface()]
    # A split fishtail drapes below the bottom cover. Fold the satin slightly
    # along its length and wind an edge stripe into each side.
    cols = [0,.065,.50,.935,1]
    rows = [0,.35,.72,.86,1]
    for p,(lo,hi) in enumerate(zip(cols,cols[1:])):
        s = parts[int(p in (0,3))]
        last = None
        for t in rows:
            row = []
            for u in (lo,hi):
                x = 2.38+u*.158+.096*t*t
                y = -.884-.49*t+max(0,1-abs(u-.5)*2)*.102*max(0,(t-.86)/.14)
                z = -.082-.127*t*t+.021*math.sin(u*math.pi)*t
                row.append(s.point((x,y,z),(u,t)))
            if last:
                s.quad(last[0],row[0],row[1],last[1])
            last=row
    return mesh("Woven grosgrain marker", [parts[0].finish(ribbon),parts[1].finish(ribbon_light)])


root = node("Album")
node("Back_board", root, solid("Back case",0,WIDTH,HALF_HEIGHT,-.035,.035,.033,.009,navy,liner),
     [0,0,-.164])
node("Back_outer_cloth", root, solid("Turned-in back cloth", .002, WIDTH-.002, HALF_HEIGHT-.002,
     -.008,.008,.032,.004,navy,navy), [0,0,-.198])
spine = node("Spine",root)
gltf["nodes"][spine]["scale"] = [1,HALF_HEIGHT/1.465,1]
node("Rounded_hollow_back", spine, arch("Rounded spine shell",-1.467,1.467,.178,.202,navy,True))
for idx,y in enumerate((-1.293,-.787,.787,1.293)):
    node(f"Raised_band_{idx}", spine, arch("Cord under the cloth",y-.026,y+.026,.183,.205,seam))
    for k,offset in enumerate((-.018,.018)):
        node(f"Spine_foil_{idx}_{k}", spine,
             arch("Fine gold fillet",y+offset-.004,y+offset+.004,.185,.207,gold))
for n,y in enumerate((-1.431,1.431)):
    # Gold and claret threads alternate around a real sewn headband.
    band = Surface()
    dark = Surface()
    for i in range(20):
        s = band if i%3 else dark
        row = []
        for a in (math.pi*i/20, math.pi*(i+1)/20):
            row.append([s.point((.048-(.165+r)*math.sin(a), y + dy, (.177+r)*math.cos(a)),
                                (a/math.pi, .5+dy/.038)) for dy,r in ((-.019,0),(0,.006),(.019,0))])
        for j in range(2):
            s.quad(row[0][j],row[0][j+1],row[1][j+1],row[1][j])
    node(f"Sewn_headband_{n}",spine,mesh("Sewn endband",[band.finish(endgold),dark.finish(ribbon)]))
front = node("Front_hinge",root,position=[0,0,.164])
node("Front_board",front,solid("Front case",0,WIDTH,HALF_HEIGHT,-.035,.026,.033,.009,navy,liner))
node("Cover_illustration",front,mesh("Cloth with gilt engraving",[cover_surface(art_mat)]))
node("Foil_title",front,mesh("Stamped title",[cover_surface(title_mat,.0014)]))
lower = node("Back_signatures",root,
             solid("Lower signatures",PAGE_X,PAGE_X+PAGE_W,PAGE_H,-.128,-.007,.019,.005,gilt,paper,True))
upper = node("Front_signatures_hinge",root,position=[0,0,.068])
node("Front_signatures",upper,
     solid("Upper signatures",PAGE_X,PAGE_X+PAGE_W,PAGE_H,-.060,.060,.019,.005,gilt,paper,True))
sheet_mesh = segment_grid()
for i in range(5):
    node(f"Flyleaf_{i}",root,sheet_mesh,[0,0,.001+i*.001])
node("Garnet_ribbon",root,marker())

gltf["buffers"] = [{"byteLength":len(binary)}]
metadata = json.dumps(gltf,ensure_ascii=False,separators=(",",":")).encode()
metadata += b" "*((-len(metadata))%4)
binary.extend(b"\x00"*((-len(binary))%4))
size = 12 + 8 + len(metadata) + 8 + len(binary)
target = ASSETS / "book.glb"
with target.open("wb") as f:
    f.write(struct.pack("<4sII",b"glTF",2,size))
    f.write(struct.pack("<I4s",len(metadata),b"JSON") + metadata)
    f.write(struct.pack("<I4s",len(binary),b"BIN\0") + binary)
print(f"{target.name}: {len(gltf['nodes'])} nodes, {len(gltf['meshes'])} meshes, {size:,} bytes")
