multiplayer = true

function connect(){
    client = mqtt.connect('ws://mqtt.nodenvy.com')
    id = Math.random().toString(16).substr(2,8)
    pref = 'tracer/'+id
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
            sector = sectors.find(s=>s.name == 'tree')
            sector.x = json_data.data.posx
            sector.y = json_data.data.posy
            sector.z0 = json_data.data.height +10 + json_data.data.jump
            sector.z1 = json_data.data.jump
            
            lights[2].x = json_data.data.posx
            lights[2].y = json_data.data.posy
            lights[2].rot = json_data.data.rot
            lights[2].z0 = json_data.data.height+10+json_data.data.jump+40
            lights[2].z1 = json_data.data.jump-20
            lights[2].z = json_data.data.height+json_data.data.jump
        }
        else if(json_data.action == 'action'){
            console.log(topic, msg_id, id, json_data)
            sector = sectors.find(s=>s.name == json_data.data.name)
            if(sector && sector.action) window[sector.action](sector)
        }
        else if(json_data.action == 'hit'){
            console.log(topic, msg_id, id, json_data)
            sector = sectors.find(s=>s.name == json_data.data.name)
            if(sector && sector.hit) window[sector.hit](sector, json_data.id)
        }
        else if(json_data.action == 'sector'){
            console.log(topic, msg_id, id, json_data)
            sector = sectors.find(s=>s.name == json_data.data.name)
            sector.points = json_data.data.points
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