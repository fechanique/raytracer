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

function processMQTTMessage(topic, data){
    msg_id = topic.split('/')[1]
    data = JSON.parse(data)
    if(msg_id != id){
        if(data.action == 'player'){
            sector = sectors.find(s=>s.name == 'tree')
            sector.posx = data.player.posx
            sector.posy = data.player.posy
            sector.posz = data.player.jump
            sector.height = data.player.height
            
            lights[2].x = data.player.posx
            lights[2].y = data.player.posy
            lights[2].rot = data.player.rot
        }
        else if(data.action == 'action'){
            console.log(topic, msg_id, id, data)
            sector = sectors.find(s=>s.name == data.sector.name)
            if(sector && sector.action) window[sector.action](sector)
        }
        else if(data.action == 'sector'){
            console.log(topic, msg_id, id, data)
            sector = sectors.find(s=>s.name == data.sector.name)
            sector.points = data.sector.points
        }
    }
}

function sync(type, data){
    if(multiplayer) client.publish(pref+'/sync', JSON.stringify(data))
}