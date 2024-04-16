function processLight(){
    //reset light
    for(let[index, sector] of sectors.entries()){
        sector.lights = []
        sector.floor_lights = []
        for(let [i, point] of sector.points.entries()){
            point[3] = sector.original.points[i][3]
        }
        for(let light of lights){
            sector.floor_lights.push(light)
            sector.lights.push([])
        }
    }

    for(let [i_light, light] of lights.entries()){
        light_coll = []
        for(let ray of light.rays){ //hacer operaciones aquí no quita muchos frames
            rot_ray_cos = Math.cos((light.rot-ray.deg)*Math.PI/180)
            rot_ray_sin = Math.sin((light.rot-ray.deg)*Math.PI/180)
            ray.x0 = light.x
            ray.y0 = light.y
            ray.x1 = light.x+light.dist*rot_ray_cos
            ray.y1 = light.y-light.dist*rot_ray_sin
            ray.coll = []
            for(let[index, sector] of sectors.entries()){
                let points = sector.points
                for(let i=0 ; i<points.length ; i++){
                    j = (i+1)%points.length
                    let temp_int = findIntersectionAndAngle(ray.x0, ray.y0, ray.x1, ray.y1, points[i][0], points[i][1], points[j][0], points[j][1])
                    if(temp_int){
                        temp_dist = calcDistance(light.x, light.y, temp_int.intersectX, temp_int.intersectY)
                        face_dist = calcDistance(points[i][0], points[i][1], temp_int.intersectX, temp_int.intersectY)
                        //real_dist = Math.sqrt(temp_dist**2 + (player.jump-sector.z0)**2)
                        ray.coll.push({id:i, deg:ray.deg, int:temp_int, dist:temp_dist, sector:index, point:i, face_dist:face_dist})

                    }
                }
            }
            ray.coll.sort((a, b) => a.dist - b.dist)

            let sectors_buffer = []
            for(var coll of ray.coll){
                if(pointInSector(ray.x0, ray.y0, sectors[coll.sector])){
                    coll.out = true
                }
                else if(!sectors_buffer.includes(coll.sector)){
                    sectors_buffer.push(coll.sector)
                }else{
                    coll.out = true
                }
            }
            ray.coll = ray.coll.filter(x => !x.out)
        }

        for(let ray of light.rays){
            reducer = 0
            lastDist = coll && coll[0]? coll[0].dist : 0
            for(let [i, coll] of ray.coll.entries()){
                //let calc = sectors[coll.sector].points[coll.point][3] +
                //(coll.light.intensity*Math.pow((1-coll.dist/coll.light.dist), 1/5)*Math.sin(coll.int.angle*Math.PI/180))/i
                if(coll.dist > lastDist){
                    reducer += 1
                    lastDist = coll.dist
                }
                let calc = //sectors[coll.sector].original.points[coll.point][3] +
                ((light.intensity)*Math.pow((1-coll.dist/light.dist), coll.dist/light.dist)*Math.sin(coll.int.angle*Math.PI/180))/reducer //* ((20-Math.abs(coll.deg))/10)
                //((i+1)/2)
                //if(coll.deg < -20 || coll.deg > 20) calc = sectors[coll.sector].original.points[coll.point][3]

                //sectors[coll.sector].points[coll.point][3] = Math.min(calc, 1)
                sectors[coll.sector].lights[i_light].push({point:coll.point, face_dist:coll.face_dist, dist:coll.dist, intensity:Math.min(calc, 1), dist:coll.dist})
            }
            //sectors[coll.sector].points[coll.point][3] = coll.light.intensity*(1-coll.dist/coll.light.dist)
        }
    }

    for(let sector of sectors){
        for(let light of sector.lights){
            light.sort((a, b) => a.face_dist - b.face_dist)
        }
    }

    postMessage({sectors: sectors})
}

function findIntersectionAndAngle(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

    // Asegurarse de que las líneas no son paralelas
    if (denominator === 0) return null;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

    // Si t y u están entre 0 y 1, las líneas se intersectan en este segmento
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        const intersectX = x1 + t * (x2 - x1);
        const intersectY = y1 + t * (y2 - y1);

        // Calcular el ángulo de intersección
        // Vectores de las direcciones de las líneas
        const v1x = x2 - x1;
        const v1y = y2 - y1;
        const v2x = x4 - x3;
        const v2y = y4 - y3;

        // Producto punto y magnitudes de los vectores
        const dotProduct = v1x * v2x + v1y * v2y;
        const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
        const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);

        // Ángulo entre los vectores
        const angle = Math.floor( Math.acos(dotProduct / (mag1 * mag2)) * (180 / Math.PI) ) // Convertir a grados

        return { intersectX, intersectY, angle };
    }

    // Si t o u no están en el rango de 0 a 1, entonces no hay una intersección en los segmentos de línea dados
    return null;
}

function calcDistance(x1, y1, x2, y2) {
    return Math.floor(Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)))
}

function pointInSector(posx, posy, sector) {
    let inside = false;
    let vertices = sector.points
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        let [xi, yi] = vertices[i]
        let [xj, yj] = vertices[j]

        let inters = ((yi > posy) != (yj > posy)) && (posx < (xj - xi) * (posy - yi) / (yj - yi) + xi)
        
        if (inters) inside = !inside
    }

    return inside
}

onmessage = function (e) {
    if(e.data.type == 'init'){
        sectors = e.data.sectors
        lights = e.data.lights
    }else if(e.data.type == 'calc'){
        sectors = e.data.sectors
        lights = e.data.lights
        processLight()
    }   
}