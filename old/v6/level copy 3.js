console.log('load level 1')

sectors = [
    {
        name:'cube',
        z0:30,
        z1:-30,
        ceil_color:'floor.jpg',
        ceil_scale:1,
        floor_color:'ceiling.png',
        floor_scale:1,
        points:[
            [0, 0, 'brick.png'],
            [300, 0, 'brick.png'],
            [300, 300, 'brick.png'],
            [0, 300, 'brick.png'],
            [0, 200, 'brick.png'],
            [100, 200, 'brick.png'],
            [100, 100, 'brick.png'],
            [0, 100, 'brick.png'],
        ],
        texture_h: 200,
        texture_w: 2,
        texture_x0: 0,
        texture_y0: 0,
    },
    {
        name:'cube_arriba',
        z0:50,
        z1:30,
        ceil_color:'ceiling.png',
        ceil_scale:1,
        floor_color:'floor.jpg',
        floor_scale:1,
        points:[
            [250, 250, 'wood.jpg'],
            [350, 250, 'wood.jpg'],
            [350, 350, 'wood.jpg'],
            [250, 350, 'wood.jpg'],
        ],
        texture_h: 200,
        texture_w: 2,
        texture_x0: 0,
        texture_y0: 0,
    },
    {
        name:'cube_abajo',
        z0:-30,
        z1:-50,
        ceil_color:'ceiling.png',
        ceil_scale:1,
        floor_color:'floor.jpg',
        floor_scale:1,
        points:[
            [250, 250, 'wood.jpg'],
            [350, 250, 'wood.jpg'],
            [350, 350, 'wood.jpg'],
            [250, 350, 'wood.jpg'],
        ],
        texture_h: 200,
        texture_w: 2,
        texture_x0: 0,
        texture_y0: 0,
    },
    {
        name:'cube_arriba_tapa',
        z0:30,
        z1:10,
        ceil_color:'ceiling.png',
        ceil_scale:1,
        floor_color:'floor.jpg',
        floor_scale:1,
        points:[
            [0, 100, 'wood.jpg'],
            [100, 100, 'wood.jpg'],
            [100, 200, 'wood.jpg'],
            [0, 200, 'wood.jpg'],
        ],
        texture_h: 200,
        texture_w: 2,
        texture_x0: 0,
        texture_y0: 0,
    },
    {
        name:'cube_abajo_tapa',
        z0:-10,
        z1:-30,
        ceil_color:'ceiling.png',
        ceil_scale:1,
        floor_color:'floor.jpg',
        floor_scale:1,
        points:[
            [0, 100, 'wood.jpg'],
            [100, 100, 'wood.jpg'],
            [100, 200, 'wood.jpg'],
            [0, 200, 'wood.jpg'],
        ],
        texture_h: 200,
        texture_w: 2,
        texture_x0: 0,
        texture_y0: 0,
    },
]

sprites = [

]