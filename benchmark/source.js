let render = document.getElementById('render')
let renderCtx = render.getContext('2d', { willReadFrequently: true, })

let fps = 60
let width = 640
let height = 480

const offscreen = new OffscreenCanvas(width, height) //revisar si esto mejora algo
offscreenCtx = offscreen.getContext('2d', { willReadFrequently: true })

renderCtx.canvas.width = width
renderCtx.canvas.height = height

render_height_2 = render.height/2
render_width_2 = render.width/2


function renderFrame(){
    let imageData = offscreenCtx.createImageData(offscreen.width, offscreen.height)
    let buf = new ArrayBuffer(imageData.data.length)
    let buf8 = new Uint8ClampedArray(buf)
    data = new Uint32Array(buf)
    for(y=(render.height/2) ; y>0 ; y--){
        a = y*render.width
        for(x=0 ; x<render.width ; x++){
            data[a + x] = (255 << 24) | 255 << 16 | (200 << 8) | 100 //a,b,g,r
        }
    }
    for(y=(render.height/2) ; y<render.height ; y++){
        a = y*render.width
        y1 = y-(render_height_2)
        for(x=0 ; x<render.width ; x++){
            data[a + x] = (255 << 24) | (Math.max(Math.min(50+y1, 150), 50)<< 16) | (Math.max(Math.min(50+y1, 150), 50) << 8) | Math.max(Math.min(50+y1, 150), 50) //a,b,g,r
        }
    }

    imageData.data.set(buf8)
    renderCtx.putImageData(imageData, 0, 0)
}

frameTime = 0
function frame(time) {
    if (time > frameTime + (1000/fps)) {
        renderFrame()
        frameTime = time
    }
    requestAnimationFrame(frame)
}
requestAnimationFrame(frame)