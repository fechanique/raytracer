let canvas = new OffscreenCanvas(1, 1)
let ctx = canvas.getContext('2d', { willReadFrequently: true })

let textures = {}

let textures_src = ['brick.png', 'wood.jpg', 'floor.jpg', 'ceiling.png', 'transparent.png', 'mario.png', 'grass.png', 'tree.png', 'water.png',
'skeleton.png', 'door.png', 'grid.jpg']

for(let i = 0; i < textures_src.length; i++){
    let img = new Image()
    img.src = 'textures/'+textures_src[i]
    img.onload = function() {
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)        
        textures[textures_src[i]] = ctx.getImageData(0, 0, img.width, img.height)
    }

}

function getPixel(x, y, texture_src) {
    let texture = textures[texture_src]
    if(typeof texture == 'undefined') return [255, 255, 255, 0]
    let x_mod = x % texture.width
    let y_mod = y % texture.height
    // Calcula el índice del píxel en el array de datos
    let index = ((((x_mod + y_mod * texture.width) * 4) % texture.data.length)+texture.data.length)%texture.data.length
    return [
        texture.data[index],     //r
        texture.data[index + 1], //g
        texture.data[index + 2], //b
        texture.data[index + 3], //a
    ]

}

//Probar a pintar todas las textutas sobre un mismo canvas
