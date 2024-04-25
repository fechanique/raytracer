function door(sector){
    console.log('door', sector.status)
    if(sector.locked){
        audio.load('sounds/locked.mp3', sector.x, sector.y, sector.z)
        return
    }
    if(sector.status == 'closed'){
        sector.status = 'open'
        audio.load('sounds/door-close.mp3', sector.x, sector.y, sector.z)
        if(!sector.r0) sector.r0 = 0
        sector.r1 = sector.params.a
        sector.animate = 'animateDoor'
    }else{
        sector.status = 'closed'
        audio.load('sounds/door-open.mp3', sector.x, sector.y, sector.z)
        if(!sector.r0) sector.r0 = sector.params.a
        sector.r1 = 0
        sector.animate = 'animateDoor'
    }
}

function animateDoor(sector, elapsedTime){
    let v = 0.2
    let d = v*elapsedTime

    if(sector.r0 < sector.r1){
        if((sector.r0 + d) >= sector.r1){
            d = sector.r1 - sector.r0
            sector.animate = null
        }
        sector.r0 += d
        rotateSector(sector, sector.params.x, sector.params.y, d)
    }else{
        if((sector.r0 - d) <= sector.r1){
            d = sector.r0 - sector.r1
            sector.animate = null
        }
        sector.r0 -= d
        rotateSector(sector, sector.params.x, sector.params.y, -d)
    }
}

function unlock(sector, inventory_group){
    if(inventory_group == 'key'){
        sector.locked = false
        audio.load('sounds/unlock.mp3', sector.x, sector.y, sector.z)
    }
}

function animateElevator(sector, elapsedTime){
    let v  = 0.2
    let d = v*elapsedTime
    if(sector.status == 'left'){
        traslateSector(sector, 0, d, 0)
        if(next_floor && next_floor.id == sector.id && player.jump < next_floor.z0+10){
            player.posy = player.posy+d
        }
        if(sector.y > 870){
            traslateSectorToCoords(sector, sector.x, 870, sector.z)
            sector.status = 'up'
        }
    }
    else if(sector.status == 'up'){
        traslateSector(sector, 0, 0, d)
        if(sector.z > 200){
            traslateSectorToCoords(sector, sector.x, sector.y, 200)
            sector.status = 'right'
        }
        if(next_floor && next_floor.id == sector.id){
            new_jump = player.jump+d
            to_up = false
        }
    }
    else if(sector.status == 'right'){
        traslateSector(sector, 0, -d, 0)
        if(next_floor && next_floor.id == sector.id && player.jump < next_floor.z0+10){
            player.posy = player.posy-d
        }
        if(sector.y < 570){
            traslateSectorToCoords(sector, sector.x, 570, sector.z)
            sector.status = 'down'
        }
    }
    else if(sector.status == 'down'){
        traslateSector(sector, 0, 0, -d)
        if(sector.z < 20){
            traslateSectorToCoords(sector, sector.x, sector.y, 20)
            sync({action:'sector', data:sector})
            sector.status = 'left'
        }
        if(next_floor && next_floor.id == sector.id){
            new_jump = player.jump-d
            to_down = false
        }
    }
    audio.setPanner(sounds.find(e=>e.id == 'elevator'), sector.x, sector.y, sector.z)
}

function break_glass(sector, segment_id){
    if(!sector.hits) sector.hits = 0
    sector.hits += 1
    audio.load('sounds/glass.mp3', sector.x, sector.y, sector.z)
    if(sector.hits == 3){
        sectors.splice(sectors.findIndex(e=>e.id == sector.id), 1)
        let smash_sound = sector.smash_sound?sector.smash_sound:'sounds/impact.mp3'
        audio.load(smash_sound, sector.x, sector.y, sector.z)
        let division = 10
        let segments = divideSegment(sector.points[segment_id][0], sector.points[segment_id][1], sector.points[segment_id+1][0], sector.points[segment_id+1][1], division)
        let size = sizeSegment(sector.points[segment_id][0], sector.points[segment_id][1], sector.points[segment_id+1][0], sector.points[segment_id+1][1])
        let z = (sector.z0-sector.z1)/division
        for(let j=0 ; j<division ; j++){
            for(let i=0 ; i<division ; i++){
                if(Math.random() > 0.75) continue
                particle_clon = JSON.parse(JSON.stringify(sector))
                particle_clon.animate = 'particle'
                particle_clon.type = 'particle'
                particle_clon.points = particle_clon.points.slice(0, 2)
                particle_clon.points[0][0] = segments[i][0]
                particle_clon.points[0][1] = segments[i][1]
                particle_clon.points[1][0] = segments[i+1][0]
                particle_clon.points[1][1] = segments[i+1][1]
                particle_clon.z0 = sector.z0 - z*j
                particle_clon.z1 = sector.z0 - z*(j+1)
                particle_clon.z1_min = sector.z1
                particle_clon.alpha = sector.alpha - Math.floor(Math.random()*50)
                particle_clon.texture_x0 = Math.round(Math.random()*1000)
                particle_clon.texture_y0 = Math.round(Math.random()*1000)
                prepareSector(performance.now()+1, particle_clon)
                sectors.push(particle_clon)
            }
        }
    }
    else if(sector.hits == 1){
        for(let point of sector.points){
            if(sector.hit_texture) point[2] = sector.hit_texture[0]
        }
    }else{
        for(let point of sector.points){
            if(sector.hit_texture) point[2] = sector.hit_texture[1]
        }
    }
}

function particle(sector, elapsedTime){
    if(!sector.state){
        sector.jump_time = 0
        sector.state = 'falling'
        sector.g = 500 + Math.floor(Math.random()*800)
        sector.startZ0 = sector.z0
        sector.startZ1 = sector.z1
        sector.f = 0
    }else{
        sector.jump_time += elapsedTime/1000
        sector.z0 = Math.round(sector.startZ0 + sector.f*sector.jump_time - (0.5 * sector.g * sector.jump_time * sector.jump_time))
        sector.z1 = Math.round(sector.startZ1 + sector.f*sector.jump_time - (0.5 * sector.g * sector.jump_time * sector.jump_time))
        if(sector.z1 < sector.z1_min){
            sectors.splice(sectors.findIndex(e=>e.id == sector.id), 1)
        }
    }
}

function divideSegment(x1, y1, x2, y2, n) {
    const points = [];
    for (let i = 0; i <= n; i++) {
        const x = x1 + i * (x2 - x1) / n;
        const y = y1 + i * (y2 - y1) / n;
        points.push([x, y]);
    }
    return points;
}

function sizeSegment(x1, y1, x2, y2){
    return Math.round(Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2)))
}

function rotation(sector, elapsedTime){
    let v = 0.2
    let d = v*elapsedTime
    rotateSector(sector, sector.x, sector.y, d)
}

function take(sector){
    console.log('take', sector.name)
    audio.load('sounds/take.mp3')
    while(sectors.filter(e=> e.group == sector.group).length>0){
        sectors.splice(sectors.findIndex(e=>e.group == sector.group), 1)
    }
    inventory.push(sector)
    if(inventory[inventory_index]) unequip(inventory_index)
    equip(inventory.length-1)
}

function unequip(index){
    let sector = inventory[index]
    console.log('unequip', sector.group)
    while(sectors.filter(e=> e.group == sector.group).length>0){
        sectors.splice(sectors.findIndex(e=>e.group == sector.group), 1)
    }
    inventory_index = undefined
}

function equip(index){
    let sector = inventory[index]
    console.log('equip', sector.group)
    for(let sector of sectors){
        sector.equip = false
    }
    for(let [i, elem] of models[sector.group].sectors.entries()){
        let clone_elem = JSON.parse(JSON.stringify(elem))
        prepareSector(performance.now()+i, clone_elem)
        clone_elem.equip = true
        clone_elem.traspase = true
        clone_elem.x = models[sector.group].x
        clone_elem.y = models[sector.group].y
        clone_elem.z = models[sector.group].z
        rotateSector(clone_elem, clone_elem.x, clone_elem.y, models[sector.group].r)
        rotateSector(clone_elem, clone_elem.x, clone_elem.y, -10)

        sectors.push(clone_elem)
    }
    inventory_index = index
}

function follow_equip(sector){
    for(let sector of sectors.filter(e=>e.equip == true)){
        traslateSectorToCoords(sector, player.posx+5, player.posy-30, player.jump+player.height-10)
        rotateSector(sector, player.posx, player.posy, sector.r-player.rot)
        sector.r = player.rot
    }
}

models = {
'pistola' : {
    x:405, y:515, z:65, r:0,
    sectors: [
        {
            name:'pistola1',
            group: 'pistola',
            z0:65, z1:60,
            ceil_color:'metal.jpg', ceil_scale:1, ceil_light:1,
            floor_color:'metal.jpg',floor_scale:1, floor_light:1,
            points:[
                [400, 505, 'metal.jpg', 1],
                [405, 505, 'metal.jpg', 1],
                [405, 520, 'metal.jpg', 1],
                [400, 520, 'metal.jpg', 1],
            ],
            texture_h: 2,texture_w: 2,
            texture_x0: 0,texture_y0: 0,
        },
        {
            name:'pistola1',
            group: 'pistola',
            z0:60, z1:55,
            ceil_color:'metal.jpg', ceil_scale:1, ceil_light:1,
            floor_color:'metal.jpg',floor_scale:1, floor_light:1,
            points:[
                [400, 515, 'metal.jpg', 1],
                [405, 515, 'metal.jpg', 1],
                [405, 520, 'metal.jpg', 1],
                [400, 520, 'metal.jpg', 1],
            ],
            texture_h: 2,texture_w: 2,
            texture_x0: 0,texture_y0: 0,
        },
    ]
},
'key': {
    x:401, y:315, z:52.2, r:180,
    sectors: [
        {
            name:'key1',
            group: 'key',
            z0:55, z1:50,
            ceil_color:'gold.jpg', ceil_scale:1, ceil_light:1,
            floor_color:'gold.jpg',floor_scale:1, floor_light:1,
            points:[
                [400, 310, 'gold.jpg', 1],
                [402, 310, 'gold.jpg', 1],
                [402, 330, 'gold.jpg', 1],
                [400, 330, 'gold.jpg', 1],
            ],
            x:401, y:315, z:52.2,
            texture_h: 1,texture_w: 1,
            texture_x0: 0,texture_y0: 0,
        },
        {
            name:'key2',
            group: 'key',
            z0:50, z1:47,
            ceil_color:'gold.jpg', ceil_scale:1, ceil_light:1,
            floor_color:'gold.jpg',floor_scale:1, floor_light:1,
            points:[
                [400, 317, 'gold.jpg', 1],
                [402, 317, 'gold.jpg', 1],
                [402, 322, 'gold.jpg', 1],
                [400, 322, 'gold.jpg', 1],
            ],
            x:401, y:315, z:52.2,
            texture_h: 1,texture_w: 1,
            texture_x0: 0,texture_y0: 0,
        },
        {
            name:'key3',
            group: 'key',
            z0:50, z1:46,
            ceil_color:'gold.jpg', ceil_scale:1, ceil_light:1,
            floor_color:'gold.jpg',floor_scale:1, floor_light:1,
            points:[
                [400, 325, 'gold.jpg', 1],
                [402, 325, 'gold.jpg', 1],
                [402, 330, 'gold.jpg', 1],
                [400, 330, 'gold.jpg', 1],
            ],
            x:401, y:315, z:52.2,
            texture_h: 1,texture_w: 1,
            texture_x0: 0,texture_y0: 0,
        },
        {
            name:'key4',
            group: 'key',
            z0:57, z1:48,
            ceil_color:'gold.jpg', ceil_scale:1, ceil_light:1,
            floor_color:'gold.jpg',floor_scale:1, floor_light:1,
            points:[
                [400, 300, 'gold.jpg', 1],
                [402, 300, 'gold.jpg', 1],
                [402, 310, 'gold.jpg', 1],
                [400, 310, 'gold.jpg', 1],
            ],
            x:401, y:315, z:52.2,
            texture_h: 1,texture_w: 1,
            texture_x0: 0,texture_y0: 0,
        },
    ]
}
}