skybox = {
    texture: 'skybox.jpg',
    texture_h: 2,
    texture_w: 1,
}

player_init = {posx: 300, posy: 300, rot: 0, head: 0, jump: 0, height:50, to_fly:false}

sectors = [
    {
        name:'cube_suelo',
        z0:0, z1:-20,
        ceil_color:'ceiling.png', ceil_scale:1, ceil_light:1,
        floor_color:'floor.jpg',floor_scale:1, floor_light:1,
        points:[
            [-1000, -1000, 'brick.png', 1],
            [1000, -1000, 'brick.png', 1],
            [1000, 1000, 'brick.png', 1],
            [-1000, 1000, 'brick.png', 1],
        ],
        texture_h: 2,texture_w: 2,
        texture_x0: 0,texture_y0: 0,
    },
    {
        name:'cube_centro',
        z0:80,  z1:0,
        ceil_color:'floor.jpg', ceil_scale:1, ceil_light:1,
        floor_color:'ceiling.png', floor_scale:1, floor_light:1,
        points:[
            [0, 0, 'brick.png', 1],
            [200, 0, 'brick.png', 1],
            [200, 200, 'brick.png', 1],
            [0, 200, 'brick.png', 1],
        ],
        texture_h: 2, texture_w: 2,
        texture_x0: 0, texture_y0: 0,
        alpha: 255,
    },
]

/*sectors = []

for(let i=0 ; i<10 ; i++){
    for(let j=0 ; j<10 ; j++){
        for(let k=0 ; k<10 ; k++){
            let facti = i*200
            let factj = j*200
            let factk = k*200
            sector = {
                name:'sector',
                z0:100+facti, z1:0+facti,
                ceil_color:'wood.jpg', ceil_scale:1, ceil_light:1,
                floor_color:'wood.jpg', floor_scale:1, floor_light:1,
                points:[
                    [0+factj, 0+factk, 'wood.jpg', 1],
                    [0+factj, 100+factk, 'wood.jpg', 1],
                    [100+factj, 100+factk, 'wood.jpg', 1],
                    [100+factj, 0+factk, 'wood.jpg', 1],
                ],
                texture_h: 2, texture_w: 2,
                texture_x0: 0, texture_y0: 0,
            }
            sectors.push(sector)
        }
    }
}*/