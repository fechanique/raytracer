let render = document.getElementById('render')
let editor = document.getElementById('editor')
let renderCtx = render.getContext('2d')
let editorCtx = editor.getContext('2d')

let fps = 60
let width = 640
let height = 480

renderCtx.canvas.width = width
renderCtx.canvas.height = height

editorCtx.canvas.width = width
editorCtx.canvas.height = height

posx = 180
posy = 180
rot = 230
head = 0
jump = 0

fov = 30
fovV = 1500
num = render.width/2
corr = 0 //solape entre lineas verticales produce que se vean vertices

let rayMod = 2000

let rays = []
index = 0
for(let i = -fov; i <= fov; i=i+(fov*2/(num))){
    rays.push({i: index++, deg:i, coll: []})
}
lineWidth = (render.width/num)
console.log(lineWidth, rays.length, rays.length*lineWidth)
//rays = [
//    [0, null, null],
//]

function renderFrame(){
    editorCtx.fillStyle = "lightgrey"
    editorCtx.fillRect(0, 0, editor.width, editor.height)

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
                let temp_dist = null
                let temp_int = findIntersection(posx, posy, posx+rayMod*Math.cos((rot-ray.deg)/180*Math.PI), posy-rayMod*Math.sin((rot-ray.deg)/180*Math.PI), 
                points[i][0], points[i][1], points[j][0], points[j][1])
                if(temp_int){
                    temp_dist = calcDistance(posx, posy, temp_int.intersectX, temp_int.intersectY)
                    ray.coll.push({dist: temp_dist, int: temp_int, color: points[i][2],sector: sector})
                }
            }
        }
        ray.coll.sort((a, b) => {
            if(a.dist < b.dist) return 1
            else if(a.dist > b.dist) return -1
            else if (a.dist == b.dist) return 0
        })
    }

    //ray
    for(let ray of rays){
        for(let coll of ray.coll){
            editorCtx.lineWidth = 1
            editorCtx.strokeStyle = coll.color
            editorCtx.beginPath()
            editorCtx.moveTo(0, 0)
            editorCtx.lineTo(coll.dist*Math.cos(ray.deg/180*Math.PI), coll.dist*Math.sin(ray.deg/180*Math.PI))
            editorCtx.stroke()
        }
        if(!ray.coll.length){
            editorCtx.lineWidth = 1
            editorCtx.strokeStyle = 'black'
            editorCtx.beginPath()
            editorCtx.moveTo(0, 0)
            editorCtx.lineTo(rayMod*Math.cos(ray.deg/180*Math.PI), rayMod*Math.sin(ray.deg/180*Math.PI))
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
        }
        editorCtx.closePath()
        editorCtx.stroke()
        //if(!sector.static) editorCtx.fill()
    }

    editorCtx.restore()

    renderCtx.fillStyle = "blue"
    renderCtx.fillRect(0, 0, render.width, (render.height/2)+head)
    renderCtx.fillStyle = "grey"
    renderCtx.fillRect(0, (render.height/2)+head, render.width, render.height-head)

    for(let ray of rays){
        let sectorStack = []
        //if(ray.i!=318) continue
        for(let i=0; i<ray.coll.length; i++){
            let coll = ray.coll[i]

            if(coll.sector.static){
                renderCtx.strokeStyle = coll.color
                renderCtx.lineWidth = lineWidth
                renderCtx.beginPath()
                let c1 = ((coll.sector.ch-jump)*fovV/(coll.dist*Math.cos((ray.deg)*Math.PI/180)))
                let f1 = ((coll.sector.fh-jump)*fovV/(coll.dist*Math.cos((ray.deg)*Math.PI/180)))
                renderCtx.moveTo(ray.i*lineWidth+lineWidth/2, ((render.height/2)-(c1/2)+head)-0)
                renderCtx.lineTo(ray.i*lineWidth+lineWidth/2, ((render.height/2)-(f1/2)+head)+0)
                renderCtx.stroke()
            }else{
                renderCtx.strokeStyle = coll.color
                renderCtx.lineWidth = lineWidth
                renderCtx.beginPath()
                let c1 = ((coll.sector.ch-jump)*fovV/(coll.dist*Math.cos((ray.deg)*Math.PI/180)))
                let f1 = ((coll.sector.ch1-jump)*fovV/(coll.dist*Math.cos((ray.deg)*Math.PI/180)))
                renderCtx.moveTo(ray.i*lineWidth+lineWidth/2, ((render.height/2)-(c1/2)+head)-0)
                renderCtx.lineTo(ray.i*lineWidth+lineWidth/2, ((render.height/2)-(f1/2)+head)-(Math.sign(f1)*corr))
                renderCtx.stroke()

                renderCtx.strokeStyle = coll.color
                renderCtx.lineWidth = lineWidth
                renderCtx.beginPath()
                let c2 = ((coll.sector.fh-jump)*fovV/(coll.dist*Math.cos((ray.deg)*Math.PI/180)))
                let f2 = ((coll.sector.fh1-jump)*fovV/(coll.dist*Math.cos((ray.deg)*Math.PI/180)))
                renderCtx.moveTo(ray.i*lineWidth+lineWidth/2, ((render.height/2)-(c2/2)+head)-0)
                renderCtx.lineTo(ray.i*lineWidth+lineWidth/2, ((render.height/2)-(f2/2)+head)+(Math.sign(f2)*corr))
                renderCtx.stroke()
            }

            if(true){
                let prev_coll = ray.coll[i]
                let next_coll = ray.coll[i+1]
                if(!next_coll) next_coll = {dist:1}
                if(!sectorStack.find(x => x.id === prev_coll.sector.id)){
                    sectorStack.push(coll.sector)
                }else{
                    sectorStack.pop()
                }
                curr_sector = sectorStack[sectorStack.length-1]
                if(!curr_sector) continue

                if(curr_sector.static){         
                    p1 = ((curr_sector.ch-jump)*fovV/((prev_coll.dist)*Math.cos((ray.deg)*Math.PI/180)))
                    p2 = ((curr_sector.ch-jump)*fovV/((next_coll.dist)*Math.cos((ray.deg)*Math.PI/180)))
                }else{
                    p1 = ((curr_sector.ch1-jump)*fovV/((prev_coll.dist)*Math.cos((ray.deg)*Math.PI/180)))
                    p2 = ((curr_sector.ch1-jump)*fovV/((next_coll.dist)*Math.cos((ray.deg)*Math.PI/180)))
                }
                renderCtx.lineWidth = lineWidth
                renderCtx.beginPath()
                renderCtx.strokeStyle = curr_sector.ceil_color
                renderCtx.moveTo(ray.i*lineWidth+lineWidth/2, ((render.height/2)-(p1/2)+head)+corr)
                renderCtx.lineTo(ray.i*lineWidth+lineWidth/2, ((render.height/2)-(p2/2)+head)-corr)
                renderCtx.stroke()

                if(curr_sector.static){         
                    p3 = ((curr_sector.fh-jump)*fovV/((prev_coll.dist)*Math.cos((ray.deg)*Math.PI/180)))
                    p4 = ((curr_sector.fh-jump)*fovV/((next_coll.dist)*Math.cos((ray.deg)*Math.PI/180)))
                }else{
                    p3 = ((curr_sector.fh1-jump)*fovV/((prev_coll.dist)*Math.cos((ray.deg)*Math.PI/180)))
                    p4 = ((curr_sector.fh1-jump)*fovV/((next_coll.dist)*Math.cos((ray.deg)*Math.PI/180)))
                }
                renderCtx.lineWidth = lineWidth
                renderCtx.beginPath()
                renderCtx.strokeStyle = curr_sector.floor_color
                renderCtx.moveTo(ray.i*lineWidth+lineWidth/2, ((render.height/2)-(p3/2)+head)-corr)
                renderCtx.lineTo(ray.i*lineWidth+lineWidth/2, ((render.height/2)-(p4/2)+head)+corr)
                renderCtx.stroke()
            }
        }
    }
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
        const intersectX = (x1 + t * (x2 - x1)).toFixed(2)
        const intersectY = (y1 + t * (y2 - y1)).toFixed(2)
        return { intersectX, intersectY };
    }

    // Si t o u no están en el rango de 0 a 1, entonces no hay una intersección en los segmentos de línea dados
    return null;
}

function calcDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
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
    head += 2*vel*elapsedTime
  }
  if(keys['c']){
    head -= 2*vel*elapsedTime
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
  if(keys['x']){
    if(!to_jump){
        to_jump = true
        jump=0.01
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
    console.log('pressed:', event.key.toLowerCase())
})
document.addEventListener('keyup', (event)=>{
    keys[event.key.toLowerCase()] = false
    console.log('released:', event.key.toLowerCase())
})