sectors = [
    {
        name:'cube',
        z0:250, z1:200,
        ceil_color:'ceiling.png', ceil_scale:1, ceil_light:1,
        floor_color:'floor.jpg',floor_scale:1, floor_light:1,
        points:[
            [0, 0, 'brick.png', 1],
            [500, 0, 'brick.png', 1],
            [500, 500, 'brick.png', 1],
            [0, 500, 'brick.png', 1],
        ],
        texture_h: 2,texture_w: 2,
        texture_x0: 0,texture_y0: 0,
    },
    {
        name:'cube_arriba',
        z0:250, z1:100,
        ceil_color:'wood.png', ceil_scale:1, ceil_light:1,
        floor_color:null,floor_scale:1, floor_light:1,
        points:[
            [200, 200, 'brick2.jpg', 1],
            [300, 200, 'brick2.jpg', 1],
            [300, 300, 'brick2.jpg', 1],
            [200, 300, 'brick2.jpg', 1],
        ],
        texture_h: 1,texture_w: 1,
        texture_x0: 0,texture_y0: 0,
    },
]