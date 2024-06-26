let canvas = new OffscreenCanvas(1, 1)
let ctx = canvas.getContext('2d', { willReadFrequently: true })

let textures_src = new Set()
skybox_texture = loadImage(skybox.texture, true)

for(let sector of sectors){
    if(sector.floor_color) textures_src.add(sector.floor_color)
    if(sector.ceil_color) textures_src.add(sector.ceil_color)
    if(sector.hit_texture) sector.hit_texture.forEach(e=>textures_src.add(e))
    for(let point of sector.points){
        textures_src.add(point[2])
    }
}

for(let texture of textures_src){
    loadImage(texture);
}

function loadImage(src, isSkybox = false) {
    const img = new Image();
    img.src = 'textures/' + src;
    img.onload = function() {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const textureData = []
        let imageData = ctx.getImageData(0, 0, img.width, img.height).data;
        for (let j = 0; j < imageData.length; j += 4) {
            alpha = imageData[j + 3]
            //if(alpha > 0) alpha = 255
            textureData.push([imageData[j], imageData[j + 1], imageData[j + 2], alpha]);
        }
        for(let i = 0; i < threads; i++){
            workers[i].postMessage({action:'textures', name:src, height:img.height, width:img.width, data: textureData})
        }

        let pattern = ctx.createPattern(img, 'repeat')
        patterns[src] = pattern
        if(isSkybox){
            skybox.texture_height = img.height
            skybox.texture_width = img.width
        }
    }
}

//Probar a pintar todas las textutas sobre un mismo canvas
