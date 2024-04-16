printed = false
animating = false
textures = {}
rays = []

frameTime = 0
function frame(time){
    if (time > frameTime + (1000/cam.fps)) {
        renderFrame()
        frameTime = time
    }
    requestAnimationFrame(frame)
}

function renderFrame(){
    for(let ray of rays){ //hacer operaciones aquí no quita muchos frames
        rot_ray_cos = Math.cos((player.rot-ray.deg)*Math.PI/180)
        rot_ray_sin = Math.sin((player.rot-ray.deg)*Math.PI/180)
        ray.coll = []
        for(let[index, sector] of sectors.entries()){
            if(inside_sector[sector.id]){
                ray.coll.push({id:sector.name, dist: 10, int: {}, texture: null, sector, face:null, sprite:null}) //fix missing spline fov
            }
            let points = sector.points
            for(let i=0 ; i<points.length ; i++){
                j = (i+1)%points.length
                let temp_int = findIntersection(player.posx, player.posy, player.posx+cam.visibility*rot_ray_cos, player.posy-cam.visibility*rot_ray_sin, 
                points[i][0], points[i][1], points[j][0], points[j][1])
                if(temp_int){
                    temp_dist = calcDistance(player.posx, player.posy, temp_int.intersectX, temp_int.intersectY)
                    face_dist = calcDistance(points[i][0], points[i][1], temp_int.intersectX, temp_int.intersectY)
                    //real_dist = Math.sqrt(temp_dist**2 + (player.jump-sector.z0)**2)
                    ray.coll.push({id:i, dist: temp_dist, int: temp_int, texture: points[i][2],sector: sector, face:face_dist, sprite:null})
                }
            }
        }

        ray.coll.sort((a, b) => {
            return +(a.dist - b.dist).toFixed(2)
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
                    coll.next_dist = cam.visibility
                    coll.prev_dist = coll.dist
                }
            }
        }
        ray.coll = ray.coll.filter(x => !x.out)
        ray.coll.sort((a, b) => {
            //if(cam.height+player.jump < a.sector.z0 && cam.height+player.jump < b.sector.z0) return b.sector.z1 - a.sector.z1
            //if(cam.height+player.jump > a.sector.z1 && cam.height+player.jump > b.sector.z1) return a.sector.z0 - b.sector.z0
        })
        ray.coll.sort((a, b) => {
            //if(cam.height+player.jump > a.sector.z1 && a.sector.z1 >= b.sector.z0) return -1
            //if(cam.height+player.jump > b.sector.z1 && b.sector.z1 >= a.sector.z0) return 1

            //if(cam.height+player.jump < a.sector.z1 && a.sector.z1 >= b.sector.z0) return 1
            //if(cam.height+player.jump < b.sector.z1 && b.sector.z1 >= a.sector.z0) return -1

            //if(cam.height+player.jump > b.sector.z1 && b.sector.z1 >= a.sector.z0) return 1
            //if(cam.height+player.jump < b.sector.z1 && b.sector.z1 >= a.sector.z0) return -1

            //if(cam.height+player.jump < b.sector.z0 && b.sector.z0 <= a.sector.z1) return 1
            //if(cam.height+player.jump > b.sector.z0 && b.sector.z0 <= a.sector.z1) return -1

            ret = null
            pam = ''
            if(b.sector.z0 > a.sector.z0 && b.sector.z1 > a.sector.z1 && cam.height+player.jump > b.sector.z1){
                pam = 'b>a : p>b'
                ret = 1
            }
            else if(b.sector.z0 > a.sector.z0 && b.sector.z1 > a.sector.z1 && cam.height+player.jump < a.sector.z0){
                pam = 'b>a : p<a'
                ret = -1
            }
            else if(b.sector.z0 > a.sector.z0 && b.sector.z1 > a.sector.z1){
                pam = 'pll'
                ret = +((b.sector.z0) - (a.sector.z0)).toFixed(2)
            }
            //
            else if(a.sector.z0 > b.sector.z0 && a.sector.z1 > b.sector.z1 && cam.height+player.jump > a.sector.z1){
                pam = 'a>b : p>a'
                ret = -1
            }
            else if(a.sector.z0 > b.sector.z0 && a.sector.z1 > b.sector.z1 && cam.height+player.jump < b.sector.z0){
                pam = 'a>b : p<b'
                ret = 1
            }
            else if(a.sector.z0 > b.sector.z0 && a.sector.z1 > b.sector.z1){
                pam = 'pll'
                ret = +((b.sector.z0) - (a.sector.z0)).toFixed(2)
            }
            else{
                pam = 'else'
                ret = +((a.dist) - (b.dist)).toFixed(2)
            }
            if(ray.i==debug_ray && !printed) console.log(a.sector.name, b.sector.name, pam, ret>0?'b':(ret==0?'n/a':'a'))
            return ret
        })
    }

    buf = new ArrayBuffer(imageData.data.length)
    buf8 = new Uint8ClampedArray(buf)
    data = new Uint32Array(buf)

    for([index, ray] of rays.entries()){
        zcounter = 0

        ray_cos = ray.cos
        ray_sin = ray.sin
        ray_rot_cos = Math.cos((ray.deg-player.rot)*Math.PI/180)
        ray_rot_sin = Math.sin((ray.deg-player.rot)*Math.PI/180)
        x0 = Math.floor(index*lineWidth)
        x1 = Math.floor(Math.min(x0+lineWidth, game.width))

        for(let coll of ray.coll){
            if(coll.sector.z0 < cam.height+player.jump && coll.sector.z1 < cam.height+player.jump) draw_plane(coll, true)
            if(coll.sector.z1 > cam.height+player.jump && coll.sector.z0 > cam.height+player.jump) draw_plane(coll, false)
            drawWall(coll)
        }
        if(ray.i==debug_ray) printed = true
    }

    drawSky()

    imageData.data.set(buf8)
    renderCtx.putImageData(imageData, 0, 0)
}

function drawWall(coll){
    top_px = ((coll.sector.z0-cam.height-player.jump)/(coll.dist*ray_cos))*cam.plane_dist
    bot_px = ((coll.sector.z1-cam.height-player.jump)/(coll.dist*ray_cos))*cam.plane_dist
    y0 = Math.floor(Math.max(((game.height/2)-(top_px)+player.head), 0))
    y1 = Math.floor(Math.min(((game.height/2)-(bot_px)+player.head), game.height))
    
    image_y0 = Math.floor((game.height/2)-(top_px)+player.head+coll.sector.texture_y0)
    image_x = Math.floor(coll.face*coll.sector.texture_w+coll.sector.texture_x0)
    b = coll.sector.texture_h/(top_px-bot_px)

    for(let y=y0; y<y1; y++){
        a = y*game.t_width
        if(data[a+x0]) continue
        zcounter++
        if((y-y0)%lineWidth==0){
            obscuredImage = obscure(getPixel(image_x, Math.floor(((y-image_y0)*b)), coll.texture), coll.dist)
        }
        for(let x = x0; x < x1; x++){ //esto es más rapido que el fill
            if(obscuredImage[3] != 0){
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
    }else{
        z = coll.sector.z1
        texture = coll.sector.ceil_color
        scale = coll.sector.ceil_scale
    }
    top_px = ((z-cam.height-player.jump)/(coll.prev_dist*ray_cos))*cam.plane_dist
    bot_px = ((z-cam.height-player.jump)/(coll.next_dist*ray_cos))*cam.plane_dist
    ceil_height = z-cam.height
    if(top_px<bot_px) [top_px, bot_px] = [bot_px, top_px]

    y0 = Math.floor(Math.max(((game.height/2)-(top_px)+player.head), 0))
    y1 = Math.floor(Math.min(((game.height/2)-(bot_px)+player.head), game.height))
    cons_1 = ((ceil_height+cam.height-cam.height-player.jump)*cam.plane_dist)
    for(let y=y0; y<y1; y++){
        
        a = y*game.t_width
        if(data[a+x0]) continue
        zcounter++
        d = Math.abs((cons_1/(y-game.height/2-player.head))/ray_cos)
        image_x = Math.floor(player.posx + ray_rot_cos*d)*scale
        image_y = Math.floor(player.posy + ray_rot_sin*d)*scale
        obscuredImage = obscure(getPixel(image_x, image_y, texture), d)
        for(let x = x0; x < x1; x++){ //esto es más rapido que el fill
            if(obscuredImage[3] != 0){
            data[a+x] = (obscuredImage[3] << 24) | (obscuredImage[2] << 16) | (obscuredImage[1] << 8) | obscuredImage[0]
            //data[a+x] = (255 << 24) | (255 << 16) | (0 << 8) | 0
            }
        }
    }
}

function drawSky(){
    for(y=Math.floor(game.height/2+player.head) ; y>0 ; y--){
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

function calcDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}

function obscure(rgba, distance){
    th = 2000
    if(distance>th){
        rr = rgba[0]/(1+(distance-th)/1000)
        gg = rgba[1]/(1+(distance-th)/1000)
        bb = rgba[2]/(1+(distance-th)/1000)
        aa = Math.max(255*(1-((distance-th)/(2000-th))), 0)
    }else{
        rr = rgba[0]
        gg = rgba[1]
        bb = rgba[2]
        aa = rgba[3]
    }
    return [rr, gg, bb, aa]
}

function getPixel(x, y, texture_src) {
    let texture = textures[texture_src]
    if(! isFinite(x) || ! isFinite(y) || typeof texture == 'undefined') return [255, 255, 255, 0]
    let x_mod = x % texture.width
    let y_mod = y % texture.height
    // Calcula el índice del píxel en el array de datos
    let index = ((((x_mod + y_mod * texture.width)) % texture.data.length)+texture.data.length)%texture.data.length
    
    return texture.data[index] //r//g//b//a
}

onmessage = function (event) {
    if(event.data.action == 'init'){
        cam = event.data.cam
        game = event.data.game
        debug_ray = 200
        lineWidth = game.width/cam.num_rays
        canvas = event.data.renderCanvas
        renderCtx = canvas.getContext('2d', { willReadFrequently: true })
        //renderCtx.canvas.width = canvas.width
        //renderCtx.canvas.height = canvas.height
        offscreen = new OffscreenCanvas(canvas.width, canvas.height) //revisar si esto mejora algo
        offscreenCtx = offscreen.getContext('2d', { willReadFrequently: true })
        imageData = offscreenCtx.createImageData(canvas.width, canvas.height)
        requestAnimationFrame(frame)
    }else if(event.data.action == 'render'){
        rays = event.data.rays
        player = event.data.player
        sectors = event.data.sectors
        inside_sector = event.data.inside_sector
    }else if(event.data.action == 'textures'){
        textures[event.data.name] = {width: event.data.width, height: event.data.height, data: event.data.data}
    }else if(event.data.action == 'debug'){
        printed = false
    }
}