let canvas = new OffscreenCanvas(1, 1)
let ctx = canvas.getContext('2d', { willReadFrequently: true })

let textures = {}

let textures_src = ['brick.png', 'wood.jpg', 'floor.jpg', 'ceiling.png', 'transparent.png', 'mario.png', 'grass.png', 'tree.png', 'water.png',
'skeleton.png', 'door.png', 'grid.jpg', 'gpt.jpg']

for(let i = 0; i < textures_src.length; i++){
    loadImage(textures_src[i], i);
}

function loadImage(src, index) {
    const img = new Image();
    img.src = 'textures/' + src;
    img.onload = function() {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const textureData = { width: img.width, height: img.height, data: [] };
        let imageData = ctx.getImageData(0, 0, img.width, img.height).data;
        for (let j = 0; j < imageData.length; j += 4) {
            textureData.data.push([imageData[j], imageData[j + 1], imageData[j + 2], imageData[j + 3]]);
        }
        textures[src] = textureData;
    };
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

//Probar a pintar todas las textutas sobre un mismo canvas
