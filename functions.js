function door(sector){
    console.log('door', sector.status)
    if(sector.status == 'closed'){
        sector.status = 'open'
        if(!sector.r0) sector.r0 = 0
        sector.r1 = sector.params.a
        sector.animate = 'animateDoor'
    }else{
        sector.status = 'closed'
        if(!sector.r0) sector.r0 = sector.params.a
        sector.r1 = 0
        sector.animate = 'animateDoor'
    }
}

function animateDoor(sector, elapsedTime){
    let v = 0.2
    if(sector.status == 'open'){
        if(sector.r0 < sector.r1){
            sector.r0 +=Math.floor(v*elapsedTime)
            if(sector.r0 >= sector.r1){
                sector.r0 = sector.r1
                sector.animate = null
            }
        }else{
            sector.r0 -=Math.floor(v*elapsedTime)
            if(sector.r0 <= sector.r1){
                sector.r0 = sector.r1
                sector.animate = null
            }
        }
    }else{
        if(sector.r0 < sector.r1){
            sector.r0 +=Math.floor(v*elapsedTime)
            if(sector.r0 >= sector.r1){
                sector.r0 = sector.r1
                sector.animate = null
            }
        }else{
            sector.r0 -=Math.floor(v*elapsedTime)
            if(sector.r0 <= sector.r1){
                sector.r0 = sector.r1
                sector.animate = null
            }
        }
    }
    for(let [i, p] of sector.original.points.entries()){
        sector.points[i][0] = (p[0] - sector.params.x)*Math.cos(sector.r0*Math.PI/180) - (p[1] - sector.params.y)*Math.sin(sector.r0*Math.PI/180) + sector.params.x
        sector.points[i][1] = (p[0] - sector.params.x)*Math.sin(sector.r0*Math.PI/180) + (p[1] - sector.params.y)*Math.cos(sector.r0*Math.PI/180) + sector.params.y
    }
}

function animateElevator(sector, elapsedTime){
    let v  = 0.2
    if(sector.status == 'up'){
        sector.z0 +=Math.floor(v*elapsedTime)
        sector.z1 +=Math.floor(v*elapsedTime)
        if(next_floor && next_floor.id == sector.id){
            new_jump +=Math.floor(v*elapsedTime)
            to_up = false
        }
    }else if(sector.status == 'down'){
        sector.z0 -=Math.floor(v*elapsedTime)
        sector.z1 -=Math.floor(v*elapsedTime)
        sector.z1 = Math.max(0, sector.z1)
        sector.z0 = Math.max(20, sector.z0)
        if(next_floor && next_floor.id == sector.id){
            new_jump -=Math.floor(v*elapsedTime)
            to_down = false
        }
    }else if(sector.status == 'left'){
        for(let [i, p] of sector.original.points.entries()){
            sector.points[i][1] +=Math.floor(v*elapsedTime)
            
        }
        if(next_floor && next_floor.id == sector.id && player.jump < next_floor.z0+10){
            new_posy +=Math.floor(v*elapsedTime)
        }
    }else if(sector.status == 'right'){
        for(let [i, p] of sector.original.points.entries()){
            sector.points[i][1] -=Math.floor(v*elapsedTime)
        }
        if(next_floor && next_floor.id == sector.id && player.jump < next_floor.z0+10){
            new_posy -=Math.floor(v*elapsedTime)
        }
    }
    if(sector.z0 > 200){
        sector.status = 'right'
        if(sector.points[0][1] < 450){
            sector.status = 'down'
        }
    }
    if(sector.z1 == 0){
        sector.status = 'left'
        if(sector.points[0][1] > 800){
            sync('', {action:'sector', sector:sector})
            sector.status = 'up'
        }
    }
}