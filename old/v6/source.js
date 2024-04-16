let render = document.getElementById('render')
let editor = document.getElementById('editor')
let renderCtx = render.getContext('2d', { willReadFrequently: true })
let editorCtx = editor.getContext('2d')

let fps = 60
let width = 640
let height = 480

const offscreen = new OffscreenCanvas(width, height) //revisar si esto mejora algo
offscreenCtx = offscreen.getContext('2d', { willReadFrequently: true })

renderCtx.canvas.width = width
renderCtx.canvas.height = height

editorCtx.canvas.width = width
editorCtx.canvas.height = height
let zoom = 0.6
editorCtx.translate((1-zoom)*editor.width/2, (1-zoom)*editor.height/2)
editorCtx.scale(zoom, zoom)

player = JSON.parse(localStorage.getItem("player"))
if(!player) player = {posx: 100, posy: 100, rot: 0, head: 0, jump: 0}

posx = player.posx
posy = player.posy
rot = player.rot
head = player.head
jump = player.jump
collisions = false
inside_sector = []

fov = 30
player_height = 50
plane_dist = 800
num = render.width/2
corr = 1 //solape entre lineas verticales produce que se vean vertices

let rayMod = 2000

let rays = []
let rays_cos = []
let rays_sin = []
index = 0
for(let i = -fov; i <= fov; i=i+((fov*2/(num)))){
    rays.push({i: index++, deg:+i.toFixed(2), coll: []})
    rays_cos.push(Math.cos((i)/180*Math.PI))
    rays_sin.push(Math.sin((i)/180*Math.PI))
}
lineWidth = (render.width/num)
console.log(lineWidth, rays.length, rays.length*lineWidth)
debug_ray = parseInt(rays.length/2)
printed = false
//rays = [
//    [0, null, null],
//]
function renderFrame(){
    editorCtx.fillStyle = "lightgrey"
    editorCtx.fillRect((editor.width/2)-(editor.width/2)/zoom, (editor.height/2)-(editor.height/2)/zoom, editor.width/zoom, editor.height/zoom)

    editorCtx.save()
    editorCtx.translate(editor.width/2, editor.height/2)
    editorCtx.rotate(-rot/180*Math.PI)
    editorCtx.lineWidth = 3
    editorCtx.beginPath()
    editorCtx.moveTo(0, -10)
    editorCtx.lineTo(0, 10)
    editorCtx.stroke()
    editorCtx.beginPath()
    editorCtx.moveTo(0, 0)
    editorCtx.lineTo(10, 0)
    editorCtx.stroke()

    inside_sector = []
    for(var sector of sectors){
        if(pointInSector(posx, posy, sector)) inside_sector[sector.id] = sector
    }

    for(let ray of rays){ //hacer operaciones aquí no quita muchos frames
        ray.coll = []
        for(let[index, sector] of sectors.entries()){
            sector.id = index
            let points = sector.points
            for(let i=0 ; i<points.length ; i++){
                j = (i+1)%points.length
                let temp_int = findIntersection(posx, posy, posx+rayMod*Math.cos((rot-ray.deg)/180*Math.PI), posy-rayMod*Math.sin((rot-ray.deg)/180*Math.PI), 
                points[i][0], points[i][1], points[j][0], points[j][1])
                if(temp_int){
                    temp_dist = calcDistance(posx, posy, temp_int.intersectX, temp_int.intersectY)
                    face_dist = calcDistance(points[i][0], points[i][1], temp_int.intersectX, temp_int.intersectY)
                    //real_dist = Math.sqrt(temp_dist**2 + (jump-sector.z0)**2)
                    ray.coll.push({id:i, dist: temp_dist, int: temp_int, texture: points[i][2],sector: sector, face:face_dist, sprite:null})
                }
            }
        }
        for(var sprite of sprites){
            rot_x0 = (sprite.width/2)*Math.cos((-rot-90)/180*Math.PI) + sprite.posx
            rot_y0 = (sprite.width/2)*Math.sin((-rot-90)/180*Math.PI) + sprite.posy
            rot_x1 = (-sprite.width/2)*Math.cos((-rot-90)/180*Math.PI) + sprite.posx
            rot_y1 = (-sprite.width/2)*Math.sin((-rot-90)/180*Math.PI) + sprite.posy
            let temp_int = findIntersection(posx, posy, posx+rayMod*Math.cos((rot-ray.deg)/180*Math.PI), posy-rayMod*Math.sin((rot-ray.deg)/180*Math.PI),
            rot_x0, rot_y0, rot_x1, rot_y1)
            if(temp_int){
                temp_dist = calcDistance(posx, posy, temp_int.intersectX, temp_int.intersectY)
                face_dist = calcDistance(rot_x0, rot_y0, temp_int.intersectX, temp_int.intersectY)
                ray.coll.push({dist: temp_dist, int: temp_int, sprite: sprite, face:face_dist, sector:null})
            }
        }
        ray.coll.sort((a, b) => {
            //bien para arriba
            if(a.sector.z0 <= b.sector.z1) return 1
            if(b.sector.z0 <= a.sector.z1) return -1
            //bien para abajo
            //if(a.sector.z1 >= b.sector.z0) return 1
            //if(b.sector.z1 >= a.sector.z0) return -1
            return a.dist - b.dist;
        });
        
        sector_fix = []
        for(var [i, coll] of ray.coll.entries()){
            if(!sector_fix[coll.sector.id] && inside_sector[coll.sector.id]){
                coll.next_dist = coll.dist
                coll.prev_dist = 1
                sector_fix[coll.sector.id] = true
                coll.out = true
            }
            if(coll.out) continue
            next_coll = ray.coll.find((e) => e.sector.id == coll.sector.id && e.dist > coll.dist)
            if(next_coll){
                next_coll.out = true
                coll.prev_dist = coll.dist
                coll.next_dist = next_coll.dist
            }else{
                coll.next_dist = rayMod
                coll.prev_dist = coll.dist
                coll.out = true
            }
        }
    }

    //ray
    for(let ray of rays){
        for(let coll of ray.coll){
            editorCtx.lineWidth = 1
            editorCtx.strokeStyle = 'grey'
            editorCtx.beginPath()
            editorCtx.moveTo(0, 0)
            editorCtx.lineTo(coll.dist*rays_cos[ray.i], coll.dist*rays_sin[ray.i])
            editorCtx.stroke()
        }
        if(!ray.coll.length){
            editorCtx.lineWidth = 1
            editorCtx.strokeStyle = 'black'
            editorCtx.beginPath()
            editorCtx.moveTo(0, 0)
            editorCtx.lineTo(rayMod*rays_cos[ray.i], rayMod*rays_sin[ray.i])
            editorCtx.stroke()
        }
    }

    editorCtx.restore()

    editorCtx.save()
    editorCtx.translate(-posx+editor.width/2, -posy+editor.height/2)
    for(var sector of sectors){
        let points = sector.points
        editorCtx.fillStyle = '#ff0';
        if(!sector.static) editorCtx.strokeStyle = 'yellow'
        else editorCtx.strokeStyle = 'black'
        editorCtx.lineWidth = 1
        editorCtx.beginPath()
        for(let path of points){
            editorCtx.lineTo(path[0], path[1])
            editorCtx.fillStyle = 'red'
            editorCtx.fillRect(path[0]-2, path[1]-2, 4, 4)
        }
        editorCtx.closePath()
        editorCtx.stroke()
        //if(!sector.static) editorCtx.fill()
    }
    for(var sprite of sprites){
        editorCtx.fillStyle = 'green'
        editorCtx.fillRect(sprite.posx, sprite.posy, 5, 5)
        
    }

    editorCtx.restore()

    let imageData = offscreenCtx.createImageData(offscreen.width, offscreen.height)
    let buf = new ArrayBuffer(imageData.data.length)
    let buf8 = new Uint8ClampedArray(buf)
    data = new Uint32Array(buf)
    
    //sky
    /*for(x=0 ; x<render.width ; x++){
        for(y=0 ; y<(render.height/2+head) ; y++){
            data[y * render.width + x] = (255 << 24) | (Math.max(Math.min(255+y-head, 255), 255) << 16) | (Math.max(Math.min(180+y/2-head, 255), 180) << 8) | Math.max(Math.min(110+y/2-head, 255), 110) //a,b,g,r
        }
    }
    for(x=0 ; x<render.width ; x++){
        for(y=(render.height/2)+head ; y<render.height ; y++){
            y1 = y-(render.height/2+head)
            data[y * render.width + x] = (255 << 24) | (Math.max(Math.min(50+y1+head, 150), 50)<< 16) | (Math.max(Math.min(50+y1+head, 150), 50) << 8) | Math.max(Math.min(50+y1+head, 150), 50) //a,b,g,r
        }
    }*/
    //Raycasting
    ops = 0
    ops_pixel = 0
    for(let ray of rays){
        let sectorStack = []

        ray_cos = rays_cos[ray.i]
        ray_sin = rays_sin[ray.i]
        ray_rot_cos = Math.cos((ray.deg-rot)*Math.PI/180)
        ray_rot_sin = Math.sin((ray.deg-rot)*Math.PI/180)
        x0 = parseInt(ray.i*lineWidth)
        x1 = parseInt(Math.min(x0+lineWidth, render.width))

        for(let i=0; i<ray.coll.length; i++){
            coll = ray.coll[i]

            if((player_height+jump > coll.sector.z0 || (inside_sector[coll.sector.id] && player_height+jump > coll.sector.z1)) && (coll.next_dist)){
                //ceil
                top_px = ((coll.sector.z0-player_height-jump)/(coll.prev_dist*ray_cos))*plane_dist
                bot_px = ((coll.sector.z0-player_height-jump)/(coll.next_dist*ray_cos))*plane_dist
                ceil_height = coll.sector.z0-player_height
                if(top_px<bot_px) [top_px, bot_px] = [bot_px, top_px]
            
                y0 = parseInt(Math.max(((render.height/2)-(top_px)+head+corr), 0))
                y1 = parseInt(Math.min(((render.height/2)-(bot_px)+head-corr), render.height))
                if(ray.i==debug_ray && !printed) console.log(y0, y1)
                cons_1 = ((ceil_height+player_height-player_height-jump)*plane_dist)
                if(ray.i==debug_ray && !printed) console.log(y0, y1)
                for(let y=y0; y<y1; y++){
                    
                    a = y*render.width
                    if(data[a+x0]) continue
                    d = Math.abs((cons_1/(y-render.height/2-head))/ray_cos)
                    image_x = parseInt(posx + ray_rot_cos*d)*coll.sector.ceil_scale
                    image_y = parseInt(posy + ray_rot_sin*d)*coll.sector.ceil_scale
                    obscuredImage = getPixel(image_x, image_y, coll.sector.ceil_color)
                    for(let x = x0; x < x1; x++){ //esto es más rapido que el fill
                        if(obscuredImage[3] != 0)
                        data[a+x] = (obscuredImage[3] << 24) | (obscuredImage[2] << 16) | (obscuredImage[1] << 8) | obscuredImage[0]
                        //data[a+x] = (255 << 24) | (255 << 16) | (0 << 8) | 0
                    }
                }
            }
            if((player_height+jump < coll.sector.z1 || (inside_sector[coll.sector.id] && player_height+jump < coll.sector.z0)) && (coll.next_dist)){
                //floor
                top_px = ((coll.sector.z1-player_height-jump)/(coll.prev_dist*ray_cos))*plane_dist
                bot_px = ((coll.sector.z1-player_height-jump)/(coll.next_dist*ray_cos))*plane_dist
                ceil_height = coll.sector.z1-player_height
                if(top_px<bot_px) [top_px, bot_px] = [bot_px, top_px]
            
                y0 = parseInt(Math.max(((render.height/2)-(top_px)+head+corr), 0))
                y1 = parseInt(Math.min(((render.height/2)-(bot_px)+head-corr), render.height))
                
                cons_1 = ((ceil_height+player_height-player_height-jump)*plane_dist)
                if(ray.i==debug_ray && !printed) console.log(y0, y1, x0, x1)
                for(let y=y0; y<y1; y++){
                    
                    a = y*render.width
                    if(data[a+x0]) continue
                    d = Math.abs((cons_1/(y-render.height/2-head))/ray_cos)
                    image_x = parseInt(posx + ray_rot_cos*d)*coll.sector.ceil_scale
                    image_y = parseInt(posy + ray_rot_sin*d)*coll.sector.ceil_scale
                    obscuredImage = getPixel(image_x, image_y, coll.sector.floor_color)
                    for(let x = x0; x < x1; x++){ //esto es más rapido que el fill
                        if(obscuredImage[3] != 0)
                        data[a+x] = (obscuredImage[3] << 24) | (obscuredImage[2] << 16) | (obscuredImage[1] << 8) | obscuredImage[0]
                        //data[a+x] = (255 << 24) | (255 << 16) | (0 << 8) | 0
                    }
                }
            }
            
            top_px = ((coll.sector.z0-player_height-jump)/(coll.dist*ray_cos))*plane_dist
            bot_px = ((coll.sector.z1-player_height-jump)/(coll.dist*ray_cos))*plane_dist
            y0 = parseInt(Math.max(((render.height/2)-(top_px)+head)-0, 0))
            y1 = parseInt(Math.min(((render.height/2)-(bot_px)+head)-0, render.height))
            
            image_y0 = parseInt((render.height/2)-(top_px)+head)+coll.sector.texture_y0
            image_x = parseInt(coll.face*coll.sector.texture_w+coll.sector.texture_x0)
            b = coll.sector.texture_h/(top_px-bot_px)

            for(let y=y0; y<y1; y++){
                a = y*render.width
                if(data[a+x0]) continue
                //if(ray.i==debug_ray && !printed) console.log(y0, y1, x0, x1)
                if(parseInt((y-y0))%lineWidth==0){
                    ops_pixel++
                    obscuredImage = getPixel(image_x, parseInt(((y-image_y0)*b)), coll.texture)
                }
                ops++
                for(let x = x0; x < x1; x++){ //esto es más rapido que el fill
                    if(obscuredImage[3] != 0)
                    data[a+x] = (obscuredImage[3] << 24) | (obscuredImage[2] << 16) | (obscuredImage[1] << 8) | obscuredImage[0]
                }
            }

            
        }
        //full = true
        //for(y=0 ; y<render.height ; y++){
        //    a = y*render.width
        //    if(data[a+x0]==0) full = false
        //}
        //if(full) continue
        if(ray.i==debug_ray) printed = true
    }
    imageData.data.set(buf8)
    renderCtx.putImageData(imageData, 0, 0)
}

function findIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

    // Asegurarse de que las líneas no son paralelas
    if (denominator == 0) return null

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

    // Si t y u están entre 0 y 1, las líneas se intersectan en este segmento
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        const intersectX = +(x1 + t * (x2 - x1)).toFixed(2)
        const intersectY = +(y1 + t * (y2 - y1)).toFixed(2)
        return { intersectX, intersectY };
    }

    // Si t o u no están en el rango de 0 a 1, entonces no hay una intersección en los segmentos de línea dados
    return null;
}

function calcDistance(x1, y1, x2, y2) {
    return +Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)).toFixed(2)
}

function distancePointSegment(x1, y1, x2, y2, x0, y0) {
    // Calcular vectores
    const A = x0 - x1;
    const B = y0 - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    // Calcular el producto escalar y la longitud al cuadrado del segmento
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    // Calcular la parametrización y asegurarse de que cae dentro del segmento
    let param = -1;
    if (lenSq != 0) { // Evitar la división por cero
        param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    // Calcular la distancia
    const dx = x0 - xx;
    const dy = y0 - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

function pointInSector(posx, posy, sector) {
    let inside = false;
    let vertices = sector.points
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        let [xi, yi] = vertices[i]
        let [xj, yj] = vertices[j]

        let inters = ((yi > posy) != (yj > posy))
            && (posx < (xj - xi) * (posy - yi) / (yj - yi) + xi)
        
        if (inters) inside = !inside
    }

    return inside
}

elapsedTime = 0
previousTime = 0
frameTime = 0
v0 = 0.3
v1 = 0.6
vel = v0
to_jump=false
keys = {}
new_posx = posx
new_posy = posy
gameTime = 0
function frame(time) {
    elapsedTime = (time - previousTime)
    gameTime += elapsedTime/1000
    gameTime = +(gameTime).toFixed(2)
    previousTime = time
    if(keys['arrowup']){
        new_posx += vel*elapsedTime*Math.cos(rot/180*Math.PI)
        new_posy -= vel*elapsedTime*Math.sin(rot/180*Math.PI)
    }
    if(keys['arrowdown']){
        new_posx -= vel*elapsedTime*Math.cos(rot/180*Math.PI)
        new_posy += vel*elapsedTime*Math.sin(rot/180*Math.PI)
    }
    if(keys['a']){
        new_posx -= vel*elapsedTime*Math.sin(rot/180*Math.PI)
        new_posy -= vel*elapsedTime*Math.cos(rot/180*Math.PI)
    }
    if(keys['d']){
        new_posx += vel*elapsedTime*Math.sin(rot/180*Math.PI)
        new_posy += vel*elapsedTime*Math.cos(rot/180*Math.PI)
    }

    colls = []
    //player distance to segments
    for(var sector of sectors){
    let points = sector.points
        for(let i=0 ; i<points.length ; i++){
            j = (i+1)%points.length
            let player_dist = +(distancePointSegment(points[i][0], points[i][1], points[j][0], points[j][1], new_posx, new_posy)).toFixed(2)
            colls.push({dist:player_dist, sector})
        }
    }
    colls.sort((a, b) => { return a.dist - b.dist })
    if(collisions && colls[0].dist<10){
        if(colls[0].sector.static){
            new_posx = posx
            new_posy = posy
        }else{
            if(colls[0].sector.fh-jump>-30){
                new_posx = posx
                new_posy = posy
            }else{
                jump = colls[0].sector.fh+50
                posx = new_posx
                posy = new_posy
            }
        }
    }else{
        posx = new_posx
        posy = new_posy
    }

    if(keys['arrowleft']){
        rot += vel/2*elapsedTime
    }
    if(keys['arrowright']){
        rot -= vel/2*elapsedTime
    }
    if(keys['z']){
        head += parseInt(2*vel*elapsedTime)
    }
    if(keys['c']){
        head -= parseInt(2*vel*elapsedTime)
    }
    if(keys['w']){
        jump += parseInt(vel*elapsedTime)
    }
    if(keys['s']){
        jump -= parseInt(vel*elapsedTime)
    }
    if(keys['r']){
        jump = 0
        head = 0
    }
    if(keys['e']){
        ray = rays[debug_ray]
        elem = ray.coll.filter(x => (x.sector && typeof x.sector.action != 'undefined' && x.dist<200))[0]
        if(elem) elem.sector.action(elem.sector)
    }
    if(keys['x']){
        if(!to_jump){
            to_jump = true
            jump_time = 0
            jump0 = jump
        }
    }
    if(keys['shift']){
        vel=v1
    }
    if(!keys['shift']){
        vel=v0
    }
    if(to_jump){
        jump_time += elapsedTime/1000
        jump = parseInt(jump0 +  50*(jump_time) - (0.5 * 80 * jump_time * jump_time))
        if(jump<0){
            to_jump = false
            jump_time = 0
            jump = 0
            jump0 = 0
        }
    }

    localStorage.setItem("player", JSON.stringify({posx: posx, posy: posy, rot: rot, head: head, jump: jump}))

    if (time > frameTime + (1000/fps)) {
        renderFrame()
        frameTime = time
    }
    requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

document.addEventListener('keydown', (event)=>{
    keys[event.key.toLowerCase()] = true
    //console.log('pressed:', event.key.toLowerCase())
})
document.addEventListener('keyup', (event)=>{
    keys[event.key.toLowerCase()] = false
    //console.log('released:', event.key.toLowerCase())
})

//Uno de los problemas es que operar con decimales es muy lento