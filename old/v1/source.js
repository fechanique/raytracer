let render = document.getElementById('render')
let editor = document.getElementById('editor')
let renderCtx = render.getContext('2d')
let editorCtx = editor.getContext('2d')

let fps = 60
let lastTime = 0
let width = 640
let height = 480

renderCtx.canvas.width = width
renderCtx.canvas.height = height

editorCtx.canvas.width = width
editorCtx.canvas.height = height

posx = 300
posy = 450
rot = 110

fov = 30
num = 640

let rayMod = 2000

let rays = []
index = 0
for(let i = -fov; i <= fov; i=i+(fov*2/(num-1))){
    rays.push({i: index++, deg:i, coll: null, dist: null, color: null})
}
lineWidth = editor.width/num
console.log(lineWidth)
//rays = [
//    [0, null, null],
//]

function renderFrame(){
    editorCtx.fillStyle = "grey"
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
        let distancia = null
        let intersetction = null
        let color = "black"
        for(var sector of sectors){
            for(let i=0 ; i<sector.length ; i++){
                j = (i+1)%sector.length
                let temp_dist = null
                let temp_int = findIntersection(posx, posy, posx+rayMod*Math.cos((rot-ray.deg)/180*Math.PI), posy-rayMod*Math.sin((rot-ray.deg)/180*Math.PI), 
                sector[i][0], sector[i][1], sector[j][0], sector[j][1])
                if(temp_int){
                    temp_dist = calcularDistancia(posx, posy, temp_int.intersectX, temp_int.intersectY)
                    if(temp_dist < distancia || distancia == null){
                        distancia = temp_dist
                        intersetction = temp_int
                        color = sector[i][2]
                    }
                }
            }
        }
        if(intersetction){
            ray.coll = intersetction
            ray.dist = distancia
            ray.color = color
        }else{
            ray.coll = null
            ray.dist = rayMod
            ray.color = color
        }
    }

    //ray
    for(let ray of rays){
        editorCtx.lineWidth = 1
        editorCtx.strokeStyle = ray.color
        editorCtx.beginPath()
        editorCtx.moveTo(0, 0)
        editorCtx.lineTo(ray.dist*Math.cos(ray.deg/180*Math.PI), ray.dist*Math.sin(ray.deg/180*Math.PI))
        editorCtx.stroke()
    }

    editorCtx.restore()

    editorCtx.save()
    editorCtx.translate(-posx+editor.width/2, -posy+editor.height/2)
    for(var sector of sectors){
        editorCtx.fillStyle = '#ff0';
        editorCtx.beginPath()
        for(let path of sector){
            editorCtx.lineTo(path[0], path[1])
        }
        editorCtx.closePath()
        editorCtx.fill()
    }

    editorCtx.restore()

    renderCtx.fillStyle = "blue"
    renderCtx.fillRect(0, 0, render.width, render.height/2)
    renderCtx.fillStyle = "grey"
    renderCtx.fillRect(0, render.height/2, render.width, render.height)

    for(let ray of rays){
        if(ray.coll){
            renderCtx.strokeStyle = ray.color
            renderCtx.lineWidth = lineWidth
            renderCtx.beginPath()
            let ceil = (50*1000/(ray.dist*Math.cos((ray.deg)*Math.PI/180)))
            let floor = (30*1000/(ray.dist*Math.cos((ray.deg)*Math.PI/180)))
            renderCtx.moveTo(ray.i*lineWidth+lineWidth/2, (editor.height/2)-(ceil/2))
            renderCtx.lineTo(ray.i*lineWidth+lineWidth/2, (editor.height/2)-(floor/2))
            renderCtx.stroke()
        }
    }
    for(let ray of rays){
        if(ray.coll){
            renderCtx.strokeStyle = ray.color
            renderCtx.lineWidth = lineWidth
            renderCtx.beginPath()
            let ceil = -(25*1000/(ray.dist*Math.cos((ray.deg)*Math.PI/180)))
            let floor = -(30*1000/(ray.dist*Math.cos((ray.deg)*Math.PI/180)))
            renderCtx.moveTo(ray.i*lineWidth+lineWidth/2, (editor.height/2)-(ceil/2))
            renderCtx.lineTo(ray.i*lineWidth+lineWidth/2, (editor.height/2)-(floor/2))
            renderCtx.stroke()
        }
    }
    /*for(let ray of rays){
        if(ray.coll){
            renderCtx.strokeStyle = ray.color
            renderCtx.lineWidth = lineWidth
            renderCtx.beginPath()
            let height = (30000/(ray.dist*Math.cos((ray.deg)/180*Math.PI)))
            let floor = (editor.height) - editor.height*(ray.dist/50000)
            renderCtx.moveTo(ray.i*lineWidth+lineWidth/2, floor)
            renderCtx.lineTo(ray.i*lineWidth+lineWidth/2, floor-height)
            renderCtx.stroke()
        }
    }*/

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
        const intersectX = x1 + t * (x2 - x1);
        const intersectY = y1 + t * (y2 - y1);
        return { intersectX, intersectY };
    }

    // Si t o u no están en el rango de 0 a 1, entonces no hay una intersección en los segmentos de línea dados
    return null;
}

function calcularDistancia(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}

elapsedTime = 0
vel=1
function frame(time) {
  if (time > lastTime + (1000/fps)) {
    renderFrame()
    lastTime = time
  }
  elapsedTime = (time - elapsedTime)/5
  if(arrowUp){
    posx += vel*elapsedTime*Math.cos(rot/180*Math.PI)
    posy -= vel*elapsedTime*Math.sin(rot/180*Math.PI)
  }
  if(arrowDown){
    posx -= vel*elapsedTime*Math.cos(rot/180*Math.PI)
    posy += vel*elapsedTime*Math.sin(rot/180*Math.PI)
  }
  if(arrowLeft){
    rot += elapsedTime
  }
  if(arrowRight){
    rot -= elapsedTime
  }
  elapsedTime = time
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

document.addEventListener('keydown', move)
document.addEventListener('keyup', stop)

arrowUp = false
arrowDown = false
arrowLeft = false
arrowRight = false
function move(event) {
    var tecla = event.key;
    switch(tecla) {
        case "ArrowUp":
            arrowUp = true
            break;
        case "ArrowDown":
            arrowDown = true
            break;
        case "ArrowLeft":
            arrowLeft = true
            break;
        case "ArrowRight":
            arrowRight = true
            break;
        default:
            console.log("Other Key Pressed");
    }
}

function stop(event) {
    var tecla = event.key;
    switch(tecla) {
        case "ArrowUp":
            arrowUp = false
            break;
        case "ArrowDown":
            arrowDown = false
            break;
        case "ArrowLeft":
            arrowLeft = false
            break;
        case "ArrowRight":
            arrowRight = false
            break;
        default:
            console.log("Other Key Released");
    }
}