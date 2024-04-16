console.log('load level 1')

sectors = [
{
    static:true,
    id:0,
    ch:50,
    fh:-50,
    ceil_color:'ceiling.png',
    floor_color:'floor.jpg',
    texture_h: 400,
    points:[   
        [0, 0, 'brick.png'],
        [500, 0, 'brick.png'],
        [500, 500, 'brick.png'],
        [0, 500, 'brick.png'],
]},
{
    static:true,
    id:1,
    ch:50,
    fh:-50,
    ceil_color:'ceiling.png',
    floor_color:'floor.jpg',
    texture_h: 300,
    points:[   
        [225, 225, 'transparent.png'],
        [275, 225, 'wood.jpg'],
        [275, 275, 'wood.jpg'],
        [225, 275, 'wood.jpg'],
]},
{
    static:false,
    id:2,
    ch:50,
    fh:-50,
    ch1:30,
    fh1:-30,
    ceil_color:'wood.jpg',
    floor_color:'wood.jpg',
    texture_h: 50,
    points:[   
        [325, 325, 'wood.jpg'],
        [375, 325, 'wood.jpg'],
        [375, 375, 'wood.jpg'],
        [325, 375, 'wood.jpg'],
]},

]

sprites = [
    {
        posx: 350,
        posy: 350,
        texture: 'mario.png',
        height: 50,
        width: 50,
    }
]