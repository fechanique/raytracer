editorCanvas = document.getElementById('editor')
zdepthCanvas = document.getElementById('zdepth')

editorCtx = editorCanvas.getContext('2d')
editorCtx.canvas.width = 640
editorCtx.canvas.height = 480

player = JSON.parse(localStorage.getItem("player"))
if(!player) player = {posx: 100, posy: 100, rot: 0, head: 0, jump: 0, height:50}

editor = { 
    zoom: 0.5
}
editorCtx.translate((1-editor.zoom)*editorCanvas.width/2, (1-editor.zoom)*editorCanvas.height/2)
editorCtx.scale(editor.zoom, editor.zoom)

game = {
    width: 640,
    height: 480,
}

collisions = true
inside_sector = []

cam = {
    fps: 30,
    fov: 31,
    plane_dist: 500,
    num_rays: game.width/2,
    visibility: 2000
}

lineWidth = game.width/cam.num_rays

rays = []
index = 0
for(let i = -cam.fov; i <= cam.fov; i=i+((cam.fov*2/(cam.num_rays)))){
    rays.push({i: index++, deg:+i.toFixed(2), coll: [], cos:+Math.cos((i)/180*Math.PI).toFixed(4), sin:+Math.sin((i)/180*Math.PI).toFixed(4)})
}

threads = 1
rayThreads = []
workers = []
finished = []
error = false
for(let i = 0; i < threads; i++){
    finished[i] = true
    renderCanvas = document.createElement('canvas')
    renderCanvas.id = i
    document.getElementById('render').appendChild(renderCanvas)
    renderCanvas = renderCanvas.transferControlToOffscreen()
    renderCanvas.width = game.width/threads
    renderCanvas.height = game.height
    game.t_width = game.width/threads
    rayThreads.push(rays.slice(i*(rays.length/threads), (i+1)*(rays.length/threads)))
    worker = new Worker('worker.js')
    worker.index = i
    worker.postMessage({action:'init', cam: cam, game: game, renderCanvas:renderCanvas}, [renderCanvas])
    workers.push(worker)
    worker.onmessage = function(e){
        //processRays(e.data)
        finished[this.index] = true
        if(finished.every(x => x==true)){
            for(let i = 0; i < threads; i++){
                workers[i].postMessage({action:'paint'})
            }
        }
    }
    worker.onerror = function(e){
        error = true
        throw new Error(e.message + " (" + e.filename + ":" + e.lineno + ")")
    }
}

console.log('lineWidth', lineWidth, 'rays.length', rays.length, 'rays.length*lineWidth', rays.length*lineWidth)

for(let[index, sector] of sectors.entries()){
    sector.id = index
    if(sector.type=='sprite'){
        sector.original_points = JSON.parse(JSON.stringify(sector.points))
    }
}

function renderFrame(){
    if(error) return
    editorCtx.fillStyle = "lightgrey"
    editorCtx.fillRect((editorCanvas.width/2)-(editorCanvas.width/2)/editor.zoom, (editorCanvas.height/2)-(editorCanvas.height/2)/editor.zoom, editorCanvas.width/editor.zoom, editorCanvas.height/editor.zoom)

    editorCtx.save()
    editorCtx.translate(editorCanvas.width/2, editorCanvas.height/2)
    editorCtx.rotate(-player.rot/180*Math.PI)
    editorCtx.lineWidth = 3
    editorCtx.beginPath()
    editorCtx.moveTo(0, -10)
    editorCtx.lineTo(0, 10)
    editorCtx.stroke()
    editorCtx.beginPath()
    editorCtx.moveTo(0, 0)
    editorCtx.lineTo(10, 0)
    editorCtx.stroke()

    editorCtx.restore()

    editorCtx.save()
    editorCtx.translate(-player.posx+editorCanvas.width/2, -player.posy+editorCanvas.height/2)
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
    editorCtx.restore()

    inside_sector = []
    for(let[index, sector] of sectors.entries()){
        if(pointInSector(player.posx, player.posy, sector)) inside_sector[sector.id] = sector
        if(sector.type=='sprite'){
            sprite_width = sector.original_points[1][0] - sector.original_points[0][0]
            sprite_posx = sector.original_points[0][0] + sprite_width/2
            sprite_posy = sector.original_points[0][1]
            //console.log(sprite_posx , sprite_posy)
            rot_x0 = (sprite_width/2)*Math.cos((-player.rot-90)/180*Math.PI) + sprite_posx 
            rot_y0 = (sprite_width/2)*Math.sin((-player.rot-90)/180*Math.PI) + sprite_posy
            rot_x1 = (-sprite_width/2)*Math.cos((-player.rot-90)/180*Math.PI) + sprite_posx 
            rot_y1 = (-sprite_width/2)*Math.sin((-player.rot-90)/180*Math.PI) + sprite_posy
            sector.points[0][0] = rot_x0
            sector.points[0][1] = rot_y0
            sector.points[1][0] = rot_x1
            sector.points[1][1] = rot_y1
        }
    }

    if(finished.every(x => x==true)){
        for(let i = 0; i < threads; i++){
            finished[i] = false
            workers[i].postMessage({action:'render', rays: rayThreads[i], player: player, sectors: sectors, inside_sector:inside_sector})
        }
    }
}

function processRays(imageData){
    //renderCtx.putImageData(imageData, 0, 0)
}

elapsedTime = 0
previousTime = 0
frameTime = 0
v0 = 0.3
v1 = 0.6
vel = v0
to_jump=false
to_fly=false
g = 300
f0 = 0
f1 = 200
f = f0
to_up = false
to_down = false
keys = {}
new_posx = player.posx
new_posy = player.posy
new_jump = player.jump
new_height = player.height
gameTime = 0
fpsLastTime = performance.now()
function frame(time) {
    fpsCurrentTime = performance.now()
    fps = Math.floor(1000/(fpsCurrentTime-fpsLastTime))
    fpsLastTime = fpsCurrentTime
    elapsedTime = (time - previousTime)
    gameTime += elapsedTime/1000
    gameTime = +(gameTime).toFixed(2)
    previousTime = time
    if(keys['arrowup']){
        new_posx += vel*elapsedTime*Math.cos(player.rot/180*Math.PI)
        new_posy -= vel*elapsedTime*Math.sin(player.rot/180*Math.PI)
    }
    if(keys['arrowdown']){
        new_posx -= vel*elapsedTime*Math.cos(player.rot/180*Math.PI)
        new_posy += vel*elapsedTime*Math.sin(player.rot/180*Math.PI)
    }
    if(keys['a']){
        new_posx -= vel*elapsedTime*Math.sin(player.rot/180*Math.PI)
        new_posy -= vel*elapsedTime*Math.cos(player.rot/180*Math.PI)
    }
    if(keys['d']){
        new_posx += vel*elapsedTime*Math.sin(player.rot/180*Math.PI)
        new_posy += vel*elapsedTime*Math.cos(player.rot/180*Math.PI)
    }

    p_colls = []
    //player distance to segments
    for(var sector of sectors){
    let points = sector.points
        for(let i=0 ; i<points.length ; i++){
            j = (i+1)%points.length
            let player_dist = distancePointSegment(points[i][0], points[i][1], points[j][0], points[j][1], new_posx, new_posy)
            p_colls.push({dist:player_dist, sector})
        }
    }
    p_colls.sort((a, b) => { return a.dist - b.dist })
    if(collisions && p_colls.find(e=>e.dist<5 && player.height-10+player.jump<=e.sector.z0 && player.height+player.jump>=e.sector.z1)){
        new_posx = Math.floor(player.posx)
        new_posy = Math.floor(player.posy)
    }
    player.posx = Math.floor(new_posx)
    player.posy = Math.floor(new_posy)

    if(keys['arrowleft']){
        player.rot += Math.floor(vel/2*elapsedTime)
        player.rot = player.rot%360
    }
    if(keys['arrowright']){
        player.rot -= Math.floor(vel/2*elapsedTime)
        player.rot = player.rot%360
    }
    if(keys['q']){
        player.head += Math.floor(2*vel*elapsedTime)
    }
    if(keys['z']){
        player.head -= Math.floor(2*vel*elapsedTime)
    }
    if(keys['w']){
        new_jump = player.jump + Math.floor(vel*elapsedTime)
        to_fly = true
    }
    if(keys['s']){
        new_jump = player.jump - Math.floor(vel*elapsedTime)
        to_fly = true
    }
    if(keys['r']){
        to_jump = false
        to_fly = false
        new_jump = next_floor? next_floor.z0 : 0
        player.jump = next_floor? next_floor.z0 : 0
        new_head = 0
        player.head = 0
    }
    if(keys['e']){
        //ray = rays[debug_ray]
        //elem = ray.coll.filter(x => (x.sector && typeof x.sector.action != 'undefined' && x.dist<200))[0]
        //if(elem) elem.sector.action(elem.sector)
    }
    if(keys['x']){
        if(!to_jump){
            f = f1
            if(to_fly) f = f0
            to_jump = true
            to_fly = false
            jump_time = 0
            jump0 = player.jump
        }
    }
    if(keys['c']){
        new_height -= vel*elapsedTime
        new_height = Math.max(new_height, 20)
    }else{
        new_height += vel*elapsedTime
        new_height = Math.min(new_height, 50)
    }

    if(keys['shift']){
        vel=v1
    }
    if(!keys['shift']){
        vel=v0
    }
    if(to_jump){
        jump_time += elapsedTime/1000
        new_jump = Math.floor(jump0 + f*(jump_time) - (0.5 * g * jump_time * jump_time))
    }
    if(to_up){
        new_jump += vel/2*elapsedTime
        if(new_jump >= next_floor.z0) to_up = false
    }
    if(to_down){
        new_jump -= vel/2*elapsedTime
        if(new_jump <= next_floor.z0) to_down = false
    }

    next_floor = inside_sector.filter(e=>player.height+player.jump>=e.z0).sort((a, b) => (player.height+player.jump-a.z0) - (player.height+player.jump-b.z0))[0]
    next_ceil = inside_sector.filter(e=>player.height+player.jump<=e.z1).sort((a, b) => (a.z1-player.height+player.jump) - (b.z1-player.height+player.jump))[0]
    if(collisions && next_floor && new_jump < player.jump && new_jump<next_floor.z0){
        new_jump = Math.floor(next_floor.z0)
        if(!to_fly){
            to_jump = false
            jump_time = 0
            jump0 = 0
            f = f0
        }
    }else if(collisions && next_ceil && new_height+new_jump > player.height+player.jump && new_height+new_jump>next_ceil.z1-2){
        new_jump = Math.floor(next_ceil.z1-2-player.height)
        new_height = player.height
        if(!to_fly){
            jump_time = 0
            jump0 = new_jump 
            f = f0
        }
    }else{
        if(!to_jump && !to_fly && collisions && next_floor && player.jump > next_floor.z0+50){ //caída libre
            to_jump = true
            jump_time = 0
            jump0 = player.jump
            f = f0
        }
        else if(!to_jump && !to_fly && collisions && next_floor && player.jump > next_floor.z0){ //bajar escalera
            to_down = true
        }
        else if(!to_jump && !to_fly && collisions && next_floor && player.jump < next_floor.z0){ //subir escalera
            to_up = true
        }
        else if(!to_jump && !to_fly && collisions && !next_floor){ //caída al infinito
            to_jump = true
            jump_time = 0
            jump0 = player.jump
            f = f0
        }
    }
    player.jump = Math.floor(new_jump)
    player.height = Math.floor(new_height)

    localStorage.setItem("player", JSON.stringify(player))
    //if (time > frameTime + (1000/cam.fps)) {
    //    renderFrame()
    //    frameTime = time
    //}
    renderFrame()
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
    return  Math.sqrt(dx * dx + dy * dy)
}

// 09/04/23 : mejorado el h-sync