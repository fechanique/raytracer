let canvas = new OffscreenCanvas(1, 1)
let ctx = canvas.getContext('2d', { willReadFrequently: true })

let textures_src = ['brick.png', 'wood.jpg', 'floor.jpg', 'ceiling.png', 'transparent.png', 'mario.png', 'grass.png', 'tree.png', 'water.png',
'skeleton.png', 'door.png', 'grid.jpg', 'gpt.jpg', 'duke.png', 'brick2.jpg', 'wall.jpg', 'parquet.jpg', 'floor2.jpg', 'tiles.jpg']

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
        const textureData = []
        let imageData = ctx.getImageData(0, 0, img.width, img.height).data;
        for (let j = 0; j < imageData.length; j += 4) {
            alpha = imageData[j + 3]
            if(alpha > 0) alpha = 255
            textureData.push([imageData[j], imageData[j + 1], imageData[j + 2], alpha]);
        }
        for(let i = 0; i < threads; i++){
            workers[i].postMessage({action:'textures', name:src, height:img.height, width:img.width, data: textureData})
        }

        let pattern = ctx.createPattern(img, 'repeat')
        patterns[src] = pattern
    };
}

//Probar a pintar todas las textutas sobre un mismo canvas
