collisions = true
light = false
inside_sector = []
patterns = {}
map = false
fullscreen = true
aspect = 4/3
threads = 2
game_width = 640
res = 2
content_width = '80%'

document.getElementById('content').style.width = content_width

if(map){
    editorCanvas = document.createElement('canvas')
    //zdepthCanvas = document.createElement('canvas')
    editorCanvas.id = 'editor'
    //zdepthCanvas.id = 'zdepth'
    document.getElementById('content').appendChild(editorCanvas)
    //document.body.appendChild(zdepthCanvas)

    editorCtx = editorCanvas.getContext('2d')
    editorCtx.canvas.width = 640
    editorCtx.canvas.height = 480

    editor = { zoom: 0.5 }
    editorCtx.translate((1-editor.zoom)*editorCanvas.width/2, (1-editor.zoom)*editorCanvas.height/2)
    editorCtx.scale(editor.zoom, editor.zoom)
}

let threadRender = document.createElement('div')
threadRender.id = 'threadRender'
document.getElementById('content').appendChild(threadRender)
let stats = document.createElement('div')
stats.id = 'stats'
threadRender.appendChild(stats)

player = JSON.parse(localStorage.getItem("player"))
if(!player) player = {posx: 300, posy: 300, rot: 0, head: 0, jump: 0, height:50, to_fly:false}
inventory = []
inventory_index = undefined

game = {
    width: game_width,
    height: Math.floor(game_width/aspect),
}

cam = {
    fps: 30,
    fov: 31,
    plane_dist: 500,
    num_rays: game.width/res,
    visibility: 2000
}

lineWidth = game.width/cam.num_rays

rays = []
index = 0
for(let i = -cam.fov; i <= cam.fov; i=i+((cam.fov*2/(cam.num_rays)))){
    rays.push({i: index++, deg:+i.toFixed(2), coll: [], cos:+Math.cos((i)/180*Math.PI).toFixed(4), sin:+Math.sin((i)/180*Math.PI).toFixed(4)})
}

console.log('width', game.width, 'height', game.height, 'lineWidth', lineWidth, 'rays.length', rays.length, 'rays.length*lineWidth', rays.length*lineWidth)

rayThreads = []
workers = []
finished = []
error = false
for(let i = 0; i < threads; i++){
    finished[i] = true
    threadCanvas = document.createElement('canvas')
    threadCanvas.id = i
    document.getElementById('stats').innerHTML += '<span id="worker-'+i+'"></span>'
    threadCanvas.style.backgroundColor = 'black'
    threadCanvas.style.width = 100/threads + '%'
    threadCanvas.width = game.width/threads
    threadCanvas.height = game.height
    document.getElementById('threadRender').appendChild(threadCanvas)
    threadCanvas = threadCanvas.transferControlToOffscreen()
    game.t_width = game.width/threads
    rayThreads.push(rays.slice(i*(rays.length/threads), (i+1)*(rays.length/threads)))
    worker = new Worker('worker.js')
    worker.index = i
    worker.postMessage({action:'init', cam: cam, game: game, renderCanvas:threadCanvas}, [threadCanvas])
    workers.push(worker)
    worker.onmessage = function(e){
        //processRays(e.data)
        finished[this.index] = true
        if(finished.every(x => x==true)){
            for(let i = 0; i < threads; i++){
                workers[i].postMessage({action:'paint'})
                //let threadCanvas = e.data.threadCanvas
                //renderCtx.drawImage(threadCanvas, 0, 0)
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

lights = [
    {x: 300, y: -700, z:90, z0: 120, z1:-20, rot:0, f0:0, f1:359, r: 0, g: 0, b: 0, intensity: 1, dist:200},
    {x: 500, y: 1100, z:50, z0: 60, z1:0, rot:90, f0:-35, f1:35, r: 0, g: 0, b: 0, intensity: 1, dist:1000},
    {x: 500, y: 1100, z:50, z0: 60, z1:0, rot:90, f0:-35, f1:35, r: 0, g: 0, b: 0, intensity: 1, dist:500}
]

for(let[index, sector] of sectors.entries()){
    prepareSector(index, sector)
}
function prepareSector(index, sector){
    sector.id = index
    sector.points = sector.points.map(e=>[e[0], e[1], e[2], light?0.05:1])
    sector.ceil_light = light?0.05:1
    sector.floor_light = light?0.05:1
    if(!sector.x){
        let center = calculatePolygonCentroid(sector.points)
        sector.x = center.x
        sector.y = center.y
        sector.z = sector.z0 + (sector.z1-sector.z0)/2
    }
    sector.r = 90
    //sector.original = JSON.parse(JSON.stringify(sector))
    sector.lights = []
    for(let light of lights){
        sector.lights.push([])
    }
    return sector
}

sectors.sort((a, b) => a.z0 - b.z0)

for(let light of lights){
    light.rays = []
    for(let i = light.f0; i < light.f1; i+=1){
        light.rays.push({i: i, deg:+i.toFixed(2), coll: [], cos:+Math.cos((i)/180*Math.PI).toFixed(4), sin:+Math.sin((i)/180*Math.PI).toFixed(4)})
    }
}
worker_light = new Worker('worker_light.js')
worker_light.postMessage({type:'init', sectors:sectors, lights:lights})
worker_light.onmessage = function(e){
    sectors.map((s,i)=>{s.lights = e.data.sectors[i].lights; s.floor_lights = e.data.sectors[i].floor_lights; s.ceil_lights = e.data.sectors[i].ceil_lights})
}

function renderFrame(elapsedTime){
    if(error) return
    if(map){
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
    }

    inside_sector = []
    for(let[index, sector] of sectors.entries()){
        if(sector.animate && typeof window[sector.animate] == 'function') window[sector.animate](sector, elapsedTime)
        if(pointInSector(player.posx, player.posy, sector)) inside_sector[sector.id] = sector
        if(sector.type=='sprite'){
            rotateSector(sector, sector.x, sector.y, sector.r-player.rot)
            sector.r = player.rot
        }
        if(sector.posx && sector.posy){
            //sector.points.forEach((e,i)=>{e[0]=sector.original_points[i][0]+sector.posx; e[1]=sector.original_points[i][1]+sector.posy})
        }
    }
    
    if(finished.every(x => x==true)){
        for(let i = 0; i < threads; i++){
            finished[i] = false
            workers[i].postMessage({action:'render', rays: rayThreads[i], player: player, sectors: sectors, inside_sector:inside_sector, skybox:skybox})
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
g = 300
f0 = 0
f1 = 200
f = f0
to_up = false
to_down = false
to_crouch = false
keys = {}
delta_x = 0
delta_y = 0
delta_head = 0
new_jump = player.jump
new_height = player.height
next_floor = null 
next_ceil = null
gameTime = 0
gameSin = 0
actionTime = 0
steepTime = 0
function frame(time) {
    elapsedTime = (time - previousTime)
    delta_v = vel*elapsedTime
    delta_head = 0
    gameTime += elapsedTime/1000
    gameTime = +(gameTime).toFixed(3)
    previousTime = time
    to_walk= false
    delta_x = 0
    delta_y = 0
    if(keys['arrowup']){
        delta_x = delta_v*Math.cos(player.rot/180*Math.PI)
        delta_y = -delta_v*Math.sin(player.rot/180*Math.PI)
        to_walk = true
    }
    if(keys['arrowdown']){
        delta_x = -delta_v*Math.cos(player.rot/180*Math.PI)
        delta_y = delta_v*Math.sin(player.rot/180*Math.PI)
        to_walk = true
    }
    if(keys['a']){
        delta_x = -delta_v*Math.sin(player.rot/180*Math.PI)
        delta_y = -delta_v*Math.cos(player.rot/180*Math.PI)
        to_walk = true
    }
    if(keys['d']){
        delta_x = delta_v*Math.sin(player.rot/180*Math.PI)
        delta_y = delta_v*Math.cos(player.rot/180*Math.PI)
        to_walk = true
    }

    p_colls = []
    //player distance to segments
    player.x1 = Math.round(player.posx+cam.visibility*Math.cos((player.rot)*Math.PI/180))
    player.y1 = Math.round(player.posy-cam.visibility*Math.sin((player.rot)*Math.PI/180))
    player_coll = []
    for(var sector of sectors){
    let points = sector.points
        for(let i=0 ; i<points.length ; i++){
            j = (i+1)%points.length
            sx1 = points[i][0]
            sy1 = points[i][1]
            sx2 = points[j][0]
            sy2 = points[j][1]
            let temp_int = findIntersection(player.posx+delta_x, player.posy+delta_y, player.x1, player.y1, sx1, sy1, sx2, sy2)
            let player_dist = distanceAnglePointSegment(sx1, sy1, sx2, sy2, player.posx+delta_x, player.posy+delta_y)
            let normal = calculateNormalAngle(sx1, sy1, sx2, sy2, player.posx+delta_x, player.posy+delta_y)
            p_colls.push({id:i, dist:player_dist.dist, angle:normal, world_angle:player_dist.angle, sector})
            if(temp_int){
                let temp_dist = calcDistance(player.posx+delta_x, player.posy+delta_y, temp_int.intersectX, temp_int.intersectY)
                player_coll.push({int:temp_int, dist:temp_dist, sector, id:i})
            }
        }
    }
    player_coll.sort((a, b) => a.dist - b.dist)
    p_colls.sort((a, b) => { return a.dist - b.dist })
    p_colls = p_colls.filter(e=>e.dist<20 && player.height-10+player.jump<=e.sector.z0 && player.height+player.jump>=e.sector.z1 && !e.sector.traspase)
    if(collisions && p_colls.length>0){
        //console.log('--------------------')
        let n_delta_x = delta_v
        let n_delta_y = delta_v
        p_coll = p_colls[0]
        let last_angle = p_coll.angle
        let last_world_angle = p_coll.world_angle
        //console.log(Math.round(player.rot*100)/100, Math.round(p_coll.angle*100)/100)
        px = Math.cos((player.rot)*Math.PI/180)
        py = Math.sin((player.rot)*Math.PI/180)
        nx = Math.cos((p_coll.angle)*Math.PI/180)
        ny = Math.sin((p_coll.angle)*Math.PI/180)
        sn = Math.sin((p_coll.angle-player.rot)*Math.PI/180)
        cn = Math.cos((p_coll.angle-player.rot)*Math.PI/180)
        //console.log('px', px, 'py', py, 'nx', nx, 'ny', ny)
        //console.log('sn', sn, 'cn', cn)
        //console.log(ny*sn, nx*sn)
        
        n_delta_x *= (ny*Math.sin((p_coll.angle-player.rot)*Math.PI/180))
        n_delta_y *= (nx*Math.sin((p_coll.angle-player.rot)*Math.PI/180))
        for(let p_coll2 of p_colls){ // se queda parado en las esuinas
            if(last_angle == p_coll2.angle) continue
            else{
                n_delta_x = 0
                n_delta_y = 0
                break
            }
        }
        //console.log(delta_x, delta_y)
        delta_x = delta_x!=0?n_delta_x:0
        delta_y = delta_y!=0?n_delta_y:0
    }else if(collisions && p_colls.length>1){
        n_delta_x = 0
        n_delta_y = 0
    }
    player.posx += delta_x
    player.posy += delta_y
    player.posx = Math.round(player.posx) // cuidado si no rendondeas falla el insideSector
    player.posy = Math.round(player.posy)

    steepTime += elapsedTime

    if(keys['arrowleft']){
        player.rot += vel/2*elapsedTime
        player.rot = Math.round(player.rot%360)
        //to_walk = true
    }
    if(keys['arrowright']){
        player.rot -= vel/2*elapsedTime
        player.rot = Math.round(player.rot%360)
        //to_walk = true
    }
    if(keys['q']){
        delta_head = Math.floor(2*vel*elapsedTime)
    }
    if(keys['z']){
        delta_head = -Math.floor(2*vel*elapsedTime)
    }
    if(keys['w']){
        new_jump = player.jump + Math.floor(vel*elapsedTime)
        player.to_fly = true
    }
    if(keys['s']){
        new_jump = player.jump - Math.floor(vel*elapsedTime)
        player.to_fly = true
    }
    if(keys['r']){
        to_jump = false
        player.to_fly = false
        new_jump = next_floor? next_floor.z0 : 0
        player.jump = next_floor? next_floor.z0 : 0
        new_head = 0
        player.head = 0
    }
    if(keys['e']){
        if(time-actionTime > 500){
            elem = player_coll.find(e=>e.dist<200 && player.height-10+player.jump<=e.sector.z0 && player.height+player.jump>=e.sector.z1 && e.sector.action)
            if(elem){
                console.log(elem.sector.name)
                if(typeof window[elem.sector.action] == 'function'){
                    window[elem.sector.action](elem.sector)
                    sync({action:'action', data:elem.sector})
                }else{
                    audio.load('sounds/click.mp3')
                }
            }else{
                audio.load('sounds/click.mp3')
            }
            actionTime = time
        }
    }
    if(keys[' ']){
        if(time-actionTime > 500){
            let equip_elem = sectors.filter(e=>e.equip==true)
            for(let elem of equip_elem){
                elem.z -= 1
                elem.x -= 1*Math.cos(player.rot*Math.PI/180)
                elem.y -= 1*Math.cos(player.rot*Math.PI/180)
                setTimeout(()=>{
                    elem.z += 1
                    elem.x += 1*Math.cos(player.rot*Math.PI/180)
                    elem.y += 1*Math.cos(player.rot*Math.PI/180)
                }, 100)
            }
            let inventory_elem = inventory[inventory_index] 
            if(inventory_elem && inventory_elem.group == 'pistola'){
                audio.load('sounds/gun.mp3')
                elem = player_coll.find(e=>e.dist<1000 && player.height-10+player.jump<=e.sector.z0 && player.height+player.jump>=e.sector.z1 && !e.sector.traspase)
                if(elem){
                    console.log('hit', elem.sector.name, elem.id)
                    if(elem.sector.hit){
                        window[elem.sector.hit](elem.sector, elem.id)
                        sync({action:'hit', data:elem.sector, id:elem.id})
                    }
                }
            }else if(inventory_elem){
                audio.load('sounds/use.mp3')
                elem = player_coll.find(e=>e.dist<100 && player.height-10+player.jump<=e.sector.z0 && player.height+player.jump>=e.sector.z1 && !e.sector.traspase)
                if(elem){
                    console.log('use', elem.sector.name, inventory_elem.group)
                    if(elem.sector.use){
                        window[elem.sector.use](elem.sector, inventory_elem.group)
                        sync({action:'use', data:elem.sector, inventory:inventory_elem.group})
                    }
                }
            }
            actionTime = time
        }
    }
    if(keys['x']){
        if(!to_jump || player.to_fly){
            audio.load('sounds/jump.mp3')
            f = f1
            if(player.to_fly) f = f0
            to_jump = true
            player.to_fly = false
            jump_time = 0
            jump0 = player.jump
        }
    }
    if(keys['c']){
        if(!to_crouch){
            //audio.load('sounds/crouch.mp3')
            to_crouch = true
        }
        new_height -= vel*elapsedTime
        new_height = Math.max(new_height, 20)
    }else{
        if(to_crouch){
            //audio.load('sounds/crouch.mp3')
            to_crouch = false
        }
        new_height += vel*elapsedTime
        new_height = Math.min(new_height, 50)
    }

    if(keys['shift']){
        vel=v1
    }
    if(!keys['shift']){
        vel=v0
    }
    if(to_jump && !player.to_fly){
        jump_time += elapsedTime/1000
        new_jump = Math.floor(jump0 + f*(jump_time) - (0.5 * g * jump_time * jump_time))
    }
    if(to_up){
        new_jump += vel/4*elapsedTime
        if(next_floor && new_jump >= next_floor.z0){
            console.log('up')
            new_jump = next_floor.z0
            to_up = false
            audio.load('sounds/footstep.mp3')
        }
    }
    if(to_down){
        new_jump -= vel/4*elapsedTime
        if(next_floor && new_jump <= next_floor.z0){
            console.log('down')
            to_down = false
            new_jump = next_floor.z0
            audio.load('sounds/footstep.mp3')
        }
    }

    next_floor = inside_sector.filter(e=>player.height+player.jump>=e.z0).sort((a, b) => (player.height+player.jump-a.z0) - (player.height+player.jump-b.z0))[0]
    next_ceil = inside_sector.filter(e=>player.height+player.jump<=e.z1).sort((a, b) => (a.z1-player.height+player.jump) - (b.z1-player.height+player.jump))[0]
    if(collisions && next_floor && new_jump < player.jump && new_jump<next_floor.z0){ // colisión suelo
        new_jump = Math.floor(next_floor.z0)
        if(to_jump){
            audio.load('sounds/land.mp3')
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
    if(!to_jump && !player.to_fly && collisions && next_floor && player.jump > next_floor.z0+50){ //caída libre
        to_jump = true
        jump_time = 0
        jump0 = player.jump
        f = f0
    }
    else if(!to_down && !to_jump && !player.to_fly && collisions && next_floor && new_jump-5 > next_floor.z0){ //bajar escalera
        to_down = true
    }
    else if(!to_up && !to_jump && !player.to_fly && collisions && next_floor && new_jump+5 < next_floor.z0){ //subir escalera
        to_up = true
        //new_jump = Math.floor(next_floor.z0)
    }
    else if(!to_jump && !player.to_fly && collisions && !next_floor){ //caída al infinito
        to_jump = true
        jump_time = 0
        jump0 = player.jump
        f = f0
    }
    for(let p_coll of p_colls.filter(e=>e.dist<50 && e.sector.take)){
        if(typeof window[p_coll.sector.take] == 'function'){
            window[p_coll.sector.take](p_coll.sector)
            p_coll.sector.take = false
        }
    }

    if(steepTime > (150+Math.random()*100)/vel && !player.to_fly && !to_jump && !to_up && !to_down && to_walk){
        audio.load('sounds/footstep.mp3')
        steepTime = 0
    }

    player.head += delta_head
    if(player.head>game.height/2) player.head = game.height/2
    if(player.head<-game.height/2) player.head = -game.height/2
    //gameSin = Math.sin(gameTime)*2
    //if(true){
    //    player.head = delta_head + gameSin
    //}
    //console.log(gameSin)
    player.head = Math.round(player.head)
    
    player.jump = new_jump
    player.height = new_height

    lights[1].x = player.posx
    lights[1].y = player.posy
    lights[1].rot = player.rot
    lights[1].z0 = player.height+10+player.jump+40
    lights[1].z1 = player.jump-20
    lights[1].z = player.height+player.jump
    
    for(let i = 0; i < 9; i++){
        if(keys[i]){
            if(time-actionTime > 500){
                if(inventory[i-1]){
                    let prev_index = inventory_index
                    if(inventory[inventory_index]){
                        unequip(inventory_index)
                    }
                    if(prev_index != i-1){
                        equip(i-1)
                    }
                }
                actionTime = time
            }
        }
    }

    equip_elem = sectors.find(e=>e.equip==true)
    if(equip_elem) follow_equip(equip_elem)

    sync({action:'player', data:player})
    localStorage.setItem("player", JSON.stringify(player))
    //if (time > frameTime + (1000/cam.fps)) {
    //    renderFrame()
    //    frameTime = time
    //}
    renderFrame(elapsedTime)
    requestAnimationFrame(frame)

    audio.setPlayer(player)
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

window.addEventListener("click", (event) => {
    console.log('audio enabled')
    audio.init()
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

function calculateNormalAngle(x1, y1, x2, y2, px, py) {
    // Calcula los vectores normales
    const dx = x2 - x1;
    const dy = y2 - y1;
    const normal1 = { x: -dy, y: dx };
    const normal2 = { x: dy, y: -dx };

    // Punto medio del segmento
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    // Vector desde el punto medio al punto (px, py)
    const vectorToPoint = { x: px - midX, y: py - midY };

    // Productos puntos
    const dot1 = normal1.x * vectorToPoint.x + normal1.y * vectorToPoint.y;
    const dot2 = normal2.x * vectorToPoint.x + normal2.y * vectorToPoint.y;

    // Selecciona el vector normal
    const selectedNormal = (dot1 > dot2) ? normal1 : normal2;

    // Calcula el ángulo del vector normal seleccionado
    const angleRadians = -Math.atan2(selectedNormal.y, selectedNormal.x);
    const angleDegrees = angleRadians * 180 / Math.PI;

    return angleDegrees;
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

function traslateSectorToCoords(sector, x, y, z){
    traslateSector(sector, x-sector.x, y-sector.y, z-sector.z)
}

function traslateSector(sector, x, y, z){
    for(var point of sector.points){
        point[0] += Math.round(x)
        point[1] += Math.round(y)
    }
    sector.z0 += Math.round(z)
    sector.z1 += Math.round(z)
    sector.x += Math.round(x)
    sector.y += Math.round(y)
    sector.z += Math.round(z)
}

function rotateSector(sector, x, y, angle){
    for(var point of sector.points){
        let px = point[0]
        let py = point[1]
        point[0] = ((px - x)*Math.cos(angle*Math.PI/180) - (py - y)*Math.sin(angle*Math.PI/180) + x)
        point[1] = ((px - x)*Math.sin(angle*Math.PI/180) + (py - y)*Math.cos(angle*Math.PI/180) + y)
    }
}

// 09/04/23 : mejorado el h-sync