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
light = false
multiplayer = false
inside_sector = []
patterns = {}
canPlay = false

cam = {
    fps: 30,
    fov: 31,
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
    document.getElementById('stats').innerHTML += '<span id="worker-'+i+'"></span>'
    renderCanvas.style.backgroundColor = 'red'
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
        fps = e.data.fps
        document.getElementById('worker-'+this.index).innerHTML = 'fps-'+this.index+': '+fps
    }
    worker.onerror = function(e){
        error = true
        throw new Error(e.message + " (" + e.filename + ":" + e.lineno + ")")
    }
}

console.log('lineWidth', lineWidth, 'rays.length', rays.length, 'rays.length*lineWidth', rays.length*lineWidth)

lights = [
    {x: 300, y: -700, z:90, z0: 120, z1:-20, rot:0, f0:0, f1:359, r: 0, g: 0, b: 0, intensity: 1, dist:200},
    {x: 500, y: 1100, z:50, z0: 60, z1:0, rot:90, f0:-35, f1:35, r: 0, g: 0, b: 0, intensity: 1, dist:400},
    {x: 500, y: 1100, z:50, z0: 60, z1:0, rot:90, f0:-35, f1:35, r: 0, g: 0, b: 0, intensity: 1, dist:400}
]

for(let[index, sector] of sectors.entries()){
    sector.id = index
    sector.points = sector.points.map(e=>[e[0], e[1], e[2], 0.8])
    sector.ceil_light = 0.8
    sector.floor_light = 0.8
    let center = calculatePolygonCentroid(sector.points)
    sector.x = center.x
    sector.y = center.y
    sector.z = sector.z0 + (sector.z1-sector.z0)/2
    sector.original = JSON.parse(JSON.stringify(sector))
    sector.lights = []
    for(let light of lights){
        sector.lights.push([])
    }
}
sectors.sort((a, b) => a.z0 - b.z0)
original_sectors = JSON.parse(JSON.stringify(sectors))

for(let light of lights){
    light.rays = []
    for(let i = light.f0; i < light.f1; i+=1){
        light.rays.push({i: i, deg:+i.toFixed(2), coll: [], cos:+Math.cos((i)/180*Math.PI).toFixed(4), sin:+Math.sin((i)/180*Math.PI).toFixed(4)})
    }
}
worker_light = new Worker('worker_light.js')
worker_light.postMessage({type:'init', sectors:sectors, lights:lights})
worker_light.onmessage = function(e){
    sectors = e.data.sectors
}

function renderFrame(elapsedTime){
    if(error) return
    editorCtx.fillStyle = "lightgrey"
    editorCtx.fillRect((editorCanvas.width/2)-(editorCanvas.width/2)/editor.zoom, (editorCanvas.height/2)-(editorCanvas.height/2)/editor.zoom, editorCanvas.width/editor.zoom, editorCanvas.height/editor.zoom)

    editorCtx.restore()

    editorCtx.save()
    editorCtx.translate(-player.posx+editorCanvas.width/2, -player.posy+editorCanvas.height/2)
    for(var sector of sectors){
        //if(sector.z1-player.height > player.jump) continue
        let points = sector.points
        editorCtx.fillStyle = '#ff0';
        editorCtx.strokeStyle = 'black'
        editorCtx.globalAlpha = (1+Math.tanh((player.jump+player.height-sector.z1)/20))/2
        editorCtx.lineWidth = 1
        editorCtx.beginPath()
        for(let path of points){
            editorCtx.lineTo(path[0], path[1])
            editorCtx.fillRect(path[0]-2, path[1]-2, 4, 4)
        }
        editorCtx.closePath()
        editorCtx.fillStyle = patterns[sector.floor_color]
        editorCtx.fill()
        editorCtx.stroke()
        for(let path of points){
            editorCtx.fillStyle = 'red';
            editorCtx.fillRect(path[0]-2, path[1]-2, 4, 4)
        }
        //if(!sector.static) editorCtx.fill()
    }
    editorCtx.globalAlpha = 1
    for(let light of lights){
        editorCtx.fillStyle = 'rgba(255, 255, 255, 1)'
        editorCtx.beginPath()
        editorCtx.arc(light.x, light.y, 20, 0, 2 * Math.PI)
        editorCtx.fill()
    }
    editorCtx.restore()

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

    inside_sector = []
    for(let[index, sector] of sectors.entries()){
        if(sector.animate) window[sector.animate](sector, elapsedTime)
        if(pointInSector(player.posx, player.posy, sector)) inside_sector[sector.id] = sector
        if(sector.type=='sprite'){
            sprite_width = sector.original.points[1][0] - sector.original.points[0][0]
            sprite_posx = sector.original.points[0][0] + sector.posx + sprite_width/2
            sprite_posy = sector.original.points[0][1] + sector.posy
            //console.log(sprite_posx , sprite_posy)
            rot_x0 = (sprite_width/2)*Math.cos((-player.rot-90)/180*Math.PI) + sprite_posx 
            rot_y0 = (sprite_width/2)*Math.sin((-player.rot-90)/180*Math.PI) + sprite_posy
            rot_x1 = (-sprite_width/2)*Math.cos((-player.rot-90)/180*Math.PI) + sprite_posx 
            rot_y1 = (-sprite_width/2)*Math.sin((-player.rot-90)/180*Math.PI) + sprite_posy
            sector.points[0][0] = rot_x0
            sector.points[0][1] = rot_y0
            sector.points[1][0] = rot_x1
            sector.points[1][1] = rot_y1
            sector.z0 = sector.height +10 + sector.posz
            sector.z1 = sector.original.z1 + sector.posz
        }
        if(sector.posx && sector.posy){
            //sector.points.forEach((e,i)=>{e[0]=sector.original_points[i][0]+sector.posx; e[1]=sector.original_points[i][1]+sector.posy})
        }
    }
    
    if(finished.every(x => x==true)){
        for(let i = 0; i < threads; i++){
            finished[i] = false
            workers[i].postMessage({action:'render', rays: rayThreads[i], player: player, sectors: sectors, inside_sector:inside_sector})
        }
    }

    if(light) worker_light.postMessage({type:'calc', sectors:sectors, lights:lights})
}

elapsedTime = 0
previousTime = 0
frameTime = 0
v0 = 0.3
v1 = 0.6
vel = v0
to_jump=false
to_fly=true
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
next_floor = null 
next_ceil = null
gameTime = 0
actionTime = 0
function frame(time) {
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
    player.x1 = Math.round(player.posx+cam.visibility*Math.cos((player.rot)*Math.PI/180))
    player.y1 = Math.round(player.posy-cam.visibility*Math.sin((player.rot)*Math.PI/180))
    player.coll = []
    for(var sector of sectors){
    let points = sector.points
        for(let i=0 ; i<points.length ; i++){
            j = (i+1)%points.length
            sx1 = points[i][0]
            sy1 = points[i][1]
            sx2 = points[j][0]
            sy2 = points[j][1]
            let temp_int = findIntersection(player.posx, player.posy, player.x1, player.y1, sx1, sy1, sx2, sy2)
            let player_dist = distanceAnglePointSegment(sx1, sy1, sx2, sy2, new_posx, new_posy)
            p_colls.push({dist:player_dist.dist, angle:player_dist.angle, sector})
            if(temp_int){
                let temp_dist = calcDistance(player.posx, player.posy, temp_int.intersectX, temp_int.intersectY)
                player.coll.push({int:temp_int, dist:temp_dist, sector})
            }
        }
    }
    player.coll.sort((a, b) => a.dist - b.dist)
    p_colls.sort((a, b) => { return a.dist - b.dist })
    p_coll = p_colls.find(e=>e.dist<10 && player.height-10+player.jump<=e.sector.z0 && player.height+player.jump>=e.sector.z1)
    if(collisions && p_coll){
        //console.log(p_coll.dist, player.posx, vel*elapsedTime*Math.cos(p_coll.angle/180*Math.PI))
        new_posx = player.posx //+ Math.sign(new_posx-player.posx)*vel*elapsedTime*Math.round(Math.abs(Math.sin(p_coll.angle/180*Math.PI))*100)/100
        new_posy = player.posy //+ Math.sign(new_posy-player.posy)*vel*elapsedTime*Math.round(Math.abs(Math.cos(p_coll.angle/180*Math.PI))*100)/100
    }
    player.posx = Math.floor(new_posx)
    player.posy = Math.floor(new_posy)
    //sync('player', {action:'player', player:player})
    lights[1].x = player.posx
    lights[1].y = player.posy
    lights[1].rot = player.rot
    lights[1].z0 = player.height+10+player.jump+40
    lights[1].z1 = player.jump-20
    lights[1].z = player.height+player.jump

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
        if(time-actionTime > 500){
            elem = player.coll.find(e=>e.dist<200 && player.height-10+player.jump<=e.sector.z0 && player.height+player.jump>=e.sector.z1)
            if(elem){
                console.log(elem.sector.name)
                if(elem.sector.action){
                    window[elem.sector.action](elem.sector)
                    sync('player', {action:'action', sector:elem.sector})
                }
            }
            actionTime = time
        }
    }
    if(keys[' ']){
        if(time-actionTime > 500){
            audio.load('sounds/gun.mp3')
            elem = player.coll[0]
            if(elem.dist<1000 && player.height-10+player.jump<=elem.sector.z0 && player.height+player.jump>=elem.sector.z1){
                console.log(elem.sector.name)
                if(elem.sector.hit){
                    window[elem.sector.hit](elem.sector)
                    sync('player', {action:'hit', sector:elem.sector})
                }
            }
            actionTime = time
        }
    }
    if(keys['x']){
        if(!to_jump || to_fly){
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
    if(to_jump && !to_fly){
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
    if(collisions && next_floor && new_jump < player.jump && new_jump<next_floor.z0){ // colisión suelo
        new_jump = Math.floor(next_floor.z0)
        if(to_jump){
            to_jump = false
            jump_time = 0
            jump0 = 0
            f = f0
        }
    }
    if(collisions && next_ceil && new_height+new_jump > player.height+player.jump && new_height+new_jump>next_ceil.z1-10){ // colisión techo
        new_height = player.height
        if(new_jump > player.jump){
            new_jump = Math.floor(next_ceil.z1-10-player.height)
            if(to_jump){
                jump_time = 0
                jump0 = new_jump 
                f = f0
            }
        }
    }
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
        //new_jump = Math.floor(next_floor.z0)
    }
    else if(!to_jump && !to_fly && collisions && !next_floor){ //caída al infinito
        to_jump = true
        jump_time = 0
        jump0 = player.jump
        f = f0
    }
    
    player.jump = Math.floor(new_jump)
    player.height = Math.floor(new_height)

    localStorage.setItem("player", JSON.stringify(player))
    //if (time > frameTime + (1000/cam.fps)) {
    //    renderFrame()
    //    frameTime = time
    //}
    renderFrame(elapsedTime)
    requestAnimationFrame(frame)

    if(canPlay){
        audio.setPlayer(player)
        for(let sound of sounds){
            if(!sound.playing){
                sound.source = audio.load(sound.src, sound.x, sound.y, sound.z, sound.dist, sound.loop)
                sound.playing = true
            }
        }
    }
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

window.addEventListener("focus", (event) => {
    console.log('audio enabled')
    audio = new Audio()
    canPlay = true
})

function pointInSector(posx, posy, sector) {
    let inside = false;
    let vertices = sector.points
    let radius = 1
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        let [xi, yi] = vertices[i]
        let [xj, yj] = vertices[j]

        let inters = (
            (((yi > posy-radius) != (yj > posy-radius)) && (posx-radius < (xj - xi) * (posy-radius - yi) / (yj - yi) + xi))
            //|| (((yi > posy-radius) != (yj > posy-radius)) && (posx+radius < (xj - xi) * (posy-radius - yi) / (yj - yi) + xi))
            //|| (((yi > posy+radius) != (yj > posy+radius)) && (posx-radius < (xj - xi) * (posy+radius - yi) / (yj - yi) + xi))
            //|| (((yi > posy+radius) != (yj > posy+radius)) && (posx+radius < (xj - xi) * (posy+radius - yi) / (yj - yi) + xi))
            )
        if (inters) inside = !inside
    }

    return inside
}

function distanceAnglePointSegment(x1, y1, x2, y2, x0, y0) {
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

    // Calcular el ángulo en radianes desde el eje x positivo hasta el vector (dx, dy)
    const angleRadians = Math.atan2(dy, dx);
    const angleDegrees = angleRadians * 180 / Math.PI; // Convertir a grados

    return  {dist: Math.sqrt(dx * dx + dy * dy), angle: angleDegrees}
}

function findIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

    // Asegurarse de que las líneas no son paralelas
    if (denominator == 0) return null

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

    // Si t y u están entre 0 y 1, las líneas se intersectan en este segmento
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        const intersectX = Math.round((x1 + t * (x2 - x1))*100)/100
        const intersectY = Math.round((y1 + t * (y2 - y1))*100)/100
        return { intersectX, intersectY };
    }

    // Si t o u no están en el rango de 0 a 1, entonces no hay una intersección en los segmentos de línea dados
    return null;
}

function calcDistance(x1, y1, x2, y2){
    let x = (x2-x1)
    let y = (y2-y1)
    return Math.round(Math.sqrt(x**2+y**2)*100)/100
}

function calculatePolygonCentroid(vertices) {
    const n = vertices.length;
    if (n === 1) {
        // Si hay solo un punto, el centroide es el mismo punto
        return { x: vertices[0][0], y: vertices[0][1] };
    } else if (n === 2) {
        // Si hay dos puntos, el centroide es el punto medio del segmento
        return {
            x: (vertices[0][0] + vertices[1][0]) / 2,
            y: (vertices[0][1] + vertices[1][1]) / 2
        };
    } else {
        // Cálculo para polígonos de tres o más vértices
        let cx = 0, cy = 0, A = 0;
        
        for (let i = 0; i < n; i++) {
            const x1 = vertices[i][0];
            const y1 = vertices[i][1];
            const x2 = vertices[(i + 1) % n][0];
            const y2 = vertices[(i + 1) % n][1];
            
            const a = x1 * y2 - x2 * y1;
            cx += (x1 + x2) * a;
            cy += (y1 + y2) * a;
            A += a;
        }

        A *= 0.5; // Actual area is half the computed 'A'
        if (A === 0) return null; // Degenerate polygon or error

        const factor = 1 / (6 * A);
        cx *= factor;
        cy *= factor;

        return { x: cx, y: cy };
    }
}

// 09/04/23 : mejorado el h-sync