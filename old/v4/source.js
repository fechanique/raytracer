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

const player = JSON.parse(localStorage.getItem("player"))

posx = player?player.posx:320
posy = player?player.posy:477
rot = player?player.rot:0
head = player?player.head:0
jump = player?player.jump:0

fov = 32
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
        sectors = sectors.sort((a, b) => { return b.static - a.static }) //revisar esto, pero da problemas el orden de los sectores en pintado
        for(var sector of sectors){
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
        ray.coll.sort((a, b) => { return b.dist - a.dist })
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
    let data = new Uint32Array(buf)
    
    //sky
    for(x=0 ; x<render.width ; x++){
        for(y=0 ; y<(render.height/2+head) ; y++){
            data[y * render.width + x] = (255-y << 24) | (255 << 16) | (180 << 8) | 100 //a,b,g,r
        }
    }
    for(x=0 ; x<render.width ; x++){
        for(y=(render.height/2)+head ; y<render.height ; y++){
            data[y * render.width + x] = (255 << 24) | (100 << 16) | (100 << 8) | 100 //a,b,g,r
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

        last_fh = 0
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
                image_y0 = parseInt((render.height/2)-(top_px)+head)
                image_x = parseInt(coll.face*coll.sprite.texture_scale_w)
                y0 = parseInt(Math.max(((render.height/2)-(top_px)+head)-0, 0))
                y1 = parseInt(Math.min(((render.height/2)-(bot_px)+head)-0, render.height))
                for(let y=y0; y<y1; y++){
                    if(parseInt((y-image_y0))%lineWidth==0){
                    image_y = parseInt(((y-image_y0+1)*100/coll.sprite.texture_scale_h)/(top_px-bot_px))
                    obscuredImage = obscure(getPixel(image_x, image_y, coll.sprite.texture), coll.dist)
                    }
                    if(obscuredImage[3] != 0)
                    data.fill((obscuredImage[3] << 24) | (obscuredImage[2] << 16) | (obscuredImage[1] << 8) | obscuredImage[0], y * render.width + x0, y * render.width + x1)
                }
            }

            if(coll.sector){

            if(!sectorStack.find(x => x.id === coll.sector.id)) sectorStack.push(coll.sector)
            else sectorStack.pop()
            curr_sector = sectorStack[sectorStack.length-1]
            if(ray.i==debug_ray && typeof printed == 'undefined') console.log(coll.sector.id, curr_sector.id)

            if(coll.sector.static){
                let top_px = ((coll.sector.ch-jump)/(coll.dist*ray_cos))*plane_dist
                let bot_px = ((coll.sector.fh-jump)/(coll.dist*ray_cos))*plane_dist
                image_y0 = parseInt((render.height/2)-(top_px)+head)
                image_x = parseInt(coll.face*coll.sector.texture_w)+coll.sector.texture_x0
                y0 = parseInt(Math.max(((render.height/2)-(top_px)+head)-0, 0))
                y1 = parseInt(Math.min(((render.height/2)-(bot_px)+head)-0, render.height))
                for(let y=y0; y<y1; y++){
                    //if(parseInt((y-image_y0))%lineWidth==0){
                        image_y = parseInt((y-image_y0)*coll.sector.texture_h/(top_px-bot_px))
                        obscuredImage = obscure(getPixel(image_x, image_y, coll.color), coll.dist)
                    //}
                    if(obscuredImage[3] != 0)
                    data.fill((obscuredImage[3] << 24) | (obscuredImage[2] << 16) | (obscuredImage[1] << 8) | obscuredImage[0], y * render.width + x0, y * render.width + x1)
                }
            }else{
                let top_px = ((curr_sector.ch-jump)/(coll.dist*ray_cos))*plane_dist
                let bot_px = ((prev_sector.ch-jump)/(coll.dist*ray_cos))*plane_dist
                if(top_px<bot_px) [top_px, bot_px] = [bot_px, top_px]
                image_y0 = parseInt((render.height/2)-(top_px)+head)
                image_x = parseInt(coll.face*coll.sector.texture_w)+coll.sector.texture_x0
                y0 = parseInt(Math.max(((render.height/2)-(top_px)+head)-0, 0))
                y1 = parseInt(Math.min(((render.height/2)-(bot_px)+head)-0, render.height))
                for(let y=y0; y<y1; y++){
                    image_y = parseInt((y-image_y0)*coll.sector.texture_h/(top_px-bot_px))
                    obscuredImage = obscure(getPixel(image_x, image_y, coll.color), coll.dist)
                    data.fill((obscuredImage[3] << 24) | (obscuredImage[2] << 16) | (obscuredImage[1] << 8) | obscuredImage[0], y * render.width + x0, y * render.width + x1)
                    //data.fill((255 << 24) | (0 << 16) | (180 << 8) | 255, y * render.width + x0, y * render.width + x1) //a,b,g,r
                }
                //if(ray.i==debug_ray && typeof printed == 'undefined') console.log(curr_sector, prev_coll)
                let top_px2 = ((curr_sector.fh-jump)/(coll.dist*ray_cos))*plane_dist
                let bot_px2 = ((prev_sector.fh-jump)/(coll.dist*ray_cos))*plane_dist
                if(top_px2<bot_px2) [top_px2, bot_px2] = [bot_px2, top_px2]
                image_y0 = parseInt((render.height/2)-(top_px2)+head)
                image_x = parseInt(coll.face*coll.sector.texture_w)+coll.sector.texture_x0
                y0 = parseInt(Math.max(((render.height/2)-(top_px2)+head)-0, 0))
                y1 = parseInt(Math.min(((render.height/2)-(bot_px2)+head)-0, render.height))
                for(let y=y0; y<y1; y++){
                    image_y = parseInt((y-image_y0)*coll.sector.texture_h/(top_px2-bot_px2))
                    obscuredImage = obscure(getPixel(image_x, image_y, coll.color), coll.dist)
                    data.fill((obscuredImage[3] << 24) | (obscuredImage[2] << 16) | (obscuredImage[1] << 8) | obscuredImage[0], y * render.width + x0, y * render.width + x1)
                }
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
                    image_x = parseInt(posx + ray_rot_cos*d)
                    image_y = parseInt(posy + ray_rot_sin*d)

                    obscuredImage = obscure(getPixel(image_x, image_y, curr_sector.ceil_color), d)
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
                for(let y=y0; y<y1; y++){
                    d = (((player_height+jump-floor_height)*plane_dist)/(y-render.height/2-head))/Math.cos(ray.deg*Math.PI/180)
                    image_x = parseInt(posx + ray_rot_cos*d)*curr_sector.floor_scale
                    image_y = parseInt(posy + ray_rot_sin*d)*curr_sector.floor_scale

                    obscuredImage = obscure(getPixel(image_x, image_y, curr_sector.floor_color), d)
                    //if(ray.i==debug_ray && typeof printed == 'undefined') console.log(image_x, image_y)
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
    if (denominator == 0) {
        return null; // No hay intersección, las líneas son paralelas o coincidentes
    }

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

elapsedTime = 0
lastTime = 0
vel=2
v0=3
to_jump=false
keys = {}
function frame(time) {
  elapsedTime = (time - elapsedTime)/10
  if(keys['arrowup']){
    posx += vel*elapsedTime*Math.cos(rot/180*Math.PI)
    posy -= vel*elapsedTime*Math.sin(rot/180*Math.PI)
  }
  if(keys['arrowdown']){
    posx -= vel*elapsedTime*Math.cos(rot/180*Math.PI)
    posy += vel*elapsedTime*Math.sin(rot/180*Math.PI)
  }
  if(keys['a']){
    posx -= vel*elapsedTime*Math.sin(rot/180*Math.PI)
    posy -= vel*elapsedTime*Math.cos(rot/180*Math.PI)
  }
  if(keys['d']){
    posx += vel*elapsedTime*Math.sin(rot/180*Math.PI)
    posy += vel*elapsedTime*Math.cos(rot/180*Math.PI)
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
        if(jump==0) jump=0.01
        jump_time = 0
    }
  }
  if(keys['shift']){
    vel=4
  }
  if(!keys['shift']){
    vel=2
  }
  if(to_jump){
    jump += 5 * jump_time - 0.5 * 10 * jump_time * jump_time;
    jump_time += elapsedTime/50
    if(jump<=0){
        to_jump = false
        jump = 0
    }
  }

    localStorage.setItem("player", JSON.stringify({posx: posx, posy: posy, rot: rot, head: head, jump: jump}))

  elapsedTime = time
  if (time > lastTime + (1000/fps)) {
    renderFrame()
    lastTime = time
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



//Uno de los problemas es que operar con decimales es muy lento