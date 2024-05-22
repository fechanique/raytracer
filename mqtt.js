multiplayer = true

function connect(){
    id = Math.random().toString(16).substr(2, 8)
    pref = 'tracer/'+id
    client = mqtt.connect('ws://mqtt.nodenvy.com', {will: {topic: pref+'/sync', payload: JSON.stringify({action:'disconnect'})}})
    client.on('connect', function(){
        console.log('-- mqtt connected --')
        client.subscribe('tracer/#')
    })
    client.on("message", function(topic, data){
        processMQTTMessage(topic, data)
    })
}

if(multiplayer) connect()

rec = 0
function processMQTTMessage(topic, data){
    //console.log('rec', rec++)
    msg_id = topic.split('/')[1]
    let json_data = JSON.parse(data)
    if(msg_id != id){
        if(json_data.action == 'player'){
            let sector = sectors.find(s=>s.id == msg_id)
            if(!sector){
                console.log('new player', msg_id)
                sector = JSON.parse(JSON.stringify(models['player'].sectors[0]))
                prepareSector(msg_id, sector)
                sectors.push(sector)
                players.push(json_data.data)
            }
            traslateSectorToCoords(sector, json_data.data.posx, json_data.data.posy, json_data.data.jump+30)
            
            lights[2].x = json_data.data.posx
            lights[2].y = json_data.data.posy
            lights[2].rot = json_data.data.rot
            lights[2].z0 = json_data.data.height+10+json_data.data.jump+40
            lights[2].z1 = json_data.data.jump-20
            lights[2].z = json_data.data.height+json_data.data.jump
        }
        else if(json_data.action == 'action'){
            console.log(topic, msg_id, id, json_data)
            let sector = sectors.find(s=>s.name == json_data.data.name)
            if(sector && sector.action) window[sector.action](sector)
        }
        else if(json_data.action == 'hit'){
            console.log(topic, msg_id, id, json_data)
            let sector = sectors.find(s=>s.name == json_data.data.name)
            if(sector && sector.hit) window[sector.hit](sector, json_data.id)
        }
        else if(json_data.action == 'sector'){
            console.log(topic, msg_id, id, json_data)
            let sector = sectors.find(s=>s.name == json_data.data.name)
            traslateSectorToCoords(sector, json_data.data.x, json_data.data.y, json_data.data.z)
        }
        else if(json_data.action == 'voice'){
            voice.speak(json_data.data)
        }
        else if(json_data.action == 'fn'){
            take(json_data.data)
        }
        else if(json_data.action == 'disconnect'){
            console.log('disconnect', msg_id)
            players.splice(players.findIndex(e=>e.id == msg_id), 1)
            sectors.splice(sectors.findIndex(e=>e.id == msg_id), 1)
        }
    }
}

sent = 0
player_cache = ''
function sync(data){
    let json_data = JSON.stringify(data)
    if(multiplayer){
        if(data.action == 'player'){
            if(player_cache != json_data){
                //console.log('sent', sent++)
                client.publish(pref+'/sync', json_data)
                //console.log('player', player_cache, json_data)
                player_cache = json_data
            }
        }else{
            client.publish(pref+'/sync', json_data)
        }
    }
}