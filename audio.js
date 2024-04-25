class Audio{
    constructor(){
        this.enabled = false
    }

    async init(){
        if(this.enabled) return
        this.audioContext = new AudioContext()
        this.listener = this.audioContext.listener
        this.listener.positionX.value = player.posx
        this.listener.positionY.value = player.jump
        this.listener.positionZ.value = player.posx
        this.enabled = true

        for(let sound of sounds){
            if(!sound.playing){
                sound.source = await audio.load(sound.src, sound.x, sound.y, sound.z, sound.dist, sound.loop, sound.ambience)
                sound.playing = true
            }
        }
    }

    async load(url, x, y, z, dist, loop, ambience, gain){
        if(!this.enabled) return
        const audioBuffer = await fetch(url)
            .then(res => res.arrayBuffer())
            .then(ArrayBuffer => this.audioContext.decodeAudioData(ArrayBuffer))
        let source = this.audioContext.createBufferSource()
        source.buffer = audioBuffer
        source.loop = loop?loop:false
        let gainNode = this.audioContext .createGain()
        gainNode.gain.value = gain?gain:0.5
        if(!ambience){
            let panner = new PannerNode(this.audioContext)
            panner.positionX.value = y?y:player.posy
            panner.positionY.value = z?z:player.jump
            panner.positionZ.value = x?x:player.posx
            //panner.panningModel = 'HRTF'
            panner.distanceModel = 'linear'
            panner.refDistance = 0
            panner.maxDistance = 1000
            panner.rolloffFactor = 1
            source.panner = panner
            source.connect(gainNode).connect(source.panner).connect(this.audioContext.destination)
        }else{
            source.connect(gainNode).connect(this.audioContext.destination)
        }
        
        source.start()
        return source
    }

    setPanner(sound, x, y, z){
        if(!sound.source) return
        sound.source.panner.setPosition(y, z, x)
    }

    setPlayer(player){
        if(!this.enabled) return
        this.listener.positionX.value = player.posy
        this.listener.positionY.value = player.jump
        this.listener.positionZ.value = player.posx
        this.listener.forwardX.value = Math.sin(player.rot*Math.PI/180)
        this.listener.forwardZ.value = -Math.cos(player.rot*Math.PI/180)
    }

}

sounds = [
    {id:'elevator', x:-800, y:600, z:0, dist:500, src:'sounds/machine2.mp3', playing:false, loop:true},
    {id:'ambience', x:-800, y:600, z:0, dist:500, src:'sounds/ambience.mp3', playing:false, loop:true, ambience:true},
]

audio = new Audio()