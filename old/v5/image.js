const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d', { willReadFrequently: true })

let textures = {}
let textures_src = ['brick.png', 'wood.jpg', 'floor.jpg', 'ceiling.png', 'transparent.png', 'mario.png', 'grass.png', 'tree.png', 'water.png',
'skeleton.png', 'door.png', 'grid.jpg']

for(let i = 0; i < textures_src.length; i++){
    let img = new Image()
    img.src = textures_src[i]
    img.onload = function() {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        textures[textures_src[i]] = ctx.getImageData(0, 0, img.width, img.height);
    }
}

function getPixel(x, y, texture) {
    texture = textures[texture]
    if(typeof texture == 'undefined') return [255,255,255,0]
    x = x % texture.width
    y = y % texture.height
    // Calcula el índice del píxel en el array de datos
    let index = ((((x + y * texture.width) * 4) % texture.data.length)+texture.data.length)%texture.data.length

    return [
        texture.data[index], //r
        texture.data[index + 1], //g
        texture.data[index + 2], //b
        texture.data[index + 3], //a
        index,
        texture.data.length,
        texture.width,
        texture.height
    ]

}
