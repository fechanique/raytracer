let render = document.getElementById('render')
let editor = document.getElementById('editor')
let renderCtx = render.getContext('2d', { willReadFrequently: true })
let editorCtx = editor.getContext('2d')

let fps = 30
let width = 640
let height = 480

const offscreen = new OffscreenCanvas(width, height) //revisar si esto mejora algo
offscreenCtx = offscreen.getContext('2d', { willReadFrequently: true })

renderCtx.canvas.width = 640
renderCtx.canvas.height = 480

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

fov = 30
player_height = 0
plane_dist = 800
num = render.width/3
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

    for(let ray of rays){
        ray.coll = []
        for(let[ index, sector] of sectors.entries()){
            sector.id = index
            let points = sector.points
            for(let i=0 ; i<points.length ; i++){
                j = (i+1)%points.length
                let temp_int = findIntersection(posx, posy, posx+rayMod*Math.cos((rot-ray.deg)/180*Math.PI), posy-rayMod*Math.sin((rot-ray.deg)/180*Math.PI), 
                points[i][0], points[i][1], points[j][0], points[j][1])
                if(temp_int){
                    temp_dist = calcDistance(posx, posy, temp_int.intersectX, temp_int.intersectY)
                    face_dist = calcDistance(points[i][0], points[i][1], temp_int.intersectX, temp_int.intersectY)
                    ray.coll.push({dist: temp_dist, int: temp_int, color: points[i][2],sector: sector, face:face_dist, sprite:null})
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
        ray.coll.sort((b, a) => { return a.dist - b.dist })
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

    let imageData = offscreenCtx.getImageData(0, 0, render.width, render.height)
    let buf = new ArrayBuffer(imageData.data.length)
    let buf8 = new Uint8ClampedArray(buf)
    data = new Uint32Array(buf)
    
    //sky
    for(x=0 ; x<render.width ; x++){
        for(y=0 ; y<(render.height/2+head) ; y++){
            data[y * render.width + x] = (255 << 24) | (Math.max(Math.min(255+y-head, 255), 255) << 16) | (Math.max(Math.min(180+y/2-head, 255), 180) << 8) | Math.max(Math.min(110+y/2-head, 255), 110) //a,b,g,r
        }
    }
    for(x=0 ; x<render.width ; x++){
        for(y=(render.height/2)+head ; y<render.height ; y++){
            y1 = y-(render.height/2+head)
            data[y * render.width + x] = (255 << 24) | (Math.max(Math.min(50+y1+head, 150), 50)<< 16) | (Math.max(Math.min(50+y1+head, 150), 50) << 8) | Math.max(Math.min(50+y1+head, 150), 50) //a,b,g,r
        }
    }

    for(let ray of rays){
        let sectorStack = []
        
        ray_cos = rays_cos[ray.i]
        ray_sin = rays_sin[ray.i]
        ray_rot_cos = Math.cos((ray.deg-rot)*Math.PI/180)
        ray_rot_sin = Math.sin((ray.deg-rot)*Math.PI/180)
        x0 = parseInt(ray.i*lineWidth)
        x1 = parseInt(Math.min((ray.i*lineWidth)+lineWidth, render.width))

        prev_sector = null
        for(let i=0; i<ray.coll.length; i++){

            let coll = ray.coll[i]
            next_coll = null
            for(let j=i+1; j<ray.coll.length; j++){
                if(ray.coll[j].sprite == null){
                    next_coll = ray.coll[j]
                    break
                }
            }
            if(!next_coll) next_coll = {dist:1}

            if(coll.sprite){
                let top_px = ((coll.sprite.posz + coll.sprite.height/2-jump)/(coll.dist*ray_cos))*plane_dist
                let bot_px = ((coll.sprite.posz - coll.sprite.height/2-jump)/(coll.dist*ray_cos))*plane_dist
                y0 = parseInt(Math.max(((render.height/2)-(top_px)+head)-0, 0))
                y1 = parseInt(Math.min(((render.height/2)-(bot_px)+head)-0, render.height))
                //if(ray.i==debug_ray && typeof printed == 'undefined') console.log(top_px, bot_px)
                drawTexture(y0, y1, x0, x1, top_px, bot_px, coll, coll.sprite.texture, 
                    coll.sprite.texture_h, coll.sprite.texture_w, coll.sprite.texture_x0, coll.sprite.texture_y0)
            }

            if(coll.sector){

            if(!sectorStack.find(x => x.id === coll.sector.id)) sectorStack.push(coll.sector)
            else sectorStack.pop()
            curr_sector = sectorStack[sectorStack.length-1]
            //if(ray.i==debug_ray && typeof printed == 'undefined') console.log(coll.sector.id, curr_sector.id)

            if(coll.sector.static){
                let top_px = ((coll.sector.ch-jump)/(coll.dist*ray_cos))*plane_dist
                let bot_px = ((coll.sector.fh-jump)/(coll.dist*ray_cos))*plane_dist
                y0 = parseInt(Math.max(((render.height/2)-(top_px)+head)-0, 0))
                y1 = parseInt(Math.min(((render.height/2)-(bot_px)+head)-0, render.height))
                drawTexture(y0, y1, x0, x1, top_px, bot_px, coll, coll.color, 
                    coll.sector.texture_h, coll.sector.texture_w, coll.sector.texture_x0, coll.sector.texture_y0)
            }else{
                if(!curr_sector) continue
                if(!prev_sector) continue
                let top_px = ((curr_sector.ch-jump)/(coll.dist*ray_cos))*plane_dist
                let bot_px = ((prev_sector.ch-jump)/(coll.dist*ray_cos))*plane_dist
                if(top_px<bot_px) [top_px, bot_px] = [bot_px, top_px]
                y0 = parseInt(Math.max(((render.height/2)-(top_px)+head)-0, 0))
                y1 = parseInt(Math.min(((render.height/2)-(bot_px)+head)-0, render.height))
                drawTexture(y0, y1, x0, x1, top_px, bot_px, coll, coll.color, 
                    coll.sector.texture_h, coll.sector.texture_w, coll.sector.texture_x0, coll.sector.texture_y0)

                //if(ray.i==debug_ray && typeof printed == 'undefined') console.log(curr_sector, prev_coll)
                let top_px2 = ((curr_sector.fh-jump)/(coll.dist*ray_cos))*plane_dist
                let bot_px2 = ((prev_sector.fh-jump)/(coll.dist*ray_cos))*plane_dist
                if(top_px2<bot_px2) [top_px2, bot_px2] = [bot_px2, top_px2]
                y0 = parseInt(Math.max(((render.height/2)-(top_px2)+head)-0, 0))
                y1 = parseInt(Math.min(((render.height/2)-(bot_px2)+head)-0, render.height))
                drawTexture(y0, y1, x0, x1, top_px2, bot_px2, coll, coll.color, 
                    coll.sector.texture_h, coll.sector.texture_w, coll.sector.texture_x0, coll.sector.texture_y0)
            }
            
            //ceil
            if(!curr_sector) continue
            if(curr_sector.ceil_color){
                ceil_bot_px = ((curr_sector.ch-jump)/(coll.dist*ray_cos))*plane_dist
                ceil_top_px = ((curr_sector.ch-jump)/(next_coll.dist*ray_cos))*plane_dist
                ceil_height = curr_sector.ch
            
                y0 = parseInt(Math.max(((render.height/2)-(ceil_bot_px)+head+corr), 0))
                y1 = parseInt(Math.max(((render.height/2)-(ceil_top_px)+head-corr), 0))

                cons_1 = ((ceil_height+player_height-jump)*plane_dist)
                for(let y=y1; y<y0; y++){
                    d = Math.abs((cons_1/(y-render.height/2-head))/ray_cos)
                    image_x = parseInt(posx + ray_rot_cos*d)*curr_sector.ceil_scale
                    image_y = parseInt(posy + ray_rot_sin*d)*curr_sector.ceil_scale

                    obscuredImage = obscure(getPixel(image_x, image_y, curr_sector.ceil_color), d)
                    if(obscuredImage[3] != 0)
                    data.fill((obscuredImage[3] << 24) | (obscuredImage[2] << 16) | (obscuredImage[1] << 8) | obscuredImage[0], y * render.width + x0, y * render.width + x1)
                }
            }
            //floor
            if(curr_sector.floor_color){
                floor_top_px = ((curr_sector.fh-jump)/(coll.dist*ray_cos))*plane_dist
                floor_bot_px = ((curr_sector.fh-jump)/(next_coll.dist*ray_cos))*plane_dist
                floor_height = curr_sector.fh
            
                y0 = parseInt(Math.max(((render.height/2)-(floor_top_px))+head, 0))
                y1 = parseInt(Math.min(((render.height/2)-(floor_bot_px))+head, render.height))

                cons_1 = ((floor_height+player_height-jump)*plane_dist)
                for(let y=y0; y<y1; y++){
                    d = Math.abs((cons_1/(y-render.height/2-head))/ray_cos)
                    image_x = parseInt(posx + ray_rot_cos*d)*curr_sector.floor_scale
                    image_y = parseInt(posy + ray_rot_sin*d)*curr_sector.floor_scale

                    obscuredImage = obscure(getPixel(image_x, image_y, curr_sector.floor_color), d)
                    if(obscuredImage[3] != 0)
                    data.fill((obscuredImage[3] << 24) | (obscuredImage[2] << 16) | (obscuredImage[1] << 8) | obscuredImage[0], y * render.width + x0, y * render.width + x1)
                }
            }
            }
            prev_sector = curr_sector
        }
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
    if(colls[0].dist<10){
        if(colls[0].sector.static){
            new_posx = posx
            new_posy = posy
        }else{
            console.log(colls[0].sector.fh-jump)
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
        jump += vel*elapsedTime
    }
    if(keys['s']){
        jump -= vel*elapsedTime
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
        jump = jump0 +  50*(jump_time) - (0.5 * 80 * jump_time * jump_time)
        console.log(jump, jump_time)
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

function obscure(rgba, distance){
    th = 300
    if(distance>th){
        rgba[0] = rgba[0]/(1+(distance-th)/500)
        rgba[1] = rgba[1]/(1+(distance-th)/500)
        rgba[2] = rgba[2]/(1+(distance-th)/500)
    }
    return [rgba[0], rgba[1], rgba[2], rgba[3]]
}

function drawTexture(y0, y1, x0, x1, top_px, bot_px, coll, texture, texture_h, texture_w, texture_x0, texture_y0){
    image_y0 = parseInt((render.height/2)-(top_px)+head)+texture_y0
    image_x = parseInt(coll.face*texture_w+texture_x0)
    for(let y=y0; y<y1; y++){
        if(parseInt((y-y0))%lineWidth==0){
            image_y = parseInt(((y-image_y0)/(top_px-bot_px)*texture_h))
            obscuredImage = obscure(getPixel(image_x, image_y, texture), coll.dist)
        }
        if(obscuredImage[3] != 0)
        data.fill((obscuredImage[3] << 24) | (obscuredImage[2] << 16) | (obscuredImage[1] << 8) | obscuredImage[0], y * render.width + x0, y * render.width + x1)
    }
}


//Uno de los problemas es que operar con decimales es muy lento