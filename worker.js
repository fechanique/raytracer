printed = false
animating = false
textures = {}
rays = []

function paintFrame(){
    imageData.data.set(buf8)
    renderCtx.putImageData(imageData, 0, 0)
}

function renderFrame(){
    for(let ray of rays){ //hacer operaciones aquí no quita muchos frames
        rot_ray_cos = Math.cos((player.rot-ray.deg)*Math.PI/180)
        rot_ray_sin = Math.sin((player.rot-ray.deg)*Math.PI/180)
        ray.x0 = player.posx
        ray.y0 = player.posy
        ray.x1 = player.posx+cam.visibility*rot_ray_cos
        ray.y1 = player.posy-cam.visibility*rot_ray_sin
        ray.coll = []
        for(let[index, sector] of sectors.entries()){
            if(inside_sector[sector.id]){
                ray.coll.push({id:sector.name, dist:0, point:[0,0,0,0], int: {}, texture: null, sector, face:null, sprite:null}) //fix missing spline fov
            }
            let points = sector.points
            for(let i=0 ; i<points.length ; i++){
                j = (i+1)%points.length
                let temp_int = findIntersection(ray.x0, ray.y0, ray.x1, ray.y1, points[i][0], points[i][1], points[j][0], points[j][1])
                if(temp_int){
                    temp_dist = calcDistance(player.posx, player.posy, temp_int.intersectX, temp_int.intersectY)
                    if(!inside_sector[sector.id] || temp_dist>0){
                        face_dist = calcDistance(points[i][0], points[i][1], temp_int.intersectX, temp_int.intersectY)
                        //real_dist = Math.sqrt(temp_dist**2 + (player.jump-sector.z0)**2)
                        ray.coll.push({id:i, dist: temp_dist, int: temp_int, texture: points[i][2], point:points[i], sector: sector, face:face_dist, sprite:null})
                    }
                }
            }
        }

        ray.coll.sort((a, b) => {
            return (a.dist - b.dist)
        })

        for(var coll of ray.coll){
            if(!coll.out){
                next_coll = ray.coll.find((e) => e.sector.id == coll.sector.id && e.id != coll.id && e.dist >= coll.dist)
                if(next_coll){
                    next_coll.out = true
                    coll.prev_dist = coll.dist
                    coll.next_dist = next_coll.dist
                    //if(inside_sector[coll.sector.id]) coll.out = true
                }else{
                    if(pointInSector(ray.x1, ray.y1, coll.sector)){
                        coll.next_dist = cam.visibility
                        coll.prev_dist = coll.dist
                    }
                }
            }
        }
        ray.coll = ray.coll.filter(x => !x.out)

        sorted_coll = []
        iterations = 0
        if(ray.i==debug_ray && !printed) console.log( ray.coll )
        while(sorted_coll.length < ray.coll.length && iterations < 100){
            for(var coll of ray.coll){
                if(coll.sorted) continue
                if(player.height+player.jump < coll.sector.z1){//jugador debajo de sector
                    if(ray.coll.find((e) => e.sector.id != coll.sector.id && !e.sorted 
                    && (player.height+player.jump < e.sector.z0) && (e.sector.z1 < coll.sector.z0) && (e.dist < coll.next_dist)
                    //&& (coll.sector.type!='sprite')
                    )){
                        continue
                    }else{
                        coll.sorted=true
                        sorted_coll.push(coll)
                    }
                }else if(player.height+player.jump > coll.sector.z0){//jugador encima de sector
                    if(ray.coll.find((e) => e.sector.id != coll.sector.id && !e.sorted 
                    && (player.height+player.jump > e.sector.z1) && (e.sector.z0 > coll.sector.z1) && (e.dist < coll.next_dist)
                    //&& (coll.sector.type!='sprite')
                    )){
                        continue
                    }else{
                        coll.sorted=true
                        sorted_coll.push(coll)
                    }
                }else if(ray.coll.find((e) => e.sector.id != coll.sector.id && !e.sorted
                    && (coll.sector.z0 >= e.sector.z0) && (coll.sector.z1 <= e.sector.z1) && (e.dist < coll.next_dist)
                    //&& (coll.sector.type!='sprite')
                    )){
                        continue
                }else if(ray.coll.find((e) => e.sector.id != coll.sector.id && !e.sorted
                    && (coll.sector.z0 <= e.sector.z0) && (coll.sector.z1 >= e.sector.z1) && (e.dist < coll.next_dist)
                    //&& (coll.sector.type!='sprite')
                    )){
                        continue
                }else{
                    coll.sorted=true
                    sorted_coll.push(coll)
                }
            }
            iterations++
        }
        ray.coll = sorted_coll
        //if(ray.i==debug_ray && !printed) console.log( iterations )
    }

    buf = new ArrayBuffer(imageData.data.length)
    buf8 = new Uint8ClampedArray(buf)
    data = new Uint32Array(buf)

    for([index, ray] of rays.entries()){
        z_counter = 0
        z_buffer = new Array(game.height).fill(0)

        ray_cos = ray.cos
        ray_sin = ray.sin
        ray_rot_cos = Math.cos((ray.deg-player.rot)*Math.PI/180)
        ray_rot_sin = Math.sin((ray.deg-player.rot)*Math.PI/180)
        x0 = Math.floor(index*lineWidth)
        x1 = Math.floor(Math.min(x0+lineWidth, game.width))

        for(let coll of ray.coll){
            drawWall(coll)
            if(coll.sector.z0 < player.height+player.jump && coll.sector.z1 < player.height+player.jump) draw_plane(coll, true)
            else if(coll.sector.z1 > player.height+player.jump && coll.sector.z0 > player.height+player.jump) draw_plane(coll, false)
            if(z_buffer.reduce((a, b) => a + b, 0)>= game.height){
                break
            }
        }
        if(ray.i==debug_ray) printed = true
    }

    drawSky()
    
    postMessage({id:'', fps:fps})
}

function drawWall(coll){
    let top_px = ((coll.sector.z0-player.height-player.jump)/(coll.dist*ray_cos))*cam.plane_dist
    let bot_px = ((coll.sector.z1-player.height-player.jump)/(coll.dist*ray_cos))*cam.plane_dist
    let y0 = Math.floor(Math.max(((game.height/2)-(top_px)+player.head), 0))
    let y1 = Math.floor(Math.min(((game.height/2)-(bot_px)+player.head), game.height))
    if(z_buffer.slice(y0, y1+1).reduce((a, b) => a + b, 0) == y1-y0+1) return
    
    let image_y0 = Math.floor((game.height/2)-(top_px)+player.head+coll.sector.texture_y0)
    let image_x = Math.floor(coll.face*coll.sector.texture_w+coll.sector.texture_x0)
    let b = coll.sector.texture_h/(top_px-bot_px)

    let factor = coll.point[3]
    for(let light_coll of coll.sector.lights){
        let light = light_coll? light_coll.find((e) => e.point==coll.id && (e.face_dist >= coll.face)) : null
        if(!light) light = light_coll? light_coll.filter((e) => e.point==coll.id).slice(-1)[0] : null
        if(!light) calc = 0
        else calc = light.intensity
        factor += calc
        factor = Math.max(Math.min(factor, 1), 0)
    }
    let obscuredImage = null
    for(let y=y0; y<y1; y++){
        if(z_buffer[y]==1){
            obscuredImage = null
            continue
        }
        if((y-y0)%lineWidth==0 || !obscuredImage){
            obscuredImage = obscure(getPixel(image_x, Math.floor(((y-image_y0)*b)), coll.texture), coll.dist, factor)
        }
        if(obscuredImage[3] != 0){
            a = y*game.t_width
            z_counter++
            z_buffer[y] = 1
            for(let x = x0; x < x1; x++){ //esto es más rapido que el fill
                    //if(ray.i==debug_ray && !printed) console.log( a+x )
                    data[a+x] = (obscuredImage[3] << 24) | (obscuredImage[2] << 16) | (obscuredImage[1] << 8) | obscuredImage[0]
                    //data[a+x] = (255 << 24) | (255 << 16) | (0 << 8) | 0
            }
        }
    }
}

function draw_plane(coll, isTop){
    if(isTop){
        z = coll.sector.z0
        texture = coll.sector.floor_color
        scale = coll.sector.floor_scale
        factor = coll.sector.floor_light
    }else{
        z = coll.sector.z1
        texture = coll.sector.ceil_color
        scale = coll.sector.ceil_scale
        factor = coll.sector.ceil_light
    }
    let top_px = ((z-player.height-player.jump)/(coll.prev_dist*ray_cos))*cam.plane_dist
    let bot_px = ((z-player.height-player.jump)/(coll.next_dist*ray_cos))*cam.plane_dist
    let ceil_height = z-player.height
    if(top_px<bot_px) [top_px, bot_px] = [bot_px, top_px]

    let y0 = Math.floor(Math.max(((game.height/2)-(top_px)+player.head), 0))
    let y1 = Math.floor(Math.min(((game.height/2)-(bot_px)+player.head), game.height))
    if(z_buffer.slice(y0, y1+1).reduce((a, b) => a + b, 0) == y1-y0+1) return
    let cons_1 = ((ceil_height+player.height-player.height-player.jump)*cam.plane_dist)
    let obscuredImage = null
    for(let y=y0; y<y1; y++){
        if(z_buffer[y]==1){
            obscuredImage = null
            continue
        }
        if((y-y0)%lineWidth==0 || !obscuredImage){
            d = Math.abs((cons_1/(y-game.height/2-player.head))/ray_cos)
            let image_x = Math.floor(player.posx + ray_rot_cos*d)
            let image_y = Math.floor(player.posy + ray_rot_sin*d)
            factor = coll.sector.floor_light

            if(coll.sector.floor_lights){
                for(var light of coll.sector.floor_lights){
                    calc = light.intensity*(1-(calcDistance(image_x, image_y, light.x, light.y)/light.dist))
                    calc = Math.max(calc, 0)
                    factor += calc
                }
                factor = Math.max(Math.min(factor, 1), 0)
                //if(ray.i==debug_ray && !printed) console.log( dist )
            }
            let texture_x = (image_x - coll.sector.points[0][0])*scale
            let texture_y = (image_y - coll.sector.points[0][1])*scale
            //console.log(texture_x, texture_y)
            obscuredImage = obscure(getPixel(texture_x, texture_y, texture), d, factor)
        }
        if(obscuredImage[3] != 0){
            a = y*game.t_width
            z_counter++
            z_buffer[y] = 1
            for(let x = x0; x < x1; x++){ //esto es más rapido que el fill
                data[a+x] = (obscuredImage[3] << 24) | (obscuredImage[2] << 16) | (obscuredImage[1] << 8) | obscuredImage[0]
                //data[a+x] = (255 << 24) | (255 << 16) | (0 << 8) | 0
            }
        }
    }
}

function drawSky(){
    for(y=Math.floor(game.height/2+player.head)-1 ; y>=0 ; y--){
        a = Math.floor(y*game.t_width)
        for(x=0 ; x<game.t_width ; x++){
            if(data[a+x]) continue
            data[a + x] = (255 << 24) | 255 << 16 | (200 << 8) | 100 //a,b,g,r
        }
    }
    for(y=Math.floor(game.height/2)+player.head ; y<game.height ; y++){
        a = Math.floor(y*game.t_width)
        y1 = y-Math.floor(game.height/2+player.head)
        for(x=0 ; x<game.t_width ; x++){
            if(data[a+x]) continue
            data[a + x] = (255 << 24) | (Math.max(Math.min(50+y1, 150), 50)<< 16) | (Math.max(Math.min(50+y1, 150), 50) << 8) | Math.max(Math.min(50+y1, 150), 50) //a,b,g,r
        }
    }
}

function findIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

    // Asegurarse de que las líneas no son paralelas
    if (denominator == 0) return null

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

    // Si t y u están entre 0 y 1, las líneas se intersectan en este segmento
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        const intersectX = (x1 + t * (x2 - x1))
        const intersectY = (y1 + t * (y2 - y1))
        return { intersectX, intersectY };
    }

    // Si t o u no están en el rango de 0 a 1, entonces no hay una intersección en los segmentos de línea dados
    return null;
}

function calcDistance_(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}

function calcDistance(x1, y1, x2, y2){
    let x = (x2-x1)
    let y = (y2-y1)
    return Math.round(Math.sqrt(x**2+y**2)*100)/100
}

function pointInSector(posx, posy, sector) {
    let inside = false;
    let vertices = sector.points
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        let [xi, yi] = vertices[i]
        let [xj, yj] = vertices[j]

        let inters = ((yi > posy) != (yj > posy)) && (posx < (xj - xi) * (posy - yi) / (yj - yi) + xi)
        
        if (inters) inside = !inside
    }

    return inside
}

function obscure(rgba, distance, factor){
    //return [rgba[0], rgba[1], rgba[2], rgba[3]]
    th = 500
    if(distance>th){
        rr = Math.floor((rgba[0]/(1+(distance-th)/1000))*factor)
        gg = Math.floor((rgba[1]/(1+(distance-th)/1000))*factor)
        bb = Math.floor((rgba[2]/(1+(distance-th)/1000))*factor)
        //aa = Math.max(255*(1-((distance-th)/(cam.visibility-th))), 0)
        aa = rgba[3]
    }else{
        rr = Math.floor(rgba[0]*factor)
        gg = Math.floor(rgba[1]*factor)
        bb = Math.floor(rgba[2]*factor)
        aa = rgba[3]
    }
    return [rr, gg, bb, aa]
}

function getPixel(x, y, texture_src) {
    //return [255, 255, 255, 255]
    let texture = textures[texture_src]
    if(!isFinite(x) || !isFinite(y) || typeof texture == 'undefined') return [255, 255, 255, 0]
    let x_mod = x % texture.width
    let y_mod = y % texture.height
    // Calcula el índice del píxel en el array de datos
    let index = ((((x_mod + y_mod * texture.width)) % texture.data.length)+texture.data.length)%texture.data.length
    
    return texture.data[index] //r//g//b//a
}

function mixRgbAlpha(rgba1, rgba2){
    let a = rgba2[3]/255
    let r = Math.round((1-a)*rgba1[0] + a*rgba2[0])
    let g = Math.round((1-a)*rgba1[1] + a*rgba2[1])
    let b = Math.round((1-a)*rgba1[2] + a*rgba2[2])
    return [r, g, b, 255]
}

onmessage = function (event) {
    if(event.data.action == 'init'){
        cam = event.data.cam
        game = event.data.game
        debug_ray = cam.num_rays/2
        lineWidth = game.width/cam.num_rays
        canvas = event.data.renderCanvas
        renderCtx = canvas.getContext('2d', { willReadFrequently: true })
        //renderCtx.canvas.width = canvas.width
        //renderCtx.canvas.height = canvas.height
        offscreen = new OffscreenCanvas(canvas.width, canvas.height) //revisar si esto mejora algo
        offscreenCtx = offscreen.getContext('2d', { willReadFrequently: true })
        imageData = offscreenCtx.createImageData(canvas.width, canvas.height)
    }else if(event.data.action == 'render'){
        rays = event.data.rays
        player = event.data.player
        sectors = event.data.sectors
        inside_sector = event.data.inside_sector
        renderFrame()
    }else if(event.data.action == 'paint'){
        paintFrame()
    }else if(event.data.action == 'textures'){
        textures[event.data.name] = {width: event.data.width, height: event.data.height, data: event.data.data}
    }else if(event.data.action == 'debug'){
        printed = false
    }
}

let fps = 0
function fpsMeter() {
    let prevTime = Date.now()
    let frames = 0
    requestAnimationFrame(function loop() {
        const time = Date.now()
        frames++
        if (time > prevTime + 1000) {
            fps = Math.round( ( frames * 1000 ) / ( time - prevTime ) )
            prevTime = time
            frames = 0
        }
        requestAnimationFrame(loop)
    })
  }
  
  fpsMeter();