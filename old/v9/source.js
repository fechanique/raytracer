editorCanvas = document.getElementById('editor')
zdepthCanvas = document.getElementById('zdepth')

editorCtx = editorCanvas.getContext('2d')
editorCtx.canvas.width = 640
editorCtx.canvas.height = 480

player = JSON.parse(localStorage.getItem("player"))
if(!player) player = {posx: 100, posy: 100, rot: 0, head: 0, jump: 0}

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

cam = {
    fps: 60,
    fov: 31,
    height: 50,
    plane_dist: 500,
    num_rays: game.width/1,
    visibility: 2000
}

lineWidth = game.width/cam.num_rays

rays = []
index = 0
for(let i = -cam.fov; i <= cam.fov; i=i+((cam.fov*2/(cam.num_rays)))){
    rays.push({i: index++, deg:+i.toFixed(2), coll: [], cos:+Math.cos((i)/180*Math.PI).toFixed(4), sin:+Math.sin((i)/180*Math.PI).toFixed(4)})
}

threads = 4 
rayThreads = []
workers = []
error = false
for(let i = 0; i < threads; i++){
    renderCanvas = document.createElement('canvas')
    document.getElementById('render').appendChild(renderCanvas)
    renderCanvas = renderCanvas.transferControlToOffscreen()
    renderCanvas.width = game.width/threads
    renderCanvas.height = game.height
    game.t_width = game.width/threads
    rayThreads.push(rays.slice(i*(rays.length/threads), (i+1)*(rays.length/threads)))
    worker = new Worker('worker.js')
    worker.postMessage({action:'init', cam: cam, game: game, renderCanvas:renderCanvas}, [renderCanvas])
    workers.push(worker)
    worker.onmessage = function(e){
        //processRays(e.data)
    }
    worker.onerror = function(e){
        error = true
        throw new Error(e.message + " (" + e.filename + ":" + e.lineno + ")")
    }
}

console.log('lineWidth', lineWidth, 'rays.length', rays.length, 'rays.length*lineWidth', rays.length*lineWidth)

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
        sector.id = index
        if(pointInSector(player.posx, player.posy, sector)) inside_sector[sector.id] = sector
    }

    for(let i = 0; i < threads; i++){
        workers[i].postMessage({action:'render', rays: rayThreads[i], player: player, sectors: sectors, 
            inside_sector:inside_sector})
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
keys = {}
new_posx = player.posx
new_posy = player.posy
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
    p_colls.sort((a, b) => { return a.dist - b.dist })//falta detectar colisiones a varias altuas/sectores
    if(collisions && p_colls[0].dist<5){
        if(p_colls[0].sector.static){
            new_posx = Math.floor(player.posx)
            new_posy = Math.floor(player.posy)
        }else{
            if(cam.height+player.jump<p_colls[0].sector.z0 && cam.height+player.jump>p_colls[0].sector.z1){
                new_posx = Math.floor(player.posx)
                new_posy = Math.floor(player.posy)
            }else{
                //jump = p_colls[0].sector.fh+50
                player.posx = Math.floor(new_posx)
                player.posy = Math.floor(new_posy)
            }
        }
    }else{
        player.posx = Math.floor(new_posx)
        player.posy = Math.floor(new_posy)
    }

    if(keys['arrowleft']){
        player.rot += Math.floor(vel/2*elapsedTime)
    }
    if(keys['arrowright']){
        player.rot -= Math.floor(vel/2*elapsedTime)
    }
    if(keys['z']){
        player.head += Math.floor(2*vel*elapsedTime)
    }
    if(keys['c']){
        player.head -= Math.floor(2*vel*elapsedTime)
    }
    if(keys['w']){
        player.jump += Math.floor(vel*elapsedTime)
    }
    if(keys['s']){
        player.jump -= Math.floor(vel*elapsedTime)
    }
    if(keys['r']){
        player.jump = 0
        player.head = 0
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
            jump0 = player.jump
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
        player.jump = Math.floor(jump0 +  50*(jump_time) - (0.5 * 80 * jump_time * jump_time))
        if(player.jump<0){
            to_jump = false
            jump_time = 0
            player.jump = 0
            jump0 = 0
        }
    }

    localStorage.setItem("player", JSON.stringify(player))
    if (time > frameTime + (1000/cam.fps)) {
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